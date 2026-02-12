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
