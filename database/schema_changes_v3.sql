-- AlumniConnect v3.0 Schema Changes
-- All changes are applied automatically via database.js on server start.
-- This file documents manual migration steps if needed.

-- 1. New columns on students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS headline     VARCHAR(200);
ALTER TABLE students ADD COLUMN IF NOT EXISTS location     VARCHAR(120);
ALTER TABLE students ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS github_url   TEXT;

-- 2. New columns on alumni table
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS headline   VARCHAR(200);
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS github_url TEXT;
-- Fix: default available_mentorship to FALSE (new registrations)
-- Existing alumni keep their current value

-- 3. New education_history table (Feature 7)
CREATE TABLE IF NOT EXISTS education_history (
  id             SERIAL PRIMARY KEY,
  user_id        INT NOT NULL,
  user_role      VARCHAR(10) NOT NULL,
  institution    VARCHAR(200),
  degree         VARCHAR(120),
  field_of_study VARCHAR(120),
  start_year     INT,
  end_year       INT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_edu_user ON education_history(user_id, user_role);

-- 4. connection_requests already supports universal connections via requester_type/recipient_type
-- No schema change needed — student<->student and alumni<->alumni use same table.

-- NOTE: The unique constraint on connection_requests allows only ONE pending/accepted
-- request per ordered pair. For same-type connections (student<->student),
-- canonicalize by sorting IDs before inserting to avoid duplicates.
