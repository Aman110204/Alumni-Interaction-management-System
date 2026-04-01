'use strict';
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const logger   = require('../utils/logger');
require('dotenv').config();

const pool = new Pool({
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'alumni_connect',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => { logger.error('[DB] Pool error:', err.message); });

const query           = (text, params) => pool.query(text, params);
const queryWithClient = (client, text, params) => client.query(text, params);

async function initDatabase() {
  const dbName = process.env.DB_NAME || 'alumni_connect';
  const adminPool = new Pool({
    user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT || '5432', 10),
    database: 'postgres',
  });
  try {
    const exists = await adminPool.query('SELECT 1 FROM pg_database WHERE datname=$1', [dbName]);
    if (exists.rowCount === 0) {
      await adminPool.query('CREATE DATABASE "' + dbName + '"');
      logger.info('Database "' + dbName + '" created');
    }
  } catch (err) { logger.warn('[DB] Init warning: ' + err.message); }
  finally { await adminPool.end(); }
  await runSchema();
}

function fk(table, col, ref, onDelete) {
  const name = table + '_' + col + '_fkey';
  return "DO $x$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='" + table + "' AND constraint_name='" + name + "') THEN ALTER TABLE " + table + " ADD CONSTRAINT " + name + " FOREIGN KEY (" + col + ") REFERENCES " + ref + " " + (onDelete||'') + "; END IF; END $x$";
}

function uq(table, name, cols) {
  return "DO $x$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='" + table + "' AND constraint_name='" + name + "') THEN ALTER TABLE " + table + " ADD CONSTRAINT " + name + " UNIQUE (" + cols + "); END IF; END $x$";
}

function uqIdx(table, col) {
  const name = 'idx_' + table + '_' + col + '_uq';
  return "DO $x$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='" + table + "' AND indexname='" + name + "') THEN EXECUTE 'CREATE UNIQUE INDEX " + name + " ON " + table + "(" + col + ")'; END IF; END $x$";
}

function renCol(table, from, to) {
  return "DO $x$ BEGIN " +
    "IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='" + table + "' AND column_name='" + from + "') " +
    "AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='" + table + "' AND column_name='" + to + "') THEN " +
    "EXECUTE 'ALTER TABLE " + table + " RENAME COLUMN " + from + " TO " + to + "'; " +
    "END IF; END $x$";
}

function dropNotNull(table, col, type) {
  return "DO $x$ BEGIN " +
    "IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='" + table + "' AND column_name='" + col + "' AND is_nullable='NO') THEN " +
    "EXECUTE 'ALTER TABLE " + table + " ALTER COLUMN " + col + " DROP NOT NULL'; " +
    "END IF; END $x$";
}

