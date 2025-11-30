import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from scripts/.env
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !GEMINI_API_KEY) {
  console.error('Missing required environment variables!');
  console.error('Please ensure VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_GEMINI_API_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Transaction {
  id: string;
  transaction_name: string;
  notes: string;
  merchant: string | null;
  category: string;
}

async function extractMerchants(transactions: Transaction[]): Promise<Map<string, string>> {
  console.log(`\nSending ${transactions.length} transactions to Gemini for merchant extraction...`);

  const prompt = `You are helping to extract merchant names from transaction data.

Below is a JSON array of transactions. For each transaction, analyze the transaction_name, notes, and category fields to identify the merchant or business name.

TRANSACTIONS:
${JSON.stringify(transactions.map(t => ({
  id: t.id,
  transaction_name: t.transaction_name,
  notes: t.notes,
  category: t.category
})), null, 2)}

TASK:
Extract the merchant/business name for each transaction. Look for:
- Brand names (e.g., "Grab", "Tokopedia", "Starbucks", "McDonald's")
- Business names in the transaction_name or notes
- Common merchants associated with the category

Return a JSON object mapping transaction IDs to merchant names:
{
  "transaction_id_1": "Merchant Name",
  "transaction_id_2": "Merchant Name",
  ...
}

If you cannot identify a merchant for a transaction, use null for that ID.
Only return the JSON object, no other text.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Gemini response');
    }

    const merchantMap = JSON.parse(jsonMatch[0]);
    return new Map(Object.entries(merchantMap));
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

async function updateMerchants(merchantMap: Map<string, string>): Promise<number> {
  let updatedCount = 0;

  console.log('\nUpdating transactions in database...');

  for (const [transactionId, merchantName] of merchantMap.entries()) {
    if (merchantName && merchantName !== 'null') {
      const { error } = await supabase
        .from('transactions')
        .update({ merchant: merchantName })
        .eq('id', transactionId);

      if (error) {
        console.error(`Error updating transaction ${transactionId}:`, error);
      } else {
        updatedCount++;
        console.log(`✓ Updated transaction ${transactionId}: ${merchantName}`);
      }
    }
  }

  return updatedCount;
}

async function main() {
  console.log('=== Merchant Migration Script ===\n');

  // Fetch all transactions without merchant
  console.log('Fetching transactions without merchant data...');
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, transaction_name, notes, merchant, category')
    .is('merchant', null);

  if (error) {
    console.error('Error fetching transactions:', error);
    process.exit(1);
  }

  if (!transactions || transactions.length === 0) {
    console.log('No transactions found without merchant data.');
    process.exit(0);
  }

  console.log(`Found ${transactions.length} transactions without merchant data.`);

  // Process in batches of 50 to avoid token limits
  const BATCH_SIZE = 50;
  let totalUpdated = 0;

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} transactions)...`);

    try {
      const merchantMap = await extractMerchants(batch);
      const updatedCount = await updateMerchants(merchantMap);
      totalUpdated += updatedCount;

      // Wait a bit between batches to avoid rate limits
      if (i + BATCH_SIZE < transactions.length) {
        console.log('\nWaiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Error processing batch:`, error);
      console.log('Continuing with next batch...');
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Total transactions processed: ${transactions.length}`);
  console.log(`Total merchants updated: ${totalUpdated}`);
}

main().catch(console.error);
