-- =============================================================================
-- AlumniConnect v4 — Schema Enhancements for LinkedIn-style Profiles
-- Run this AFTER existing schema_changes_v3.sql
-- =============================================================================

-- ─── Education History ───────────────────────────────────────────────────────
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

-- ─── Career Timeline ─────────────────────────────────────────────────────────
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

-- ─── Colleges table (if not exists) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS colleges (
  id         VARCHAR(100) PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  domain     VARCHAR(255),
  is_active  BOOLEAN      DEFAULT true,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Connections (unified table) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connections (
  id              SERIAL PRIMARY KEY,
  requester_id    INTEGER      NOT NULL,
  requester_type  VARCHAR(20)  NOT NULL,
  recipient_id    INTEGER      NOT NULL,
  recipient_type  VARCHAR(20)  NOT NULL,
  college_id      VARCHAR(100),
  is_cross_college BOOLEAN     DEFAULT false,
  status          VARCHAR(20)  DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  message         TEXT,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(requester_id, requester_type, recipient_id, recipient_type)
);

CREATE INDEX IF NOT EXISTS idx_conn_requester ON connections(requester_id, requester_type);
CREATE INDEX IF NOT EXISTS idx_conn_recipient ON connections(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_conn_status    ON connections(status);

-- ─── Mentorship Requests ─────────────────────────────────────────────────────
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
-- Prevent duplicates: one pending request per student-alumni pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_ment_unique_pending
  ON mentorship_requests(student_id, alumni_id)
  WHERE status = 'pending';

-- ─── Referral Requests ───────────────────────────────────────────────────────
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
-- Prevent duplicate pending referrals for same student-alumni-company
CREATE UNIQUE INDEX IF NOT EXISTS idx_ref_unique_pending
  ON referral_requests(student_id, alumni_id, company)
  WHERE status = 'pending';

-- ─── Alumni profile columns (add if missing) ─────────────────────────────────
DO $$ BEGIN
  ALTER TABLE alumni ADD COLUMN IF NOT EXISTS bio                  TEXT;
  ALTER TABLE alumni ADD COLUMN IF NOT EXISTS headline             VARCHAR(255);
  ALTER TABLE alumni ADD COLUMN IF NOT EXISTS github_url           TEXT;
  ALTER TABLE alumni ADD COLUMN IF NOT EXISTS profile_photo        TEXT;
  ALTER TABLE alumni ADD COLUMN IF NOT EXISTS available_mentorship BOOLEAN DEFAULT false;
  ALTER TABLE alumni ADD COLUMN IF NOT EXISTS available_referral   BOOLEAN DEFAULT true;
  ALTER TABLE alumni ADD COLUMN IF NOT EXISTS skills               TEXT;
  ALTER TABLE alumni ADD COLUMN IF NOT EXISTS status               VARCHAR(20) DEFAULT 'pending';
  ALTER TABLE alumni ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ DEFAULT NOW();
END $$;

-- ─── Students profile columns (add if missing) ───────────────────────────────
DO $$ BEGIN
  ALTER TABLE students ADD COLUMN IF NOT EXISTS bio         TEXT;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS headline    VARCHAR(255);
  ALTER TABLE students ADD COLUMN IF NOT EXISTS github_url  TEXT;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS resume_url  TEXT;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS location    VARCHAR(255);
  ALTER TABLE students ADD COLUMN IF NOT EXISTS skills      TEXT;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();
END $$;

-- ─── Notifications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER      NOT NULL,
  user_type  VARCHAR(20)  NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT,
  type       VARCHAR(50),
  link       TEXT,
  college_id VARCHAR(100),
  is_read    BOOLEAN      DEFAULT false,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- Add link column if table already existed without it
DO $$ BEGIN
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
END $$;

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, user_type, college_id, is_read);

-- ─── is_global column for admin content ──────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_global       BOOLEAN   DEFAULT false;
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_colleges  TEXT[];
  ALTER TABLE events        ADD COLUMN IF NOT EXISTS is_global        BOOLEAN   DEFAULT false;
  ALTER TABLE events        ADD COLUMN IF NOT EXISTS target_colleges  TEXT[];
  ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS is_global        BOOLEAN   DEFAULT false;
  ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS target_colleges  TEXT[];
  ALTER TABLE referral_requests ADD COLUMN IF NOT EXISTS is_global    BOOLEAN   DEFAULT false;
  ALTER TABLE referral_requests ADD COLUMN IF NOT EXISTS target_colleges TEXT[];
END $$;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================

-- ─── v5: intro-only conversation flag ────────────────────────────────────────
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_intro_only BOOLEAN DEFAULT false;

-- ─── v6: profile_links (custom links array for alumni + students) ─────────────
DO $$ BEGIN
  ALTER TABLE alumni   ADD COLUMN IF NOT EXISTS profile_links JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_links JSONB DEFAULT '[]'::jsonb;
END $$;
