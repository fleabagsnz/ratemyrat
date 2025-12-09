-- Align the database with the app's flagged/moderation logic

-- Allow toggling moderator view in the app
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_evil boolean DEFAULT false;

-- Track flagged rows explicitly
ALTER TABLE rats
ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS flagged boolean DEFAULT false;

-- Permit the flagged state in the enum check
ALTER TABLE rats DROP CONSTRAINT IF EXISTS rats_moderation_state_check;
ALTER TABLE rats
ADD CONSTRAINT rats_moderation_state_check
CHECK (moderation_state IN ('approved', 'pending_review', 'rejected', 'flagged'));

-- Normalize existing data
UPDATE rats
SET is_flagged = true
WHERE moderation_state = 'flagged'
  AND COALESCE(is_flagged, false) = false;

UPDATE rats
SET flagged = true
WHERE moderation_state = 'flagged'
  AND COALESCE(flagged, false) = false;

UPDATE rats
SET moderation_state = 'flagged'
WHERE (COALESCE(is_flagged, false) = true OR COALESCE(flagged, false) = true)
  AND moderation_state <> 'flagged';

UPDATE rats
SET moderation_state = 'approved'
WHERE moderation_state IS NULL;

-- Replace the select policy so flagged rats can be read by moderators
DROP POLICY IF EXISTS "Users can view approved rats" ON rats;

CREATE POLICY "Users can view approved rats or own"
  ON rats FOR SELECT
  TO authenticated
  USING (
    moderation_state = 'approved'
    OR owner_id = auth.uid()
  );

CREATE POLICY "Evil users can view flagged rats"
  ON rats FOR SELECT
  TO authenticated
  USING (
    (moderation_state = 'flagged' OR COALESCE(is_flagged, false) OR COALESCE(flagged, false))
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.is_admin = true OR p.is_evil = true)
    )
  );

-- Let any authenticated user flip a rat into the flagged state
DROP POLICY IF EXISTS "Users can flag rats" ON rats;

CREATE POLICY "Users can flag rats"
  ON rats FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    moderation_state = 'flagged'
    AND (COALESCE(is_flagged, false) = true OR COALESCE(flagged, false) = true)
  );

-- rat_reports access: open to authenticated for insert/select; evil/admin can delete/clear
ALTER TABLE rat_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view rat reports" ON rat_reports;
DROP POLICY IF EXISTS "Users can insert rat reports" ON rat_reports;
DROP POLICY IF EXISTS "Moderators can manage rat reports" ON rat_reports;

CREATE POLICY "Users can view rat reports"
  ON rat_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert rat reports"
  ON rat_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Moderators can manage rat reports"
  ON rat_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND (p.is_admin = true OR p.is_evil = true)
    )
  );
