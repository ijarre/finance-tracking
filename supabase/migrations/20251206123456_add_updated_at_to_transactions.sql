-- Add updated_at column to transactions table
ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- Update existing records to have updated_at set to created_at or now
UPDATE transactions SET updated_at = created_at WHERE updated_at IS NULL;
