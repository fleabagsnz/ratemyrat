-- Add entitlements column to profiles for RevenueCat unlocks (blood_red, etc.)
-- Run this in Supabase SQL editor or via `supabase db execute`.

-- 1) Add the column if it's missing
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS entitlements jsonb DEFAULT '{}'::jsonb NOT NULL;

-- 2) Backfill any existing NULLs (defensive)
UPDATE profiles
SET entitlements = '{}'::jsonb
WHERE entitlements IS NULL;

-- 3) (Optional) Inspect a sample row
-- SELECT id, entitlements FROM profiles LIMIT 10;

-- The app reads/writes entitlements.blood_red to unlock the Blood Red color.
