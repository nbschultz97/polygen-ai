-- ============================================
-- PolyGen AI - Supabase Database Schema
-- ============================================
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- User Profiles Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  generations_used INTEGER NOT NULL DEFAULT 0,
  generations_limit INTEGER NOT NULL DEFAULT 5,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON user_profiles(tier);

-- ============================================
-- Generation History Table
-- ============================================
CREATE TABLE IF NOT EXISTS generation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  gst_json JSONB,
  scad_code TEXT,
  validation_success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for user history lookup
CREATE INDEX IF NOT EXISTS idx_generation_history_user ON generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_created ON generation_history(created_at DESC);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_history ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Generation History: Users can only see their own generations
CREATE POLICY "Users can view own generations" ON generation_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations" ON generation_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Functions
-- ============================================

-- Function to increment generation count
CREATE OR REPLACE FUNCTION increment_generations(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles
  SET
    generations_used = generations_used + 1,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset generation counts (run monthly via cron)
CREATE OR REPLACE FUNCTION reset_monthly_generations()
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles
  SET
    generations_used = 0,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, tier, generations_limit)
  VALUES (NEW.id, NEW.email, 'free', 5);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Service Role Policies (for webhooks/API)
-- ============================================

-- Allow service role to update any user (for Stripe webhooks)
CREATE POLICY "Service role can update all profiles" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- Scheduled Jobs (Optional - requires pg_cron)
-- ============================================

-- To enable monthly reset, run this in Supabase:
-- SELECT cron.schedule(
--   'reset-monthly-generations',
--   '0 0 1 * *',  -- First day of each month at midnight
--   $$SELECT reset_monthly_generations()$$
-- ============================================
-- Library Defects Telemetry Table
-- ============================================
CREATE TABLE IF NOT EXISTS library_defects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  module_name TEXT NOT NULL,
  reasoning TEXT,
  scad_code TEXT,
  p_succ FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for library_defects: Users can insert, but only admins (service_role) can view all
ALTER TABLE library_defects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own defect reports" ON library_defects
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can view all defects" ON library_defects
  FOR SELECT USING (auth.role() = 'service_role');
