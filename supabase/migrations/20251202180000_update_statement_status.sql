-- Update status check constraint for statements table
ALTER TABLE statements DROP CONSTRAINT statements_status_check;
ALTER TABLE statements ADD CONSTRAINT statements_status_check 
    CHECK (status IN ('draft', 'processing', 'parsed', 'failed'));
