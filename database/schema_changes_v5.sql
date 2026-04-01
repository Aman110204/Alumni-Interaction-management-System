-- =============================================================================
-- AlumniConnect v5 — REQUIRED Migration
-- Run once against your PostgreSQL database:
--   psql -d your_database_name -f schema_changes_v5.sql
-- =============================================================================

-- ─── 1. Fix connections table naming conflict ─────────────────────────────────
-- The codebase uses `connection_requests` but an older migration created `connections`.
-- This block migrates data and drops the wrong table.

CREATE TABLE IF NOT EXISTS connection_requests (
  id               SERIAL PRIMARY KEY,
  requester_id     INTEGER      NOT NULL,
  requester_type   VARCHAR(20)  NOT NULL,
  recipient_id     INTEGER      NOT NULL,
  recipient_type   VARCHAR(20)  NOT NULL,
  college_id       VARCHAR(100),
  is_cross_college BOOLEAN      DEFAULT false,
  status           VARCHAR(20)  DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  message          TEXT,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(requester_id, requester_type, recipient_id, recipient_type)
);

CREATE INDEX IF NOT EXISTS idx_connreq_requester ON connection_requests(requester_id, requester_type);
CREATE INDEX IF NOT EXISTS idx_connreq_recipient ON connection_requests(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_connreq_status    ON connection_requests(status);
CREATE INDEX IF NOT EXISTS idx_connreq_college   ON connection_requests(college_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='connections' AND table_schema='public') THEN
    INSERT INTO connection_requests (requester_id,requester_type,recipient_id,recipient_type,college_id,is_cross_college,status,message,created_at,updated_at)
    SELECT requester_id,requester_type,recipient_id,recipient_type,college_id,is_cross_college,status,message,created_at,updated_at
    FROM connections c
    WHERE NOT EXISTS (
      SELECT 1 FROM connection_requests cr
      WHERE cr.requester_id=c.requester_id AND cr.requester_type=c.requester_type
        AND cr.recipient_id=c.recipient_id AND cr.recipient_type=c.recipient_type
    );
    DROP TABLE connections;
    RAISE NOTICE 'Migrated connections → connection_requests and dropped old table';
  END IF;
END;
$$;

-- ─── 2. Add profile_links column to alumni (THE FIX for "column does not exist") ──
ALTER TABLE alumni   ADD COLUMN IF NOT EXISTS profile_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_links JSONB DEFAULT '[]'::jsonb;

-- ─── 3. Add headline column if not present ────────────────────────────────────
ALTER TABLE alumni   ADD COLUMN IF NOT EXISTS headline VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS headline VARCHAR(255);

-- ─── 4. Education history table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS education_history (
  id             SERIAL PRIMARY KEY,
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

-- ─── 5. Career timeline table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS career_timeline (
  id         SERIAL PRIMARY KEY,
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

-- ─── 6. Colleges table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS colleges (
  id         VARCHAR(100) PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  domain     VARCHAR(255),
  is_active  BOOLEAN      DEFAULT true,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── 7. Mentorship requests ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentorship_requests (
  id               SERIAL PRIMARY KEY,
  student_id       INTEGER      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  alumni_id        INTEGER      NOT NULL REFERENCES alumni(id)   ON DELETE CASCADE,
  college_id       VARCHAR(100) NOT NULL,
  is_cross_college BOOLEAN      DEFAULT false,
  status           VARCHAR(20)  DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  message          TEXT,
  response         TEXT,
  response_message TEXT,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ment_student ON mentorship_requests(student_id, college_id);
CREATE INDEX IF NOT EXISTS idx_ment_alumni  ON mentorship_requests(alumni_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ment_unique_pending ON mentorship_requests(student_id, alumni_id) WHERE status='pending';

-- ─── 8. Referral requests ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_requests (
  id               SERIAL PRIMARY KEY,
  student_id       INTEGER      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  alumni_id        INTEGER      NOT NULL REFERENCES alumni(id)   ON DELETE CASCADE,
  college_id       VARCHAR(100) NOT NULL,
  is_cross_college BOOLEAN      DEFAULT false,
  company          VARCHAR(255) NOT NULL,
  job_title        VARCHAR(255) NOT NULL,
  resume_url       TEXT,
  message          TEXT,
  status           VARCHAR(20)  DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  response         TEXT,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ref_student ON referral_requests(student_id, college_id);
CREATE INDEX IF NOT EXISTS idx_ref_alumni  ON referral_requests(alumni_id);

-- ─── 9. Auto-update trigger for connection_requests ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_connreq_updated_at ON connection_requests;
CREATE TRIGGER trg_connreq_updated_at
  BEFORE UPDATE ON connection_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Done!
SELECT 'schema_changes_v5 applied successfully' AS result;
