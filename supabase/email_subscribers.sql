-- ============================================
-- Email Subscribers Table
-- ============================================
-- Run this in Supabase SQL Editor after schema.sql

-- Create email subscribers table
CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'landing',
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_source ON email_subscribers(source);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_subscribed ON email_subscribers(subscribed_at DESC);

-- Enable RLS
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to subscribe (insert)
CREATE POLICY "Anyone can subscribe" ON email_subscribers
  FOR INSERT WITH CHECK (true);

-- Only service role can read/update/delete
CREATE POLICY "Service role can manage subscribers" ON email_subscribers
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- Referrals Table
-- ============================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referred_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'subscribed', 'rewarded')),
  bonus_generations INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_email ON referrals(referred_email);

-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id);

-- Users can create referrals
CREATE POLICY "Users can create referrals" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- Service role can manage all
CREATE POLICY "Service role can manage referrals" ON referrals
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- Function to generate referral code
-- ============================================

CREATE OR REPLACE FUNCTION generate_referral_code(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  -- Generate a short unique code
  code := UPPER(SUBSTRING(MD5(user_id::TEXT || NOW()::TEXT) FROM 1 FOR 8));
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function to process referral signup
-- ============================================

CREATE OR REPLACE FUNCTION process_referral_signup(
  ref_code TEXT,
  new_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  referrer_id UUID;
  bonus_gens INTEGER := 5; -- Bonus generations for successful referral
BEGIN
  -- Find the referral
  SELECT r.referrer_id INTO referrer_id
  FROM referrals r
  WHERE r.referral_code = ref_code AND r.status = 'pending';

  IF referrer_id IS NOT NULL THEN
    -- Update referral status
    UPDATE referrals
    SET
      status = 'signed_up',
      referred_user_id = new_user_id,
      converted_at = NOW()
    WHERE referral_code = ref_code;

    -- Award bonus generations to referrer
    UPDATE user_profiles
    SET generations_limit = generations_limit + bonus_gens
    WHERE id = referrer_id;

    -- Update bonus tracking
    UPDATE referrals
    SET bonus_generations = bonus_gens, status = 'rewarded'
    WHERE referral_code = ref_code;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
