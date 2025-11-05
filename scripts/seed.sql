-- Seed script for Rate My Rat testing
-- This creates demo data for development and testing

-- WARNING: This will insert test data. Use only in development!

-- Create test users (you'll need to create these via Supabase Auth UI first)
-- Then insert their profiles here

-- Example: Insert test profiles
-- Replace these UUIDs with real auth.users IDs from your Supabase Auth
/*
INSERT INTO profiles (id, username, is_admin, streak_current, streak_best, stats) VALUES
('00000000-0000-0000-0000-000000000001', 'testuser1', false, 5, 10, '{"rats_submitted": 15, "ratings_given": 45, "ratings_received": 32, "avg_rating_received": 2.3}'::jsonb),
('00000000-0000-0000-0000-000000000002', 'testuser2', true, 3, 7, '{"rats_submitted": 8, "ratings_given": 25, "ratings_received": 18, "avg_rating_received": 2.5}'::jsonb),
('00000000-0000-0000-0000-000000000003', 'testuser3', false, 1, 3, '{"rats_submitted": 5, "ratings_given": 15, "ratings_received": 12, "avg_rating_received": 2.1}'::jsonb)
ON CONFLICT (id) DO NOTHING;
*/

-- Generate sample rats
-- NOTE: You'll need to upload actual images to Supabase Storage first
-- This is a template showing the structure

DO $$
DECLARE
  test_user_id uuid := '00000000-0000-0000-0000-000000000001';
  rat_id uuid;
  i integer;
BEGIN
  -- Only run if test user exists
  IF EXISTS (SELECT 1 FROM profiles WHERE id = test_user_id) THEN

    -- Create 50 sample rats with different ratings
    FOR i IN 1..50 LOOP
      INSERT INTO rats (
        owner_id,
        title,
        image_url,
        thumb_url,
        day_key,
        moderation_state,
        ratings_count,
        ratings_sum,
        bayes_score,
        tool_data
      ) VALUES (
        test_user_id,
        CASE
          WHEN i % 3 = 0 THEN 'Test Rat ' || i
          ELSE NULL
        END,
        'https://via.placeholder.com/1024/000000/FFFFFF?text=Rat+' || i,
        'https://via.placeholder.com/512/000000/FFFFFF?text=Rat+' || i,
        CURRENT_DATE - (i || ' days')::interval,
        'approved',
        floor(random() * 50 + 5)::integer,  -- 5-55 ratings
        floor(random() * 150 + 15)::integer, -- sum proportional to count
        0  -- Will be calculated
      , '{"palette": ["black", "white", "brown"], "brushSize": 8}'::jsonb)
      RETURNING id INTO rat_id;

      -- Calculate proper bayes_score
      UPDATE rats
      SET bayes_score = (5 * 2.0 + ratings_sum) / (5.0 + ratings_count)
      WHERE id = rat_id;
    END LOOP;

    RAISE NOTICE 'Created 50 test rats';
  ELSE
    RAISE NOTICE 'Test user does not exist. Create auth user first.';
  END IF;
END $$;

-- To create ratings, you would need multiple test users
-- Example template:
/*
DO $$
DECLARE
  test_rater_id uuid := '00000000-0000-0000-0000-000000000002';
  rat_record RECORD;
BEGIN
  -- Rate 20 random rats
  FOR rat_record IN
    SELECT id FROM rats
    WHERE moderation_state = 'approved'
    ORDER BY RANDOM()
    LIMIT 20
  LOOP
    INSERT INTO ratings (rat_id, rater_id, score)
    VALUES (rat_record.id, test_rater_id, floor(random() * 3 + 1)::smallint)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Created sample ratings';
END $$;
*/

-- Instructions for full seed:
-- 1. Create 3+ test users via Supabase Auth dashboard
-- 2. Note their user IDs
-- 3. Update the UUIDs in the commented sections above
-- 4. Upload sample images to Supabase Storage rats bucket
-- 5. Update image URLs in the INSERT statements
-- 6. Run this script via Supabase SQL Editor
