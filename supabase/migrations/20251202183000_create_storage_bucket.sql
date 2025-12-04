-- Create statements bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('statements', 'statements', false)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to statements bucket (since no auth is implemented yet)
CREATE POLICY "Public Access"
ON storage.objects FOR ALL
TO public
USING ( bucket_id = 'statements' )
WITH CHECK ( bucket_id = 'statements' );
