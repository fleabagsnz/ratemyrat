/*
  # Rate My Rat - Complete Database Schema

  ## Overview
  This migration creates the complete database schema for Rate My Rat, a daily drawing app
  where users draw one rat per day and rate other users' rats on a 1-3 scale.

  ## New Tables

  ### profiles
  User profiles linked to Supabase Auth
  - `id` (uuid, primary key) - matches auth.users.id
  - `username` (text, unique, not null) - 3-20 chars, alphanumeric + underscore
  - `created_at` (timestamptz) - account creation time
  - `is_banned` (boolean) - admin ban flag
  - `is_admin` (boolean) - admin access flag
  - `push_opt_in` (boolean) - push notification preference, default true
  - `entitlements` (jsonb) - purchased entitlements like blood_red
  - `streak_current` (int) - current daily drawing streak
  - `streak_best` (int) - best streak ever achieved
  - `stats` (jsonb) - aggregated stats: rats_submitted, ratings_given, ratings_received, avg_rating_received

  ### rats
  User-submitted rat drawings
  - `id` (uuid, primary key)
  - `owner_id` (uuid, foreign key to profiles)
  - `title` (text, nullable) - optional title, max 40 chars
  - `image_url` (text, not null) - full size image URL in Supabase Storage
  - `thumb_url` (text, not null) - 512px thumbnail URL
  - `tool_data` (jsonb) - metadata about tools used: palette, brush sizes
  - `created_at` (timestamptz) - submission timestamp
  - `day_key` (date, not null) - UTC calendar date for daily limit enforcement
  - `moderation_state` (text) - 'approved', 'pending_review', or 'rejected'
  - `ratings_count` (int) - total number of ratings received
  - `ratings_sum` (int) - sum of all rating scores (1-3 each)
  - `bayes_score` (float) - Bayesian weighted average for ranking

  ### ratings
  User ratings of rats (1-3 scale)
  - `id` (uuid, primary key)
  - `rat_id` (uuid, foreign key to rats)
  - `rater_id` (uuid, foreign key to profiles)
  - `score` (smallint) - rating value: 1, 2, or 3
  - `created_at` (timestamptz)
  - Unique constraint: one rating per (rat_id, rater_id) pair

  ### emoji_reactions
  Emoji reactions to rats (only visible in fullscreen view)
  - `id` (uuid, primary key)
  - `rat_id` (uuid, foreign key to rats)
  - `reactor_id` (uuid, foreign key to profiles)
  - `emoji` (text) - single emoji from whitelist
  - `created_at` (timestamptz)

  ### reports
  User reports for moderation
  - `id` (uuid, primary key)
  - `rat_id` (uuid, foreign key to rats)
  - `reporter_id` (uuid, foreign key to profiles)
  - `reason` (text) - report explanation
  - `created_at` (timestamptz)
  - `status` (text) - 'open', 'actioned', or 'dismissed'

  ### badges
  Available badge definitions
  - `id` (uuid, primary key)
  - `key` (text, unique) - badge identifier: streak_3, top_rat_10, etc.
  - `name` (text) - display name
  - `description` (text) - badge criteria description
  - `icon` (text) - icon asset reference

  ### profile_badges
  Badges earned by users
  - `profile_id` (uuid, foreign key to profiles)
  - `badge_key` (text, foreign key to badges.key)
  - `earned_at` (timestamptz)
  - Unique constraint: one badge per (profile_id, badge_key) pair

  ### purchases
  In-app purchase records
  - `id` (uuid, primary key)
  - `profile_id` (uuid, foreign key to profiles)
  - `product_id` (text) - 'blood_red'
  - `platform` (text) - 'ios'
  - `transaction_ref` (text, unique) - RevenueCat transaction ID
  - `created_at` (timestamptz)
  - `verified` (boolean) - RevenueCat webhook verification status

  ### notifications
  In-app notification queue
  - `id` (uuid, primary key)
  - `profile_id` (uuid, foreign key to profiles)
  - `type` (text) - 'rating_received', 'badge_earned'
  - `data` (jsonb) - notification payload
  - `read` (boolean) - read status
  - `created_at` (timestamptz)

  ### analytics_events
  Lightweight analytics tracking
  - `id` (uuid, primary key)
  - `profile_id` (uuid, foreign key to profiles, nullable for anonymous)
  - `event_name` (text) - event type
  - `event_data` (jsonb) - event metadata
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can read their own profile and public fields of others
  - Only approved rats are visible to non-owners
  - Users cannot rate their own rats
  - Only admins can access admin functions
  - Banned users cannot post or rate

  ## Indexes
  - Optimized for Wall queries: bayes_score DESC, created_at DESC
  - Day key unique constraint for one rat per user per day
  - Foreign key indexes for joins
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL CHECK (length(username) >= 3 AND length(username) <= 20),
  created_at timestamptz DEFAULT now() NOT NULL,
  is_banned boolean DEFAULT false NOT NULL,
  is_admin boolean DEFAULT false NOT NULL,
  push_opt_in boolean DEFAULT true NOT NULL,
  entitlements jsonb DEFAULT '{}'::jsonb NOT NULL,
  streak_current int DEFAULT 0 NOT NULL,
  streak_best int DEFAULT 0 NOT NULL,
  stats jsonb DEFAULT '{"rats_submitted": 0, "ratings_given": 0, "ratings_received": 0, "avg_rating_received": 0}'::jsonb NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned);

-- rats table
CREATE TABLE IF NOT EXISTS rats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text CHECK (title IS NULL OR length(title) <= 40),
  image_url text NOT NULL,
  thumb_url text NOT NULL,
  tool_data jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  day_key date NOT NULL,
  moderation_state text DEFAULT 'approved' NOT NULL CHECK (moderation_state IN ('approved', 'pending_review', 'rejected')),
  ratings_count int DEFAULT 0 NOT NULL,
  ratings_sum int DEFAULT 0 NOT NULL,
  bayes_score float DEFAULT 0 NOT NULL
);

ALTER TABLE rats ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rats_owner_day ON rats(owner_id, day_key);
CREATE INDEX IF NOT EXISTS idx_rats_bayes_score ON rats(bayes_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rats_created_at ON rats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rats_day_key ON rats(day_key);
CREATE INDEX IF NOT EXISTS idx_rats_moderation_state ON rats(moderation_state);
CREATE INDEX IF NOT EXISTS idx_rats_owner_id ON rats(owner_id);

-- ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  rat_id uuid REFERENCES rats(id) ON DELETE CASCADE NOT NULL,
  rater_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  score smallint NOT NULL CHECK (score >= 1 AND score <= 3),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ratings_rat_rater ON ratings(rat_id, rater_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rater_id ON ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at DESC);

-- emoji_reactions table
CREATE TABLE IF NOT EXISTS emoji_reactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  rat_id uuid REFERENCES rats(id) ON DELETE CASCADE NOT NULL,
  reactor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji text NOT NULL CHECK (length(emoji) <= 10),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE emoji_reactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_emoji_reactions_rat_id ON emoji_reactions(rat_id);
CREATE INDEX IF NOT EXISTS idx_emoji_reactions_reactor_id ON emoji_reactions(reactor_id);

-- reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  rat_id uuid REFERENCES rats(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'actioned', 'dismissed'))
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reports_rat_id ON reports(rat_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- badges table
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- profile_badges table
CREATE TABLE IF NOT EXISTS profile_badges (
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_key text REFERENCES badges(key) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (profile_id, badge_key)
);

ALTER TABLE profile_badges ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_profile_badges_profile_id ON profile_badges(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_badges_earned_at ON profile_badges(earned_at DESC);

-- purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  product_id text NOT NULL,
  platform text NOT NULL,
  transaction_ref text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  verified boolean DEFAULT false NOT NULL
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_purchases_profile_id ON purchases(profile_id);
CREATE INDEX IF NOT EXISTS idx_purchases_transaction_ref ON purchases(transaction_ref);

-- notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('rating_received', 'badge_earned')),
  data jsonb DEFAULT '{}'::jsonb NOT NULL,
  read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON notifications(profile_id, read, created_at DESC);

-- analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);

-- RLS Policies

-- profiles policies
CREATE POLICY "Users can view all public profile fields"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile settings"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile on signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- rats policies
CREATE POLICY "Users can view approved rats"
  ON rats FOR SELECT
  TO authenticated
  USING (
    moderation_state = 'approved' 
    OR owner_id = auth.uid()
  );

CREATE POLICY "Users can insert own rats if not banned"
  ON rats FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_banned = true
    )
  );

CREATE POLICY "Admins can update rat moderation state"
  ON rats FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ratings policies
CREATE POLICY "Users can view all ratings"
  ON ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert ratings for others' rats"
  ON ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = rater_id
    AND NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_banned = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM rats 
      WHERE id = rat_id AND owner_id = auth.uid()
    )
  );

-- emoji_reactions policies
CREATE POLICY "Users can view emoji reactions"
  ON emoji_reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own emoji reactions"
  ON emoji_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reactor_id);

CREATE POLICY "Users can delete own emoji reactions"
  ON emoji_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = reactor_id);

-- reports policies
CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Users can insert reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can update report status"
  ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- badges policies
CREATE POLICY "Anyone can view badges"
  ON badges FOR SELECT
  TO authenticated
  USING (true);

-- profile_badges policies
CREATE POLICY "Users can view all earned badges"
  ON profile_badges FOR SELECT
  TO authenticated
  USING (true);

-- purchases policies
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

-- notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can update own notification read status"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- analytics_events policies
CREATE POLICY "Users can insert own analytics events"
  ON analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id OR profile_id IS NULL);

-- Seed initial badges
INSERT INTO badges (key, name, description, icon) VALUES
  ('streak_3', '3 Day Streak', 'Drew rats for 3 days in a row', 'flame'),
  ('streak_7', '7 Day Streak', 'Drew rats for 7 days in a row', 'flame'),
  ('streak_14', '14 Day Streak', 'Drew rats for 14 days in a row', 'flame'),
  ('streak_30', '30 Day Streak', 'Drew rats for 30 days in a row', 'flame'),
  ('streak_50', '50 Day Streak', 'Drew rats for 50 days in a row', 'flame'),
  ('streak_100', '100 Day Streak', 'Drew rats for 100 days in a row', 'flame'),
  ('rater_10', 'Rated 10', 'Rated 10 rats', 'star'),
  ('rater_50', 'Rated 50', 'Rated 50 rats', 'star'),
  ('rater_100', 'Rated 100', 'Rated 100 rats', 'star'),
  ('rater_250', 'Rated 250', 'Rated 250 rats', 'star'),
  ('rater_500', 'Rated 500', 'Rated 500 rats', 'star'),
  ('top_rat_20', 'Top Rat (20+)', 'Rat reached avg ≥2.6 with 20+ ratings', 'trophy'),
  ('top_rat_50', 'Top Rat (50+)', 'Rat reached avg ≥2.6 with 50+ ratings', 'trophy'),
  ('top_rat_100', 'Top Rat (100+)', 'Rat reached avg ≥2.6 with 100+ ratings', 'trophy'),
  ('consecutive_top_3', '3 Consecutive Top Rats', '3 days with highly rated rats', 'trophy'),
  ('consecutive_top_7', '7 Consecutive Top Rats', '7 days with highly rated rats', 'trophy'),
  ('consecutive_top_14', '14 Consecutive Top Rats', '14 days with highly rated rats', 'trophy')
ON CONFLICT (key) DO NOTHING;
