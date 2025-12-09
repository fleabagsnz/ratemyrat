-- Allow admins to delete rats (needed for Evil tab admin delete button)
-- Run in Supabase SQL editor or via `supabase db execute`.

-- Policy: admins can delete any rat
CREATE POLICY "Admins can delete rats"
  ON rats FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin = true
    )
  );

-- Optional: verify the policy exists
-- SELECT * FROM pg_policies WHERE tablename = 'rats' AND policyname = 'Admins can delete rats';
