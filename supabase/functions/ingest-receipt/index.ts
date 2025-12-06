import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
  const authHeader = req.headers.get('Authorization');
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    authHeader ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

    const body = await req.json();
    let receipts = [];

    // Support both single object and array input
    if (Array.isArray(body)) {
      receipts = body;
    } else if (body.receipts && Array.isArray(body.receipts)) {
      receipts = body.receipts;
    } else {
      receipts = [body];
    }

    const results = {
      total: receipts.length,
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [] as any[]
    };

    const { data: { user } } = await supabaseClient.auth.getUser();
    const userId = user?.id; // Might be null if using service role

    const processedIds = new Set();

    for (const receipt of receipts) {
      // If no authenticated user, require user_id in receipt object
      const effectiveUserId = userId || receipt.user_id;

      if (!effectiveUserId) {
         results.failed++;
         results.errors.push({ external_id: receipt.external_id, error: 'Missing user_id' });
         continue;
      }

      const { date, amount, merchant, items, external_id, currency, notes, category } = receipt;

      if (!date || !amount || !external_id) {
        results.failed++;
        results.errors.push({ external_id, error: 'Missing required fields' });
        continue;
      }

      if (processedIds.has(external_id)) {
          results.duplicates++;
          continue;
      }
      processedIds.add(external_id);

      // 1. Idempotency Check
      const { data: existing } = await supabaseClient
        .from('transactions')
        .select('id')
        .eq('external_id', external_id)
        .single();

      if (existing) {
        results.duplicates++;
        continue;
      }

      // 2. Reconciliation Logic
      const d = new Date(date);
      const minDate = new Date(d); minDate.setDate(d.getDate() - 3);
      const maxDate = new Date(d); maxDate.setDate(d.getDate() + 3);

      const { data: matches } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('source', 'statement')
        .eq('amount', amount)
        .gte('date', minDate.toISOString())
        .lte('date', maxDate.toISOString())
        .is('match_id', null);

      let matchId = null;
      let status = 'pending';

      if (matches && matches.length > 0) {
        const match = matches[0];
        matchId = match.id;
        status = 'duplicate';

        if (!match.merchant && merchant) {
          await supabaseClient.from('transactions').update({ merchant }).eq('id', match.id);
        }
      }

      // 3. Insert Receipt
      const { error } = await supabaseClient
        .from('transactions')
        .insert({
          date,
          amount,
          currency: currency || 'IDR',
          merchant,
          transaction_name: merchant || 'Receipt',
          category: category || 'Uncategorized',
          type: 'expense',
          source: 'receipt',
          external_id,
          match_id: matchId,
          status,
          user_id: effectiveUserId,
          notes: items ? `Items: ${JSON.stringify(items)}\n${notes || ''}` : notes
        });

      if (error) {
        results.failed++;
        results.errors.push({ external_id, error: error.message });
      } else {
        results.success++;
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
