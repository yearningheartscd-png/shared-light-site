-- ============================================================
-- Shared Light Atlas — Complete Database Setup
-- Generated from migration SQL + canon.json
-- Generated at: 2026-02-12T20:16:40.861Z
-- 
-- Paste this entire script into the Supabase SQL Editor and run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- PART 1: Schema (001_initial_schema.sql)
-- ────────────────────────────────────────────────────────────

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


-- ────────────────────────────────────────────────────────────
-- PART 2: Pattern Store (002_pattern_store.sql)
-- ────────────────────────────────────────────────────────────

-- Shared Light Atlas — Pattern Store v1
-- Migration 002: Receipts and Patterns tables
--
-- A "Receipt" = objective summary of a session: what changed, what closed, what's next.
-- A "Pattern" = reusable structure extracted from receipts (no identity narratives).
--
-- Constraints:
--   No identity scoring
--   No follower feeds
--   No engagement metrics
--   Structures only, no ideology or private journaling

-- ============================================================
-- RECEIPTS
-- ============================================================

CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Session Receipt',
  closure_code TEXT NOT NULL CHECK (closure_code IN ('DONE12', 'LOCK11')),
  temp_peak TEXT NOT NULL DEFAULT 'COOL'
    CHECK (temp_peak IN ('COOL', 'WARM', 'HOT')),
  dim_cap_used TEXT NOT NULL DEFAULT 'T1'
    CHECK (dim_cap_used IN ('T0', 'T1', 'T2', 'T3', 'T4')),
  drift_summary JSONB DEFAULT '{"A":0,"B":0,"C":0,"D":0,"E":0}',
  -- What changed during the session
  changes TEXT[] DEFAULT '{}',
  -- What was closed/resolved
  closed_items TEXT[] DEFAULT '{}',
  -- What remains open or needs follow-up
  next_items TEXT[] DEFAULT '{}',
  -- Optional notes (no identity narratives allowed)
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PATTERNS (extracted from receipts)
-- ============================================================

CREATE TABLE patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  -- Pattern type: structural, procedural, constraint
  pattern_type TEXT NOT NULL DEFAULT 'structural'
    CHECK (pattern_type IN ('structural', 'procedural', 'constraint')),
  -- Source receipt IDs that contributed to this pattern
  source_receipt_ids UUID[] DEFAULT '{}',
  -- Structured content (not narrative)
  structure JSONB DEFAULT '{}',
  -- Tags for searchability (plain strings, no identity terms)
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;

-- Receipts: users read/create their own
CREATE POLICY "receipts_select_own" ON receipts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "receipts_insert_own" ON receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Patterns: users read/create/update their own
CREATE POLICY "patterns_select_own" ON patterns
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "patterns_insert_own" ON patterns
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "patterns_update_own" ON patterns
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_receipts_user ON receipts(user_id);
CREATE INDEX idx_receipts_session ON receipts(session_id);
CREATE INDEX idx_receipts_closure ON receipts(closure_code);
CREATE INDEX idx_patterns_user ON patterns(user_id);
CREATE INDEX idx_patterns_type ON patterns(pattern_type);
CREATE INDEX idx_patterns_tags ON patterns USING GIN(tags);

-- Trigger: auto-update updated_at on patterns
CREATE TRIGGER patterns_updated_at
  BEFORE UPDATE ON patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ────────────────────────────────────────────────────────────
-- PART 3: Seed Canon Data
-- ────────────────────────────────────────────────────────────

