-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create statements table
CREATE TABLE statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    parsed_at TIMESTAMPTZ,
    bank_statement_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'parsed'))
);

-- Create transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID REFERENCES statements(id),
    date DATE,
    amount NUMERIC,
    currency TEXT,
    transaction_name TEXT,
    reference_id TEXT,
    category TEXT,
    type TEXT,
    source TEXT DEFAULT 'statement' CHECK (source IN ('statement', 'receipt')),
    external_id TEXT,
    fingerprint TEXT DEFAULT '',
    status TEXT DEFAULT 'verified' CHECK (status IN ('pending', 'verified', 'duplicate')),
    match_id UUID REFERENCES transactions(id),
    merchant TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique index for external_id
CREATE UNIQUE INDEX idx_transactions_external_id ON transactions(external_id) WHERE external_id IS NOT NULL;

-- Create enrichment_logs table
CREATE TABLE enrichment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID REFERENCES statements(id),
    enrichment_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);


