-- Shared Light Atlas — Initial Schema
-- Migration 001: Core tables for canon data, auth, sessions, drift, packets
-- Run via Supabase dashboard or CLI: supabase db push

-- ============================================================
-- CANON DATA (source of truth from canon.json)
-- ============================================================

CREATE TABLE canon_objects (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('Layer', 'Protocol', 'Token', 'Receipt', 'Gate', 'Artifact')),
  name TEXT NOT NULL,
  one_liner TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  temp_primary TEXT NOT NULL CHECK (temp_primary IN ('COOL', 'WARM', 'HOT', 'NEUTRAL')),
  dim_cap TEXT NOT NULL CHECK (dim_cap IN ('T0', 'T1', 'T2', 'T3', 'T4')),
  reads_tokens TEXT[] DEFAULT '{}',
  writes_tokens TEXT[] DEFAULT '{}',
  produces_receipts TEXT[] DEFAULT '{}',
  constraints TEXT[] DEFAULT '{}',
  links TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE canon_links (
  id SERIAL PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES canon_objects(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES canon_objects(id) ON DELETE CASCADE,
  UNIQUE(source_id, target_id)
);

CREATE TABLE canon_meta (
  id SERIAL PRIMARY KEY,
  schema_version TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  notes TEXT[] DEFAULT '{}',
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  access_role TEXT NOT NULL DEFAULT 'public'
    CHECK (access_role IN ('public', 'contributor', 'admin')),
  access_level INTEGER NOT NULL DEFAULT 0
    CHECK (access_level >= 0 AND access_level <= 11),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SESSIONS
-- ============================================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL DEFAULT 'browse',
  temp_peak TEXT DEFAULT 'COOL'
    CHECK (temp_peak IN ('COOL', 'WARM', 'HOT')),
  dim_cap_used TEXT DEFAULT 'T1'
    CHECK (dim_cap_used IN ('T0', 'T1', 'T2', 'T3', 'T4')),
  drift_counts JSONB DEFAULT '{"A":0,"B":0,"C":0,"D":0,"E":0}',
  closure_code TEXT CHECK (closure_code IS NULL OR closure_code IN ('DONE12', 'LOCK11')),
  receipt_id UUID,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- ============================================================
-- DRIFT EVENTS
-- ============================================================

CREATE TABLE drift_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  bucket TEXT NOT NULL CHECK (bucket IN ('A', 'B', 'C', 'D', 'E')),
  severity INTEGER NOT NULL DEFAULT 1 CHECK (severity >= 1 AND severity <= 5),
  auto_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- I3 PACKETS
-- ============================================================

CREATE TABLE i3_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  packet_type TEXT NOT NULL,
  temperature TEXT NOT NULL CHECK (temperature IN ('COOL', 'WARM', 'HOT')),
  content JSONB DEFAULT '{}',
  closure_status TEXT NOT NULL DEFAULT 'open'
    CHECK (closure_status IN ('open', 'closed', 'locked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE canon_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE canon_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE canon_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE i3_packets ENABLE ROW LEVEL SECURITY;

-- Canon data: public read
CREATE POLICY "canon_objects_public_read" ON canon_objects
  FOR SELECT USING (true);
CREATE POLICY "canon_links_public_read" ON canon_links
  FOR SELECT USING (true);
CREATE POLICY "canon_meta_public_read" ON canon_meta
  FOR SELECT USING (true);

-- User profiles: read/update own
CREATE POLICY "profiles_select_own" ON user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Sessions: CRUD own
CREATE POLICY "sessions_select_own" ON sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Drift events: read/create own
CREATE POLICY "drift_select_own" ON drift_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "drift_insert_own" ON drift_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- I3 packets: read/create own
CREATE POLICY "packets_select_own" ON i3_packets
  FOR SELECT USING (auth.uid() = sender_id);
CREATE POLICY "packets_insert_own" ON i3_packets
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, display_name, access_role, access_level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
    'public',
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at on profile changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_canon_objects_type ON canon_objects(type);
CREATE INDEX idx_canon_links_source ON canon_links(source_id);
CREATE INDEX idx_canon_links_target ON canon_links(target_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_closure ON sessions(closure_code);
CREATE INDEX idx_drift_session ON drift_events(session_id);
CREATE INDEX idx_drift_bucket ON drift_events(bucket);
CREATE INDEX idx_packets_session ON i3_packets(session_id);
CREATE INDEX idx_packets_closure ON i3_packets(closure_status);