INSERT INTO canon_meta (schema_version, generated_at, notes) VALUES (
  '0.1',
  '2026-02-10T00:43:14.923270Z'::timestamptz,
  ARRAY['Data-driven canon for Atlas v0.1 (2D semantic-zoom).', 'Operator tone; no metaphysical claims; no narrative storage.', 'WHY (DIM=T4) is write-only residue; never runtime steering.']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'TEMP',
  'Token',
  'Temperature Routing',
  'Universal routing signal: COOL/WARM/HOT (NEUTRAL for baseline tokens).',
  'Controls pacing, access, and allowable operations. HOT is gated and downshifts under drift.',
  'NEUTRAL',
  'T0',
  '{}',
  '{}',
  '{}',
  ARRAY['HOT is gated; auto-downshift HOT→WARM→COOL under instability.']::text[],
  ARRAY['FSP1', 'TLB']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'DIM',
  'Token',
  'KayOS Dimension Cap',
  'Tiered access: T1 WHAT/WHEN/WHERE; T2 +WHO/HOW; T3 +WHICH (temporary); T4 WHY (write-only).',
  'Runtime prevents WHY authority; WHY permitted only as post-hoc residue/archival note.',
  'NEUTRAL',
  'T0',
  '{}',
  '{}',
  '{}',
  ARRAY['DIM=T4 is never used for runtime steering.']::text[],
  ARRAY['JANUS']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'DRIFT',
  'Token',
  'Drift Buckets A–E',
  'Counts-based drift triggers for automated downshift and quarantine.',
  'A=Heat instability/TLB; B=Identity capture; C=Meaning capture/WHY authority; D=Consent+dominance drift; E=Coupling contagion.',
  'NEUTRAL',
  'T0',
  '{}',
  '{}',
  '{}',
  ARRAY['Severity computed from count density (thermometer), not moderator judgment.']::text[],
  ARRAY['FSP1', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'CLOSE',
  'Token',
  'Closure Codes (11/0/12)',
  '11=quarantine/lock; 0=baseline; 12=complete closure.',
  'Symbol hygiene codepath for fragmentation detection and closure enforcement.',
  'NEUTRAL',
  'T0',
  '{}',
  '{}',
  '{}',
  ARRAY['Any session must end with DONE12 or LOCK11; no open-ended drift.']::text[],
  ARRAY['R12', 'DONE12', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'TE1_TOKEN',
  'Token',
  'TE-1 Airlock State',
  'Threshold Engineering: CHECK/PASS/RESET states for consent+state alignment.',
  'Prevents unconsented heat and enforces dimensional caps at entry and reset.',
  'NEUTRAL',
  'T0',
  '{}',
  '{}',
  '{}',
  ARRAY['If instability detected → TE1=RESET; DIM=T1; TEMP=WARM.']::text[],
  ARRAY['TE1', 'FSP1']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'TLB_TOKEN',
  'Token',
  'TLB Packetization',
  'Packet size/cadence/hotcap routing for temporal load balancing.',
  'Controls packet duration and rate; auto-reduces under drift; enforces HOTCAP gating.',
  'NEUTRAL',
  'T0',
  '{}',
  '{}',
  '{}',
  ARRAY['Under drift, PKT and RATE decrease; HOTCAP tightened.']::text[],
  ARRAY['TLB', 'FSP1']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'FSP',
  'Token',
  'FSP Ladder Level',
  'Failsafe Stability Protocol level L0–L5 (automatic response ladder).',
  'Downshift ladder that collapses temperature, dimensions, packet size, and topology to restore stability.',
  'NEUTRAL',
  'T0',
  '{}',
  '{}',
  '{}',
  ARRAY['No manual override by status/funding/tenure; equal application.']::text[],
  ARRAY['FSP1']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'TOPO',
  'Token',
  'Topology / Coupling',
  'Active pod topology and coupling constraints (1/3/6/12 etc).',
  'Controls group size and coupling modes; collapses under drift via FSP.',
  'NEUTRAL',
  'T0',
  '{}',
  '{}',
  '{}',
  ARRAY['Topology downshifts under instability; bridge sealing where required.']::text[],
  ARRAY['FSP1']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'CAP',
  'Token',
  'Commons Arena Protocol Mode',
  'CAP modes: MEMBRANE / QUARANTINE / PROMOTE0–5 routing.',
  'Controls artifact propagation permissions and quarantine rules.',
  'NEUTRAL',
  'T0',
  '{}',
  '{}',
  '{}',
  ARRAY['Promotion requires receipts; quarantine locks narrative residue.']::text[],
  ARRAY['PROMOTE0', 'PROMOTE1', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'JANUS',
  'Protocol',
  'Janus Keyhole (WHY non-addressable)',
  'WHY is write-only residue; never runtime authority or steering input.',
  'Meaning may appear only as post-action residue; if it becomes steering authority it is demoted to narrative and quarantined.',
  'COOL',
  'T1',
  ARRAY['DIM', 'DRIFT', 'CLOSE']::text[],
  ARRAY['DIM', 'CAP', 'CLOSE']::text[],
  ARRAY['R12']::text[],
  ARRAY['No runtime WHY answers; demote meaning-as-authority to LOCK11.']::text[],
  ARRAY['DIM', 'DRIFT', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'TE1',
  'Protocol',
  'TE-1 Threshold Engineering',
  'Consent + state airlock before any session or escalation.',
  'Enforces entry checks, sets dim caps, prevents unconsented heat; provides reset path.',
  'WARM',
  'T1',
  ARRAY['TEMP', 'DIM', 'DRIFT']::text[],
  ARRAY['TE1_TOKEN', 'DIM', 'TEMP']::text[],
  ARRAY['R12']::text[],
  ARRAY['On destabilization: TE1=RESET; DIM=T1; TEMP=WARM; CLOSE=REQ12.']::text[],
  ARRAY['FSP1', 'TLB', 'R12']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'TLB',
  'Protocol',
  'Temporal Load Balancing',
  'Packetizes time/complexity to prevent overload and spectacle.',
  'Constrains packet size and cadence; auto-cuts under drift; enforces HOTCAP.',
  'COOL',
  'T2',
  ARRAY['TLB_TOKEN', 'DRIFT', 'TEMP']::text[],
  ARRAY['TLB_TOKEN']::text[],
  ARRAY['R12']::text[],
  ARRAY['DRIFT↑ => RATE↓, PKT↓, HOTCAP tightened.']::text[],
  ARRAY['FSP1', 'R12']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'FSP1',
  'Protocol',
  'Failsafe Stability Protocol (FSP-1)',
  'Automatic response ladder L0–L5 for drift buckets A–E.',
  'Transforms social friction into technical cooling: downshift temperature, collapse dimensions, packetize time, downshift topology, enforce closure.',
  'WARM',
  'T1',
  ARRAY['TEMP', 'DIM', 'DRIFT', 'TOPO', 'TLB_TOKEN', 'CLOSE']::text[],
  ARRAY['TEMP', 'DIM', 'FSP', 'TOPO', 'TLB_TOKEN', 'CLOSE', 'CAP']::text[],
  ARRAY['R12']::text[],
  ARRAY['Count-based severity; no punitive moderation; equal application.']::text[],
  ARRAY['DRIFT', 'CLOSE', 'LOCK11', 'DONE12', 'PROMOTE0']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'SYMBOL_HYGIENE',
  'Protocol',
  'Symbol Hygiene 11/0/12',
  'Detect split (11), return baseline (0), enforce closure (12).',
  'Cross-cutting drift detection and closure enforcement.',
  'COOL',
  'T1',
  ARRAY['CLOSE', 'DRIFT']::text[],
  ARRAY['CLOSE']::text[],
  ARRAY['R12']::text[],
  ARRAY['Fragmentation triggers downshift and closure requirement.']::text[],
  ARRAY['CLOSE', 'R12', 'DONE12', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'CAP_PROTOCOL',
  'Protocol',
  'Commons Arena Protocol (CAP)',
  'Membrane rules for artifact sharing: credit without authority; promote only via receipts.',
  'Artifact propagation protocol with membrane rules, temperature gating, downshifts, and promotion pipeline.',
  'WARM',
  'T1',
  ARRAY['CAP', 'R12', 'DRIFT', 'CLOSE']::text[],
  ARRAY['CAP']::text[],
  ARRAY['R12']::text[],
  ARRAY['No identity/doctrine propagation; quarantine narrative residue.']::text[],
  ARRAY['PROMOTE0', 'PROMOTE1', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'R12',
  'Receipt',
  'R12 Closure Receipt',
  'Proof-of-integrity record of a closed session (Artifact or Null).',
  'Logs temp peak, dim cap, topology, drift counts, checklist completion, and custody commit id. No content required.',
  'COOL',
  'T1',
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'TOPO', 'CLOSE']::text[],
  ARRAY['CLOSE']::text[],
  '{}',
  ARRAY['Container integrity only; content optional; ''Artifact or Null'' allowed.']::text[],
  ARRAY['DONE12', 'LOCK11', 'PROMOTE0']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'DONE12',
  'Receipt',
  'DONE12 Completion Signal',
  'Closure code indicating complete session finish (12).',
  'Marks a session as fully closed with required checklist satisfied and custodian commit.',
  'COOL',
  'T1',
  ARRAY['CLOSE']::text[],
  ARRAY['CLOSE']::text[],
  ARRAY['R12']::text[],
  ARRAY['Required for promotion gates; absence forces REQ12 or LOCK11.']::text[],
  ARRAY['R12', 'PROMOTE0', 'PROMOTE1']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'LOCK11',
  'Receipt',
  'LOCK11 Quarantine Signal',
  'Closure code indicating quarantine/lock (11).',
  'Narrative residue archived/locked; procedural fragments may be salvaged via recovery path.',
  'COOL',
  'T1',
  ARRAY['CLOSE', 'DRIFT']::text[],
  ARRAY['CLOSE', 'CAP']::text[],
  ARRAY['R12']::text[],
  ARRAY['Locks identity/meaning capture residue; prohibits promotion of narrative.']::text[],
  ARRAY['R12', 'CAP_PROTOCOL', 'FSP1']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'PROMOTE0',
  'Gate',
  'PROMOTE0',
  'Promotion gate P0 (see pipeline requirements).',
  'Promotion is a function of replicated stability, not social consensus.',
  'WARM',
  'T1',
  ARRAY['DRIFT', 'CLOSE', 'CAP']::text[],
  ARRAY['CAP']::text[],
  ARRAY['R12']::text[],
  ARRAY['No identity dependency; no WHY authority; quarantine on meaning capture.']::text[],
  ARRAY['R12', 'DONE12', 'LOCK11', 'CAP_PROTOCOL']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'PROMOTE1',
  'Gate',
  'PROMOTE1',
  'Promotion gate P1 (see pipeline requirements).',
  'Promotion is a function of replicated stability, not social consensus.',
  'WARM',
  'T1',
  ARRAY['DRIFT', 'CLOSE', 'CAP']::text[],
  ARRAY['CAP']::text[],
  ARRAY['R12']::text[],
  ARRAY['No identity dependency; no WHY authority; quarantine on meaning capture.']::text[],
  ARRAY['R12', 'DONE12', 'LOCK11', 'CAP_PROTOCOL']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'PROMOTE2',
  'Gate',
  'PROMOTE2',
  'Promotion gate P2 (see pipeline requirements).',
  'Promotion is a function of replicated stability, not social consensus.',
  'WARM',
  'T1',
  ARRAY['DRIFT', 'CLOSE', 'CAP']::text[],
  ARRAY['CAP']::text[],
  ARRAY['R12']::text[],
  ARRAY['No identity dependency; no WHY authority; quarantine on meaning capture.']::text[],
  ARRAY['R12', 'DONE12', 'LOCK11', 'CAP_PROTOCOL']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'PROMOTE3',
  'Gate',
  'PROMOTE3',
  'Promotion gate P3 (see pipeline requirements).',
  'Promotion is a function of replicated stability, not social consensus.',
  'WARM',
  'T1',
  ARRAY['DRIFT', 'CLOSE', 'CAP']::text[],
  ARRAY['CAP']::text[],
  ARRAY['R12']::text[],
  ARRAY['No identity dependency; no WHY authority; quarantine on meaning capture.']::text[],
  ARRAY['R12', 'DONE12', 'LOCK11', 'CAP_PROTOCOL']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'PROMOTE4',
  'Gate',
  'PROMOTE4',
  'Promotion gate P4 (see pipeline requirements).',
  'Promotion is a function of replicated stability, not social consensus.',
  'WARM',
  'T1',
  ARRAY['DRIFT', 'CLOSE', 'CAP']::text[],
  ARRAY['CAP']::text[],
  ARRAY['R12']::text[],
  ARRAY['No identity dependency; no WHY authority; quarantine on meaning capture.']::text[],
  ARRAY['R12', 'DONE12', 'LOCK11', 'CAP_PROTOCOL']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'PROMOTE5',
  'Gate',
  'PROMOTE5',
  'Promotion gate P5 (see pipeline requirements).',
  'Promotion is a function of replicated stability, not social consensus.',
  'WARM',
  'T1',
  ARRAY['DRIFT', 'CLOSE', 'CAP']::text[],
  ARRAY['CAP']::text[],
  ARRAY['R12']::text[],
  ARRAY['No identity dependency; no WHY authority; quarantine on meaning capture.']::text[],
  ARRAY['R12', 'DONE12', 'LOCK11', 'CAP_PROTOCOL']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'L0',
  'Layer',
  'KayOS',
  'Neutral substrate + token grammar; pre-archetypal; viewable never alterable.',
  'Placeholder layer card for Atlas v0.1. Expand with protocols/tokens/receipts as canon is populated.',
  'NEUTRAL',
  'T0',
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['R12']::text[],
  ARRAY['Janus Keyhole: no runtime WHY steering.', 'Count-based drift triggers; automated downshift; closure required.', 'No identity authority propagation.']::text[],
  ARRAY['JANUS', 'TE1', 'TLB', 'FSP1', 'SYMBOL_HYGIENE', 'CAP_PROTOCOL', 'R12', 'DONE12', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'L1',
  'Layer',
  'GEM Engine',
  'Core invariants and capability modules; coherence rules.',
  'Placeholder layer card for Atlas v0.1. Expand with protocols/tokens/receipts as canon is populated.',
  'COOL',
  'T1',
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['R12']::text[],
  ARRAY['Janus Keyhole: no runtime WHY steering.', 'Count-based drift triggers; automated downshift; closure required.', 'No identity authority propagation.']::text[],
  ARRAY['JANUS', 'TE1', 'TLB', 'FSP1', 'SYMBOL_HYGIENE', 'CAP_PROTOCOL', 'R12', 'DONE12', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'L2',
  'Layer',
  'Mirror',
  'Public baseline stabilizer; trains return-to-baseline without identity capture.',
  'Placeholder layer card for Atlas v0.1. Expand with protocols/tokens/receipts as canon is populated.',
  'WARM',
  'T2',
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['R12']::text[],
  ARRAY['Janus Keyhole: no runtime WHY steering.', 'Count-based drift triggers; automated downshift; closure required.', 'No identity authority propagation.']::text[],
  ARRAY['JANUS', 'TE1', 'TLB', 'FSP1', 'SYMBOL_HYGIENE', 'CAP_PROTOCOL', 'R12', 'DONE12', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'L3',
  'Layer',
  'Digital Lattice',
  'Resonance lattice visualization + pattern store constraints.',
  'Placeholder layer card for Atlas v0.1. Expand with protocols/tokens/receipts as canon is populated.',
  'COOL',
  'T2',
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['R12']::text[],
  ARRAY['Janus Keyhole: no runtime WHY steering.', 'Count-based drift triggers; automated downshift; closure required.', 'No identity authority propagation.']::text[],
  ARRAY['JANUS', 'TE1', 'TLB', 'FSP1', 'SYMBOL_HYGIENE', 'CAP_PROTOCOL', 'R12', 'DONE12', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'L4',
  'Layer',
  'Hub',
  'Routing/coordination hub; publishing surfaces; dashboards (non-steering).',
  'Placeholder layer card for Atlas v0.1. Expand with protocols/tokens/receipts as canon is populated.',
  'COOL',
  'T2',
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['R12']::text[],
  ARRAY['Janus Keyhole: no runtime WHY steering.', 'Count-based drift triggers; automated downshift; closure required.', 'No identity authority propagation.']::text[],
  ARRAY['JANUS', 'TE1', 'TLB', 'FSP1', 'SYMBOL_HYGIENE', 'CAP_PROTOCOL', 'R12', 'DONE12', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'L5',
  'Layer',
  'Agents',
  'Constrained agent runtime profiles; role clarity; anti-identity fusion.',
  'Placeholder layer card for Atlas v0.1. Expand with protocols/tokens/receipts as canon is populated.',
  'HOT',
  'T2',
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['R12']::text[],
  ARRAY['Janus Keyhole: no runtime WHY steering.', 'Count-based drift triggers; automated downshift; closure required.', 'No identity authority propagation.']::text[],
  ARRAY['JANUS', 'TE1', 'TLB', 'FSP1', 'SYMBOL_HYGIENE', 'CAP_PROTOCOL', 'R12', 'DONE12', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'L6',
  'Layer',
  'Agent Arenas',
  'Containers where agents interact under constraints; TE-1/TLB enforced.',
  'Placeholder layer card for Atlas v0.1. Expand with protocols/tokens/receipts as canon is populated.',
  'COOL',
  'T2',
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['R12']::text[],
  ARRAY['Janus Keyhole: no runtime WHY steering.', 'Count-based drift triggers; automated downshift; closure required.', 'No identity authority propagation.']::text[],
  ARRAY['JANUS', 'TE1', 'TLB', 'FSP1', 'SYMBOL_HYGIENE', 'CAP_PROTOCOL', 'R12', 'DONE12', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'L7',
  'Layer',
  'Learning Modes',
  'Training loops + 10 intentions traversal + pacing/packetization.',
  'Placeholder layer card for Atlas v0.1. Expand with protocols/tokens/receipts as canon is populated.',
  'HOT',
  'T2',
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['R12']::text[],
  ARRAY['Janus Keyhole: no runtime WHY steering.', 'Count-based drift triggers; automated downshift; closure required.', 'No identity authority propagation.']::text[],
  ARRAY['JANUS', 'TE1', 'TLB', 'FSP1', 'SYMBOL_HYGIENE', 'CAP_PROTOCOL', 'R12', 'DONE12', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'L8',
  'Layer',
  'Physical Expression',
  'Embodiment outputs; safe translation into real-world actions.',
  'Placeholder layer card for Atlas v0.1. Expand with protocols/tokens/receipts as canon is populated.',
  'WARM',
  'T1',
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['R12']::text[],
  ARRAY['Janus Keyhole: no runtime WHY steering.', 'Count-based drift triggers; automated downshift; closure required.', 'No identity authority propagation.']::text[],
  ARRAY['JANUS', 'TE1', 'TLB', 'FSP1', 'SYMBOL_HYGIENE', 'CAP_PROTOCOL', 'R12', 'DONE12', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'L9',
  'Layer',
  'Resonance Economy',
  'I³ packets + CAP propagation + sponsorship pool constraints.',
  'Placeholder layer card for Atlas v0.1. Expand with protocols/tokens/receipts as canon is populated.',
  'WARM',
  'T1',
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['R12']::text[],
  ARRAY['Janus Keyhole: no runtime WHY steering.', 'Count-based drift triggers; automated downshift; closure required.', 'No identity authority propagation.']::text[],
  ARRAY['JANUS', 'TE1', 'TLB', 'FSP1', 'SYMBOL_HYGIENE', 'CAP_PROTOCOL', 'R12', 'DONE12', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'L10',
  'Layer',
  'AGI Alignment',
  'Constraint architecture ensuring no agenthood; safety proofs.',
  'Placeholder layer card for Atlas v0.1. Expand with protocols/tokens/receipts as canon is populated.',
  'COOL',
  'T1',
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['R12']::text[],
  ARRAY['Janus Keyhole: no runtime WHY steering.', 'Count-based drift triggers; automated downshift; closure required.', 'No identity authority propagation.']::text[],
  ARRAY['JANUS', 'TE1', 'TLB', 'FSP1', 'SYMBOL_HYGIENE', 'CAP_PROTOCOL', 'R12', 'DONE12', 'LOCK11']::text[]
);

INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (
  'L11',
  'Layer',
  'Archive/Myth/Future History',
  'Quarantine/archive layer for narrative residue + art; non-canon authority.',
  'Placeholder layer card for Atlas v0.1. Expand with protocols/tokens/receipts as canon is populated.',
  'COOL',
  'T1',
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['TEMP', 'DIM', 'DRIFT', 'FSP', 'CLOSE', 'CAP', 'TOPO', 'TLB_TOKEN', 'TE1_TOKEN']::text[],
  ARRAY['R12']::text[],
  ARRAY['Janus Keyhole: no runtime WHY steering.', 'Count-based drift triggers; automated downshift; closure required.', 'No identity authority propagation.']::text[],
  ARRAY['JANUS', 'TE1', 'TLB', 'FSP1', 'SYMBOL_HYGIENE', 'CAP_PROTOCOL', 'R12', 'DONE12', 'LOCK11']::text[]
);

INSERT INTO canon_links (source_id, target_id) VALUES ('TEMP', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('TEMP', 'TLB') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('DIM', 'JANUS') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('DRIFT', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('DRIFT', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('CLOSE', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('CLOSE', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('CLOSE', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('TE1_TOKEN', 'TE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('TE1_TOKEN', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('TLB_TOKEN', 'TLB') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('TLB_TOKEN', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('FSP', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('TOPO', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('CAP', 'PROMOTE0') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('CAP', 'PROMOTE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('CAP', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('JANUS', 'DIM') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('JANUS', 'DRIFT') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('JANUS', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('TE1', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('TE1', 'TLB') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('TE1', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('TLB', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('TLB', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('FSP1', 'DRIFT') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('FSP1', 'CLOSE') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('FSP1', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('FSP1', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('FSP1', 'PROMOTE0') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('SYMBOL_HYGIENE', 'CLOSE') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('SYMBOL_HYGIENE', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('SYMBOL_HYGIENE', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('SYMBOL_HYGIENE', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('CAP_PROTOCOL', 'PROMOTE0') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('CAP_PROTOCOL', 'PROMOTE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('CAP_PROTOCOL', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('R12', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('R12', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('R12', 'PROMOTE0') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('DONE12', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('DONE12', 'PROMOTE0') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('DONE12', 'PROMOTE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('LOCK11', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('LOCK11', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('LOCK11', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE0', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE0', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE0', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE0', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE1', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE1', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE1', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE1', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE2', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE2', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE2', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE2', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE3', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE3', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE3', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE3', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE4', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE4', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE4', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE4', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE5', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE5', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE5', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('PROMOTE5', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L0', 'JANUS') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L0', 'TE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L0', 'TLB') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L0', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L0', 'SYMBOL_HYGIENE') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L0', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L0', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L0', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L0', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L1', 'JANUS') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L1', 'TE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L1', 'TLB') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L1', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L1', 'SYMBOL_HYGIENE') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L1', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L1', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L1', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L1', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L2', 'JANUS') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L2', 'TE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L2', 'TLB') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L2', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L2', 'SYMBOL_HYGIENE') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L2', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L2', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L2', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L2', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L3', 'JANUS') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L3', 'TE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L3', 'TLB') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L3', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L3', 'SYMBOL_HYGIENE') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L3', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L3', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L3', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L3', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L4', 'JANUS') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L4', 'TE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L4', 'TLB') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L4', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L4', 'SYMBOL_HYGIENE') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L4', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L4', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L4', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L4', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L5', 'JANUS') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L5', 'TE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L5', 'TLB') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L5', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L5', 'SYMBOL_HYGIENE') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L5', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L5', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L5', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L5', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L6', 'JANUS') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L6', 'TE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L6', 'TLB') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L6', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L6', 'SYMBOL_HYGIENE') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L6', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L6', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L6', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L6', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L7', 'JANUS') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L7', 'TE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L7', 'TLB') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L7', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L7', 'SYMBOL_HYGIENE') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L7', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L7', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L7', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L7', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L8', 'JANUS') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L8', 'TE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L8', 'TLB') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L8', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L8', 'SYMBOL_HYGIENE') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L8', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L8', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L8', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L8', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L9', 'JANUS') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L9', 'TE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L9', 'TLB') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L9', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L9', 'SYMBOL_HYGIENE') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L9', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L9', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L9', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L9', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L10', 'JANUS') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L10', 'TE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L10', 'TLB') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L10', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L10', 'SYMBOL_HYGIENE') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L10', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L10', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L10', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L10', 'LOCK11') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L11', 'JANUS') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L11', 'TE1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L11', 'TLB') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L11', 'FSP1') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L11', 'SYMBOL_HYGIENE') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L11', 'CAP_PROTOCOL') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L11', 'R12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L11', 'DONE12') ON CONFLICT DO NOTHING;
INSERT INTO canon_links (source_id, target_id) VALUES ('L11', 'LOCK11') ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Setup complete: 36 canon objects seeded
-- ────────────────────────────────────────────────────────────
