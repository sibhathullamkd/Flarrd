-- ============================================================
-- Flarrd — Database Setup SQL
-- Run this in Supabase → SQL Editor → New Query
-- ============================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  username TEXT UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  website TEXT,
  provider TEXT DEFAULT 'email',
  theme TEXT DEFAULT 'dark',
  profile_views INTEGER DEFAULT 0,
  clicks_today INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sign_in TIMESTAMPTZ
);

-- 2. LINKS TABLE
CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '🔗',
  category TEXT DEFAULT 'general',
  clicks INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES — PROFILES
CREATE POLICY "Users manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Public profiles viewable" ON profiles
  FOR SELECT USING (true);

-- 5. RLS POLICIES — LINKS
CREATE POLICY "Users manage own links" ON links
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public links viewable" ON links
  FOR SELECT USING (true);

CREATE POLICY "Admin delete any link" ON links
  FOR DELETE USING (true);
