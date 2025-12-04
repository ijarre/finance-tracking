-- Secure storage bucket
-- Drop the public access policy if it exists (it was named "Public Access")
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Note: RLS is already enabled on storage.objects by default in Supabase
-- We cannot ALTER TABLE storage.objects as we don't own it

-- Policy: Users can upload files to their own statements
-- We check if the folder name (statement_id) belongs to the user
CREATE POLICY "Users can upload statement files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'statements' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM statements WHERE user_id = auth.uid()
  )
);

-- Policy: Users can view files of their own statements
CREATE POLICY "Users can view statement files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'statements' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM statements WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update files of their own statements
CREATE POLICY "Users can update statement files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'statements' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM statements WHERE user_id = auth.uid()
  )
);

-- Policy: Users can delete files of their own statements
CREATE POLICY "Users can delete statement files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'statements' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM statements WHERE user_id = auth.uid()
  )
);
