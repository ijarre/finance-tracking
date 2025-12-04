-- Add user_id to statements
ALTER TABLE statements ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;

-- Add user_id to transactions
ALTER TABLE transactions ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Add user_id to enrichment_logs
ALTER TABLE enrichment_logs ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE enrichment_logs ENABLE ROW LEVEL SECURITY;

-- Policies for statements
CREATE POLICY "Users can view their own statements" ON statements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own statements" ON statements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own statements" ON statements
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own statements" ON statements
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for transactions
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for enrichment_logs
CREATE POLICY "Users can view their own enrichment_logs" ON enrichment_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own enrichment_logs" ON enrichment_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrichment_logs" ON enrichment_logs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own enrichment_logs" ON enrichment_logs
    FOR DELETE USING (auth.uid() = user_id);
