import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXTRACTION_PROMPT = `Extract ALL transactions from the bank statement image. For each transaction, extract the following fields:

- date: Transaction date (YYYY-MM-DD format)
- amount: Transaction amount (numeric value only, without currency symbol)
- currency: Currency code (e.g., IDR, USD)
- merchant: Merchant or business name (e.g., "Grab", "Tokopedia", "Starbucks", etc.). Extract the actual merchant/vendor name if visible, otherwise use null
- transaction_name: Name/description of the transaction
- reference_id: Reference or transaction ID (null if not available)
- category: Transaction category (e.g., Food, Transport, Shopping, etc.)
- type: Transaction type - "expense" for debit transactions (contains 'DB' or represents money going out), "income" for credit transactions (contains 'CR' or represents money coming in), or "transfer" for internal transfers (e.g. credit card payments, moving money between own accounts)
- notes: Additional notes or details about the transaction

Return the result as a JSON array of transaction objects. Ensure all transactions are captured from the statement.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY is not set' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { statement_id } = await req.json();

    if (!statement_id) {
      throw new Error('statement_id is required');
    }

    const { data: { user } } = await supabase.auth.getUser();
    // If using service role, user might be null, so we might need to fetch user_id from statement or expect it in body.
    // But for now, let's assume this is called by a user.
    // If called by service role (no user), we need another way.
    // Let's fetch the statement first, it should have user_id now.


    // 1. Get statement details
    const { data: statement, error: statementError } = await supabase
      .from('statements')
      .select('*')
      .eq('id', statement_id)
      .single();

    if (statementError || !statement) {
      throw new Error('Statement not found');
    }

    if (!statement.bank_statement_url) {
      throw new Error('No bank statement file found');
    }

    // 2. Download file from Storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('statements')
      .download(statement.bank_statement_url);

    if (downloadError || !fileData) {
      throw new Error('Failed to download statement file');
    }

    // Convert Blob to Base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = fileData.type;

    // 3. Call Gemini API
    const parts: any[] = [
      { text: EXTRACTION_PROMPT },
      {
        inline_data: {
          mime_type: mimeType,
          data: base64Data,
        },
      },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts }],
        }),
      }
    );

    const data = await response.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log({responseText})
    if (!responseText) {
      throw new Error('No response from Gemini API');
    }

    // 4. Parse JSON response
    let parsedTransactions: any[] = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsedTransactions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (e) {
      throw new Error('Failed to parse transactions from Gemini response');
    }

    if (parsedTransactions.length === 0) {
      throw new Error('No transactions found in the statement');
    }

    // 5. Save transactions (using a simplified version of saveTransactions logic)
    // We need to generate fingerprints and check for duplicates.
    // Since we can't easily import the shared logic, we'll reimplement the critical parts here.
    
    // Helper to generate MD5 fingerprint (using Web Crypto API available in Deno)
    const generateFingerprint = async (t: any) => {
      const data = `${t.date}|${t.amount}|${t.transaction_name}`;
      const msgBuffer = new TextEncoder().encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const transactionsWithFingerprints = await Promise.all(parsedTransactions.map(async t => ({
      ...t,
      statement_id: statement_id,
      user_id: statement.user_id, // Use user_id from the statement
      source: 'statement',
      fingerprint: await generateFingerprint(t)
    })));

    // Check for duplicates
    const fingerprints = transactionsWithFingerprints.map(t => t.fingerprint);
    const { data: existing } = await supabase
      .from('transactions')
      .select('id, fingerprint')
      .in('fingerprint', fingerprints);

    const existingMap = new Map(existing?.map(e => [e.fingerprint, e.id]));
    
    const transactionsToInsert = transactionsWithFingerprints.map(t => {
      if (existingMap.has(t.fingerprint)) {
        return {
          ...t,
          status: 'duplicate',
          match_id: existingMap.get(t.fingerprint)
        };
      }
      return t;
    });

    if (transactionsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);
      
      if (insertError) throw insertError;
    }

    // 6. Update statement status
    await supabase
      .from('statements')
      .update({ 
        status: 'parsed', 
        parsed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', statement_id);

    return new Response(
      JSON.stringify({ success: true, count: transactionsToInsert.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Error processing statement:', error);
    
    // Update status to failed
    if (req.method !== 'OPTIONS') { // Avoid updating on preflight
        try {
            const { statement_id } = await req.json().catch(() => ({}));
            if (statement_id) {
                 await supabase
                .from('statements')
                .update({ status: 'failed', updated_at: new Date().toISOString() })
                .eq('id', statement_id);
            }
        } catch (e) {
            // Ignore error if we can't update status
        }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