async function runSchema() {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const defaultCollegeId = process.env.DEFAULT_COLLEGE_ID || 'skit';
    const defaultCollegeName = process.env.DEFAULT_COLLEGE_NAME || 'SKIT College';
    const defaultCollegeCode = process.env.DEFAULT_COLLEGE_CODE || String(defaultCollegeId).toUpperCase();
    const migrateAllToDefaultCollege = String(process.env.MIGRATE_ALL_TO_DEFAULT_COLLEGE || '').toLowerCase() === 'true';

    // COLLEGES
    await c.query(`CREATE TABLE IF NOT EXISTS colleges (
      id VARCHAR(80) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      location VARCHAR(120),
      code VARCHAR(50),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await c.query(
      `INSERT INTO colleges (id, name, code)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
      [defaultCollegeId, defaultCollegeName, defaultCollegeCode]
    );
    await c.query(
      `INSERT INTO colleges (id, name, code)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
      ['nps', 'NPS College', 'NPS']
    );

    // STUDENTS
    await c.query('CREATE TABLE IF NOT EXISTS students (id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW())');
    await c.query(dropNotNull('students', 'password', 'VARCHAR(255)'));
    await c.query(dropNotNull('students', 'role', 'VARCHAR(50)'));
    await c.query(renCol('students', 'password', 'password_hash'));
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS full_name     VARCHAR(120)');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS usn           VARCHAR(30)');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS department    VARCHAR(80)');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS year          VARCHAR(20)');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS email         VARCHAR(120)');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS phone         VARCHAR(20)');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS bio           TEXT');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS skills        TEXT');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS headline      VARCHAR(200)');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS location      VARCHAR(120)');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS linkedin_url  TEXT');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS github_url    TEXT');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS resume_url    TEXT');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_photo TEXT');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT TRUE');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS is_approved   BOOLEAN DEFAULT FALSE');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS college_id    VARCHAR(80)');
    await c.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW()');
    await c.query('UPDATE students SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('students', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query(uqIdx('students', 'email'));
    await c.query(uqIdx('students', 'usn'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_students_college  ON students(college_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_students_dept     ON students(department)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_students_active   ON students(is_active)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_students_approved ON students(is_approved)');

    // ALUMNI
    await c.query('CREATE TABLE IF NOT EXISTS alumni (id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW())');
    await c.query(dropNotNull('alumni', 'password', 'VARCHAR(255)'));
    await c.query(dropNotNull('alumni', 'role', 'VARCHAR(50)'));
    await c.query(dropNotNull('alumni', 'batch', 'VARCHAR(20)'));
    await c.query(renCol('alumni', 'password', 'password_hash'));
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS full_name            VARCHAR(120)');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS email                VARCHAR(120)');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS password_hash        VARCHAR(255)');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS company              VARCHAR(120)');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS designation          VARCHAR(120)');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS location             VARCHAR(120)');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS graduation_year      INT');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS department           VARCHAR(80)');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS phone                VARCHAR(20)');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS bio                  TEXT');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS linkedin_url         TEXT');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS github_url           TEXT');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS headline             VARCHAR(200)');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS profile_photo        TEXT');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS is_approved          BOOLEAN DEFAULT FALSE');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS is_active            BOOLEAN DEFAULT TRUE');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS college_id           VARCHAR(80)');
    await c.query("ALTER TABLE alumni ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'");
    await c.query("UPDATE alumni SET status='approved' WHERE is_approved=true AND (status IS NULL OR status='pending')");
    await c.query("UPDATE alumni SET status='pending'  WHERE is_approved=false AND (status IS NULL OR status='pending')");
    // FIX Feature 6: default available_mentorship = FALSE
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS available_mentorship BOOLEAN DEFAULT FALSE');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS available_referral   BOOLEAN DEFAULT TRUE');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS skills               TEXT');
    await c.query('ALTER TABLE alumni ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ DEFAULT NOW()');
    await c.query('UPDATE alumni SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('alumni', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query(uqIdx('alumni', 'email'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_alumni_college  ON alumni(college_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_alumni_dept     ON alumni(department)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_alumni_company  ON alumni(company)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_alumni_active   ON alumni(is_active)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_alumni_approved ON alumni(is_approved)');

    // ADMINS
    await c.query('CREATE TABLE IF NOT EXISTS admins (id SERIAL PRIMARY KEY, full_name VARCHAR(120), email VARCHAR(120) UNIQUE, password_hash VARCHAR(255), is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW())');
    await c.query('ALTER TABLE admins ADD COLUMN IF NOT EXISTS username   VARCHAR(120)');
    await c.query('ALTER TABLE admins ADD COLUMN IF NOT EXISTS college_id VARCHAR(80)');
    await c.query('UPDATE admins SET username=email WHERE username IS NULL AND email IS NOT NULL');
    await c.query('UPDATE admins SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('admins', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query(uqIdx('admins', 'username'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_admins_college ON admins(college_id)');

    // EDUCATION HISTORY (Feature 7)
    await c.query(`CREATE TABLE IF NOT EXISTS education_history (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      user_role VARCHAR(10) NOT NULL,
      college_id VARCHAR(80),
      institution VARCHAR(200),
      degree VARCHAR(120),
      field_of_study VARCHAR(120),
      start_year INT,
      end_year INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await c.query('ALTER TABLE education_history ADD COLUMN IF NOT EXISTS college_id VARCHAR(80)');
    await c.query('UPDATE education_history SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('education_history', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_edu_college ON education_history(college_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_edu_user ON education_history(user_id, user_role)');

    // OPPORTUNITIES
    await c.query("CREATE TABLE IF NOT EXISTS opportunities (id SERIAL PRIMARY KEY, status VARCHAR(20) DEFAULT 'open', created_at TIMESTAMPTZ DEFAULT NOW())");
    await c.query('ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS alumni_id        INT');
    await c.query('ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS title            VARCHAR(200)');
    await c.query('ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS company          VARCHAR(120)');
    await c.query('ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS job_type         VARCHAR(60)');
    await c.query('ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS description      TEXT');
    await c.query('ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS skills_required  TEXT');
    await c.query('ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS salary           VARCHAR(80)');
    await c.query('ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS apply_link       TEXT');
    await c.query('ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS deadline         DATE');
    await c.query('ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS college_id       VARCHAR(80)');
    await c.query('ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW()');
    await c.query('ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS openings_count   INT DEFAULT 1');
    await c.query(`UPDATE opportunities o
                   SET college_id = COALESCE(a.college_id, $1)
                   FROM alumni a
                   WHERE o.alumni_id = a.id AND o.college_id IS NULL`, [defaultCollegeId]);
    await c.query('UPDATE opportunities SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('opportunities', 'alumni_id', 'alumni(id)', 'ON DELETE CASCADE'));
    await c.query(fk('opportunities', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_opp_college ON opportunities(college_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_opp_alumni  ON opportunities(alumni_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_opp_status  ON opportunities(status)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_opp_created ON opportunities(created_at DESC)');

    // JOB APPLICATIONS
    await c.query("CREATE TABLE IF NOT EXISTS job_applications (id SERIAL PRIMARY KEY, status VARCHAR(30) DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())");
    await c.query('ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS opportunity_id INT');
    await c.query('ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS student_id     INT');
    await c.query('ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS college_id     VARCHAR(80)');
    await c.query('ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS cover_letter   TEXT');
    await c.query('ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW()');
    await c.query(`UPDATE job_applications ja
                   SET college_id = COALESCE(o.college_id, $1)
                   FROM opportunities o
                   WHERE ja.opportunity_id = o.id AND ja.college_id IS NULL`, [defaultCollegeId]);
    await c.query('UPDATE job_applications SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('job_applications', 'opportunity_id', 'opportunities(id)', 'ON DELETE CASCADE'));
    await c.query(fk('job_applications', 'student_id', 'students(id)', 'ON DELETE CASCADE'));
    await c.query(fk('job_applications', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_apps_college ON job_applications(college_id)');
    await c.query(uq('job_applications', 'job_apps_opp_student_key', 'opportunity_id, student_id'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_apps_student ON job_applications(student_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_apps_opp     ON job_applications(opportunity_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_apps_created ON job_applications(created_at DESC)');

    // EVENTS
    await c.query('CREATE TABLE IF NOT EXISTS events (id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW())');
    await c.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS admin_id     INT');
    await c.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS title        VARCHAR(200)');
    await c.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS description  TEXT');
    await c.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS event_date   TIMESTAMPTZ');
    await c.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS location     VARCHAR(200)');
    await c.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type   VARCHAR(60) DEFAULT 'General'");
    await c.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS max_capacity INT');
    await c.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_url   TEXT');
    await c.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS college_id   VARCHAR(80)');
    await c.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS status       VARCHAR(20) DEFAULT 'upcoming'");
    await c.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS time_slot    VARCHAR(50)');
    await c.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer    VARCHAR(120)');
    await c.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS speaker      VARCHAR(120)');
    await c.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW()');
    await c.query(`UPDATE events e
                   SET college_id = COALESCE(adm.college_id, $1)
                   FROM admins adm
                   WHERE e.admin_id = adm.id AND e.college_id IS NULL`, [defaultCollegeId]);
    await c.query('UPDATE events SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('events', 'admin_id', 'admins(id)', 'ON DELETE SET NULL'));
    await c.query(fk('events', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_events_college ON events(college_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_events_date    ON events(event_date)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_events_status  ON events(status)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC)');

    // EVENT REGISTRATIONS
    await c.query('CREATE TABLE IF NOT EXISTS event_registrations (id SERIAL PRIMARY KEY, registered_at TIMESTAMPTZ DEFAULT NOW())');
    await c.query('ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS event_id   INT');
    await c.query('ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS student_id INT');
    await c.query('ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS college_id VARCHAR(80)');
    await c.query(`UPDATE event_registrations er
                   SET college_id = COALESCE(e.college_id, $1)
                   FROM events e
                   WHERE er.event_id = e.id AND er.college_id IS NULL`, [defaultCollegeId]);
    await c.query('UPDATE event_registrations SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('event_registrations', 'event_id', 'events(id)', 'ON DELETE CASCADE'));
    await c.query(fk('event_registrations', 'student_id', 'students(id)', 'ON DELETE CASCADE'));
    await c.query(fk('event_registrations', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_ereg_college ON event_registrations(college_id)');
    await c.query(uq('event_registrations', 'event_reg_event_student_key', 'event_id, student_id'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_ereg_event   ON event_registrations(event_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_ereg_student ON event_registrations(student_id)');

    // MENTORSHIP REQUESTS
    await c.query("CREATE TABLE IF NOT EXISTS mentorship_requests (id SERIAL PRIMARY KEY, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())");
    await c.query('ALTER TABLE mentorship_requests ADD COLUMN IF NOT EXISTS student_id       INT');
    await c.query('ALTER TABLE mentorship_requests ADD COLUMN IF NOT EXISTS alumni_id        INT');
    await c.query('ALTER TABLE mentorship_requests ADD COLUMN IF NOT EXISTS college_id       VARCHAR(80)');
    await c.query('ALTER TABLE mentorship_requests ADD COLUMN IF NOT EXISTS is_cross_college BOOLEAN DEFAULT FALSE');
    await c.query('ALTER TABLE mentorship_requests ADD COLUMN IF NOT EXISTS message          TEXT');
    await c.query('ALTER TABLE mentorship_requests ADD COLUMN IF NOT EXISTS response         TEXT');
    await c.query('ALTER TABLE mentorship_requests ADD COLUMN IF NOT EXISTS response_message TEXT');
    await c.query('ALTER TABLE mentorship_requests ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW()');
    await c.query(`UPDATE mentorship_requests mr
                   SET college_id = COALESCE(s.college_id, a.college_id, $1)
                   FROM students s, alumni a
                   WHERE mr.student_id = s.id
                     AND mr.alumni_id = a.id
                     AND mr.college_id IS NULL`, [defaultCollegeId]);
    await c.query('UPDATE mentorship_requests SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('mentorship_requests', 'student_id', 'students(id)', 'ON DELETE CASCADE'));
    await c.query(fk('mentorship_requests', 'alumni_id', 'alumni(id)', 'ON DELETE CASCADE'));
    await c.query(fk('mentorship_requests', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_mentor_college ON mentorship_requests(college_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_mentor_student ON mentorship_requests(student_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_mentor_alumni  ON mentorship_requests(alumni_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_mentor_status  ON mentorship_requests(status)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_mentor_created ON mentorship_requests(created_at DESC)');

    // REFERRAL REQUESTS
    await c.query("CREATE TABLE IF NOT EXISTS referral_requests (id SERIAL PRIMARY KEY, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())");
    await c.query('ALTER TABLE referral_requests ADD COLUMN IF NOT EXISTS student_id INT');
    await c.query('ALTER TABLE referral_requests ADD COLUMN IF NOT EXISTS alumni_id  INT');
    await c.query('ALTER TABLE referral_requests ADD COLUMN IF NOT EXISTS college_id VARCHAR(80)');
    await c.query('ALTER TABLE referral_requests ADD COLUMN IF NOT EXISTS is_cross_college BOOLEAN DEFAULT FALSE');
    await c.query('ALTER TABLE referral_requests ADD COLUMN IF NOT EXISTS company    VARCHAR(120)');
    await c.query('ALTER TABLE referral_requests ADD COLUMN IF NOT EXISTS job_title  VARCHAR(120)');
    await c.query('ALTER TABLE referral_requests ADD COLUMN IF NOT EXISTS resume_url TEXT');
    await c.query('ALTER TABLE referral_requests ADD COLUMN IF NOT EXISTS message    TEXT');
    await c.query('ALTER TABLE referral_requests ADD COLUMN IF NOT EXISTS response   TEXT');
    await c.query('ALTER TABLE referral_requests ADD COLUMN IF NOT EXISTS notes      TEXT');
    await c.query('ALTER TABLE referral_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()');
    await c.query(`UPDATE referral_requests rr
                   SET college_id = COALESCE(s.college_id, a.college_id, $1)
                   FROM students s, alumni a
                   WHERE rr.student_id = s.id
                     AND rr.alumni_id = a.id
                     AND rr.college_id IS NULL`, [defaultCollegeId]);
    await c.query('UPDATE referral_requests SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('referral_requests', 'student_id', 'students(id)', 'ON DELETE CASCADE'));
    await c.query(fk('referral_requests', 'alumni_id', 'alumni(id)', 'ON DELETE CASCADE'));
    await c.query(fk('referral_requests', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_ref_college ON referral_requests(college_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_ref_student ON referral_requests(student_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_ref_alumni  ON referral_requests(alumni_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_ref_status  ON referral_requests(status)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_ref_created ON referral_requests(created_at DESC)');

    // CONVERSATIONS
    await c.query('CREATE TABLE IF NOT EXISTS conversations (id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW())');
    await c.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS college_id VARCHAR(80)');
    await c.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_cross_college BOOLEAN DEFAULT FALSE');
    await c.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()');
    // Fix 7: Add direct user columns for fast 1-to-1 lookups (audit requirement)
    await c.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user1_id   INT');
    await c.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user1_type VARCHAR(10)');
    await c.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user2_id   INT');
    await c.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user2_type VARCHAR(10)');
    await c.query('UPDATE conversations SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('conversations', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_conv_college ON conversations(college_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_conv_updated ON conversations(updated_at DESC)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_conv_users   ON conversations(user1_id, user2_id)');

    // CONVERSATION PARTICIPANTS
    await c.query('CREATE TABLE IF NOT EXISTS conversation_participants (id SERIAL PRIMARY KEY, participant_id INT NOT NULL, participant_type VARCHAR(10) NOT NULL)');
    await c.query('ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS conversation_id INT');
    await c.query('ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS last_read_at    TIMESTAMPTZ');
    await c.query(fk('conversation_participants', 'conversation_id', 'conversations(id)', 'ON DELETE CASCADE'));
    await c.query(uq('conversation_participants', 'conv_part_unique_key', 'conversation_id, participant_id, participant_type'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_cp_conv ON conversation_participants(conversation_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_cp_part ON conversation_participants(participant_id, participant_type)');

    // MESSAGES
    await c.query('CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, sender_id INT NOT NULL, sender_type VARCHAR(10) NOT NULL, message TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())');
    await c.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS college_id VARCHAR(80)');
    await c.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_cross_college BOOLEAN DEFAULT FALSE');
    await c.query(dropNotNull('messages', 'receiver_id', 'INT'));
    await c.query(dropNotNull('messages', 'receiver_type', 'VARCHAR(10)'));
    await c.query("DO $x$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='receiver_id') THEN ALTER TABLE messages DROP COLUMN receiver_id; END IF; END $x$");
    await c.query("DO $x$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='receiver_type') THEN ALTER TABLE messages DROP COLUMN receiver_type; END IF; END $x$");
    await c.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id INT');
    await c.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read         BOOLEAN DEFAULT FALSE');
    await c.query(`UPDATE messages m
                   SET college_id = COALESCE(cn.college_id, $1)
                   FROM conversations cn
                   WHERE m.conversation_id = cn.id AND m.college_id IS NULL`, [defaultCollegeId]);
    await c.query('UPDATE messages SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('messages', 'conversation_id', 'conversations(id)', 'ON DELETE CASCADE'));
    await c.query(fk('messages', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_msg_college  ON messages(college_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_msg_conv    ON messages(conversation_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_msg_sender  ON messages(sender_id, sender_type)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_msg_read    ON messages(is_read) WHERE is_read = FALSE');
    await c.query('CREATE INDEX IF NOT EXISTS idx_msg_created ON messages(created_at DESC)');

    // CONNECTION REQUESTS
    await c.query("CREATE TABLE IF NOT EXISTS connection_requests (id SERIAL PRIMARY KEY, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())");
    await c.query("ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS college_id VARCHAR(80)");
    await c.query("ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS is_cross_college BOOLEAN DEFAULT FALSE");
    await c.query("ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS requester_type VARCHAR(10) NOT NULL DEFAULT 'student'");
    await c.query('ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS requester_id   INT');
    await c.query("ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS recipient_type VARCHAR(10) NOT NULL DEFAULT 'alumni'");
    await c.query('ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS recipient_id   INT');
    await c.query('ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS message        TEXT');
    await c.query('ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS responded_at   TIMESTAMPTZ');
    await c.query('ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW()');
    await c.query('UPDATE connection_requests SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('connection_requests', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_conn_req_college ON connection_requests(college_id)');
    await c.query(uq('connection_requests', 'connection_request_unique_pair_key', 'requester_type, requester_id, recipient_type, recipient_id'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_conn_req_requester ON connection_requests(requester_type, requester_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_conn_req_recipient ON connection_requests(recipient_type, recipient_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_conn_req_status ON connection_requests(status)');
    // Fix 3: Audit-specified indexes
    await c.query('CREATE INDEX IF NOT EXISTS idx_connections_sender   ON connection_requests(requester_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_connections_receiver ON connection_requests(recipient_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_education_user       ON education_history(user_id)');

    // NOTIFICATIONS
    await c.query('CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INT NOT NULL, user_type VARCHAR(10) NOT NULL, message TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())');
    await c.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS college_id VARCHAR(80)');
    await c.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title   VARCHAR(200)');
    await c.query("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type    VARCHAR(50) DEFAULT 'general'");
    await c.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE');
    await c.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link    TEXT');
    await c.query('UPDATE notifications SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('notifications', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_notif_college ON notifications(college_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_notif_user    ON notifications(user_id, user_type)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_notif_unread  ON notifications(user_id, user_type) WHERE is_read = FALSE');
    await c.query('CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC)');

    // ANNOUNCEMENTS
    await c.query('CREATE TABLE IF NOT EXISTS announcements (id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW())');
    await c.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS admin_id    INT');
    await c.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS college_id  VARCHAR(80)');
    await c.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS title       VARCHAR(200)');
    await c.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS description TEXT');
    await c.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS posted_by   VARCHAR(120)');
    await c.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_role VARCHAR(20) DEFAULT 'all'");
    await c.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE');
    await c.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_colleges TEXT[] DEFAULT '{}'::text[]");
    await c.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_departments TEXT[] DEFAULT '{}'::text[]");
    await c.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_batches INT[] DEFAULT '{}'::int[]");
    await c.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW()');
    await c.query('UPDATE announcements SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('announcements', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_ann_college ON announcements(college_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_ann_created ON announcements(created_at DESC)');

    // CAREER TIMELINE
    await c.query('CREATE TABLE IF NOT EXISTS career_timeline (id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW())');
    await c.query('ALTER TABLE career_timeline ADD COLUMN IF NOT EXISTS alumni_id   INT');
    await c.query('ALTER TABLE career_timeline ADD COLUMN IF NOT EXISTS college_id  VARCHAR(80)');
    await c.query('ALTER TABLE career_timeline ADD COLUMN IF NOT EXISTS company     VARCHAR(120)');
    await c.query('ALTER TABLE career_timeline ADD COLUMN IF NOT EXISTS role        VARCHAR(120)');
    await c.query('ALTER TABLE career_timeline ADD COLUMN IF NOT EXISTS start_date  DATE');
    await c.query('ALTER TABLE career_timeline ADD COLUMN IF NOT EXISTS end_date    DATE');
    await c.query('ALTER TABLE career_timeline ADD COLUMN IF NOT EXISTS is_current  BOOLEAN DEFAULT FALSE');
    await c.query('ALTER TABLE career_timeline ADD COLUMN IF NOT EXISTS description TEXT');
    await c.query(`UPDATE career_timeline ct
                   SET college_id = COALESCE(a.college_id, $1)
                   FROM alumni a
                   WHERE ct.alumni_id = a.id AND ct.college_id IS NULL`, [defaultCollegeId]);
    await c.query('UPDATE career_timeline SET college_id=$1 WHERE college_id IS NULL', [defaultCollegeId]);
    await c.query(fk('career_timeline', 'alumni_id', 'alumni(id)', 'ON DELETE CASCADE'));
    await c.query(fk('career_timeline', 'college_id', 'colleges(id)', 'ON DELETE RESTRICT'));
    await c.query('CREATE INDEX IF NOT EXISTS idx_ct_college ON career_timeline(college_id)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_ct_alumni ON career_timeline(alumni_id)');

    // Drop legacy columns from opportunities
    await c.query("DO $x$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='opportunities' AND column_name='posted_by') THEN ALTER TABLE opportunities DROP COLUMN posted_by; END IF; END $x$");
    await c.query("DO $x$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='opportunities' AND column_name='posted_by_alumni_id') THEN ALTER TABLE opportunities DROP COLUMN posted_by_alumni_id; END IF; END $x$");

    if (migrateAllToDefaultCollege) {
      await c.query('UPDATE students SET college_id=$1', [defaultCollegeId]);
      await c.query('UPDATE alumni SET college_id=$1', [defaultCollegeId]);
      await c.query('UPDATE admins SET college_id=$1', [defaultCollegeId]);
      await c.query('UPDATE education_history SET college_id=$1', [defaultCollegeId]);
      await c.query('UPDATE opportunities SET college_id=$1', [defaultCollegeId]);
      await c.query('UPDATE job_applications SET college_id=$1', [defaultCollegeId]);
      await c.query('UPDATE events SET college_id=$1', [defaultCollegeId]);
      await c.query('UPDATE event_registrations SET college_id=$1', [defaultCollegeId]);
      await c.query('UPDATE mentorship_requests SET college_id=$1', [defaultCollegeId]);
      await c.query('UPDATE referral_requests SET college_id=$1', [defaultCollegeId]);
      await c.query('UPDATE conversations SET college_id=$1', [defaultCollegeId]);
      await c.query('UPDATE messages SET college_id=$1', [defaultCollegeId]);
      await c.query('UPDATE connection_requests SET college_id=$1', [defaultCollegeId]);
      await c.query('UPDATE notifications SET college_id=$1', [defaultCollegeId]);
      await c.query('UPDATE announcements SET college_id=$1', [defaultCollegeId]);
      await c.query('UPDATE career_timeline SET college_id=$1', [defaultCollegeId]);
      logger.info(`All tenant data migrated to default college '${defaultCollegeId}'`);
    }

    await c.query(
      `INSERT INTO admins (username, email, password_hash, full_name, college_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO UPDATE
         SET email = EXCLUDED.email,
             full_name = EXCLUDED.full_name,
             college_id = EXCLUDED.college_id`,
      ['npsadmin', 'admin@nps.alumniconnect.com', bcrypt.hashSync('admin123', 10), 'NPS Admin', 'nps']
    );

    await c.query('COMMIT');
    logger.info('✅ Database schema ready');
  } catch (err) {
    await c.query('ROLLBACK');
    logger.error('[DB] Schema error: ' + err.message);
    throw err;
  } finally {
    c.release();
  }
}

module.exports = { pool, query, queryWithClient, initDatabase };
