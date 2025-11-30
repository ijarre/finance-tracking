# Merchant Migration Script

This script extracts merchant names from existing transactions and populates the `merchant` field in the database.

## How it works

1. Fetches all transactions where `merchant` is `null`
2. Sends batches of 50 transactions to Gemini API
3. Gemini analyzes `transaction_name`, `notes`, and `category` to identify merchants
4. Updates the database with extracted merchant names

## Prerequisites

Make sure your `.env.local` file has:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

## Installation

```bash
cd scripts
npm install
```

## Usage

```bash
cd scripts
npm run migrate-merchants
```

## What to expect

The script will:

- Show progress for each batch
- Display which transactions are being updated
- Show a summary at the end

Example output:

```
=== Merchant Migration Script ===

Fetching transactions without merchant data...
Found 150 transactions without merchant data.

Processing batch 1 (50 transactions)...
Sending 50 transactions to Gemini for merchant extraction...

Updating transactions in database...
✓ Updated transaction abc123: Grab
✓ Updated transaction def456: Tokopedia
...

=== Migration Complete ===
Total transactions processed: 150
Total merchants updated: 142
```

## Notes

- Processes in batches of 50 to avoid API token limits
- Waits 2 seconds between batches to avoid rate limiting
- Safe to run multiple times (only updates null merchants)
- Uses Gemini 2.0 Flash Exp for fast processing
