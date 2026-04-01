-- =============================================================================
-- AlumniConnect v6 — Group-Based Network + Robust Profile Schema
-- Run AFTER schema_changes_v5.sql
-- =============================================================================

-- ─── 1. Ensure connection_requests is the canonical table ─────────────────────
-- (v5 already handles the migration from `connections` to `connection_requests`)
-- Add any missing columns that v4 might have missed:

ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─── 2. Create a user_connections VIEW for spec compatibility ─────────────────
-- The spec mentions "user_connections" — create a view aliasing connection_requests
-- so both names work without changing backend code.
CREATE OR REPLACE VIEW user_connections AS
  SELECT
    id,
    requester_id  AS sender_id,
    recipient_id  AS receiver_id,
    requester_type,
    recipient_type,
    college_id,
    is_cross_college,
    status,
    message,
    created_at,
    updated_at
  FROM connection_requests;

-- ─── 3. Ensure profile_links + headline columns exist ─────────────────────────
ALTER TABLE alumni   ADD COLUMN IF NOT EXISTS profile_links JSONB    DEFAULT '[]'::jsonb;
ALTER TABLE alumni   ADD COLUMN IF NOT EXISTS headline      VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_links JSONB    DEFAULT '[]'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS headline      VARCHAR(255);

-- ─── 4. Ensure colleges table has a name column ──────────────────────────────
CREATE TABLE IF NOT EXISTS colleges (
  id         VARCHAR(100) PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  domain     VARCHAR(255),
  is_active  BOOLEAN      DEFAULT true,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── 5. Indexes for fast group queries ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_alumni_college_year  ON alumni(college_id, graduation_year)  WHERE is_active=true AND is_approved=true;
CREATE INDEX IF NOT EXISTS idx_alumni_company       ON alumni(company)                      WHERE is_active=true AND is_approved=true;
CREATE INDEX IF NOT EXISTS idx_alumni_dept          ON alumni(department)                   WHERE is_active=true AND is_approved=true;
CREATE INDEX IF NOT EXISTS idx_students_college     ON students(college_id, year)           WHERE is_active=true;

-- ─── 6. education_history and career_timeline (idempotent) ───────────────────
CREATE TABLE IF NOT EXISTS education_history (
  id             SERIAL       PRIMARY KEY,
  user_id        INTEGER      NOT NULL,
  user_role      VARCHAR(20)  NOT NULL CHECK (user_role IN ('student','alumni')),
  college_id     VARCHAR(100) NOT NULL,
  institution    VARCHAR(255) NOT NULL,
  degree         VARCHAR(255),
  field_of_study VARCHAR(255),
  start_year     INTEGER,
  end_year       INTEGER,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_edu_user ON education_history(user_id, user_role, college_id);

CREATE TABLE IF NOT EXISTS career_timeline (
  id         SERIAL       PRIMARY KEY,
  alumni_id  INTEGER      NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
  college_id VARCHAR(100) NOT NULL,
  company    VARCHAR(255) NOT NULL,
  role       VARCHAR(255) NOT NULL,
  start_date DATE,
  end_date   DATE,
  is_current BOOLEAN      DEFAULT false,
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  updated_at TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_career_alumni ON career_timeline(alumni_id, college_id);
