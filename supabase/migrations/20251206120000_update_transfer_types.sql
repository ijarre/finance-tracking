-- Constraint did not exist in init schema, so we skip dropping it.
-- IF you had a constraint, you would drop it here.


-- Update existing 'transfer' transactions to 'external_transfer'
UPDATE transactions SET type = 'external_transfer' WHERE type = 'transfer';

-- Add new check constraint
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('expense', 'income', 'internal_transfer', 'external_transfer'));
