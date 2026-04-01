'use strict';
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { signToken } = require('../utils/jwt');
const {
  assertCollegeExists,
  getDefaultCollegeId,
  normalizeCollegeId,
} = require('./tenantService');

const SALT_ROUNDS = 12; // Increased from 10 — industry standard

async function registerStudent({ fullName, usn, department, year, email, phone, password, college_id }) {
  const collegeId = normalizeCollegeId(college_id) || getDefaultCollegeId();
  await assertCollegeExists(collegeId);
  // Check for duplicate email or USN
  const existing = await query(
    'SELECT id FROM students WHERE email=$1 OR usn=$2', [email, usn]
  );
  if (existing.rowCount > 0) {
    throw Object.assign(new Error('Email or USN already registered'), { status: 409 });
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const r = await query(
    `INSERT INTO students (full_name, usn, department, year, email, phone, password_hash, is_approved, college_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, full_name, email, college_id, is_approved, created_at`,
    [fullName, usn, department, year, email, phone, hash, false, collegeId]
  );
  // SECURITY: never return password_hash
  return r.rows[0];
}

async function loginStudent({ email, password, college_id }) {
  const collegeId = normalizeCollegeId(college_id);
  const params = [email];
  let sql = 'SELECT id, full_name, email, college_id, password_hash::TEXT AS password_hash, is_active, is_approved FROM students WHERE email=$1';
  if (collegeId) {
    params.push(collegeId);
    sql += ' AND college_id=$2';
  }
  const r = await query(sql, params);
  const student = r.rows[0];

  // SECURITY: Use constant-time comparison to prevent user enumeration timing attacks
  if (!student) {
    await bcrypt.compare(password, '$2a$12$notarealhashjustpadding00000000000000000000000'); // dummy
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  if (!student.is_active) {
    throw Object.assign(new Error('Account is deactivated. Please contact admin.'), { status: 403 });
  }

  if (!student.is_approved) {
    throw Object.assign(new Error('Student account is pending admin approval.'), { status: 403 });
  }

  const valid = await bcrypt.compare(password, student.password_hash);
  if (!valid) throw Object.assign(new Error('Invalid email or password'), { status: 401 });

  const token = signToken({ id: student.id, role: 'student', email: student.email, college_id: student.college_id });
  return {
    token,
    user: { id: student.id, full_name: student.full_name, email: student.email, role: 'student', college_id: student.college_id },
  };
}

async function getDashboard(studentId, collegeId) {
  const [profile, events, opps, mentorship, referrals, notifications] = await Promise.all([
    query(
      'SELECT id, full_name, email, department, year, usn, college_id FROM students WHERE id=$1 AND college_id=$2',
      [studentId, collegeId]
    ),
    query(`
      SELECT e.id, e.title, e.event_date, e.location, e.event_type
      FROM events e
      JOIN event_registrations er ON er.event_id = e.id
      WHERE er.student_id=$1 AND e.college_id=$2 AND e.event_date >= NOW()
      ORDER BY e.event_date ASC LIMIT 3
    `, [studentId, collegeId]),
    query('SELECT COUNT(*) AS count FROM job_applications WHERE student_id=$1 AND college_id=$2', [studentId, collegeId]),
    query(`SELECT COUNT(*) AS count FROM mentorship_requests WHERE student_id=$1 AND college_id=$2 AND status='pending'`, [studentId, collegeId]),
    query(`SELECT COUNT(*) AS count FROM referral_requests   WHERE student_id=$1 AND college_id=$2 AND status='pending'`, [studentId, collegeId]),
    query(`SELECT COUNT(*) AS count FROM notifications WHERE user_id=$1 AND user_type='student' AND college_id=$2 AND is_read=false`, [studentId, collegeId]),
  ]);

  if (!profile.rowCount) throw Object.assign(new Error('Student not found'), { status: 404 });

  // Count total alumni for the "Alumni Network" stat
  const alumniCount = await query('SELECT COUNT(*) AS count FROM alumni WHERE is_approved=true AND is_active=true AND college_id=$1', [collegeId]);
  // Count open opportunities for the stat
  const openOpps = await query("SELECT COUNT(*) AS count FROM opportunities WHERE status='active' AND job_type != 'Internship' AND college_id=$1", [collegeId]);
  // Count open internships
  const openInternships = await query("SELECT COUNT(*) AS count FROM opportunities WHERE status='active' AND job_type = 'Internship' AND college_id=$1", [collegeId]);

  const pending_mentorship   = parseInt(mentorship.rows[0].count);
  const pending_referrals    = parseInt(referrals.rows[0].count);
  const unread_notifications = parseInt(notifications.rows[0].count);

  return {
    profile:         profile.rows[0],
    recent_events:   events.rows,       // used by dashboard upcoming events panel
    stats: {
      applications:       parseInt(opps.rows[0].count),
      pending_mentorship,
      pending_referrals,
      unread_notifications,
    },
    // Flat aliases — frontend reads these directly from d.*
    upcoming_events:    events.rows.length,
    open_opportunities: parseInt(openOpps.rows[0].count),
    open_internships:   parseInt(openInternships.rows[0].count),
    my_referrals:       pending_referrals,
    my_mentors:         pending_mentorship,
    unread_messages:    unread_notifications,
    total_alumni:       parseInt(alumniCount.rows[0].count),
  };
}

async function getProfile(studentId, collegeId) {
  let r;
  try {
    r = await query(
      `SELECT id, full_name, usn, department, year, email, phone,
              bio, skills, headline, location, linkedin_url, github_url, college_id,
              resume_url, profile_photo, profile_links, created_at
       FROM students WHERE id=$1 AND college_id=$2`,
      [studentId, collegeId]
    );
  } catch (e) {
    if (e.message && e.message.includes('profile_links')) {
      r = await query(
        `SELECT id, full_name, usn, department, year, email, phone,
                bio, skills, headline, location, linkedin_url, github_url, college_id,
                resume_url, profile_photo, created_at
         FROM students WHERE id=$1 AND college_id=$2`,
        [studentId, collegeId]
      );
    } else { throw e; }
  }
  if (!r.rowCount) throw Object.assign(new Error('Student not found'), { status: 404 });
  const row = r.rows[0];
  if (!Array.isArray(row.profile_links)) row.profile_links = [];
  return row;
}

async function updateProfile(studentId, collegeId, { full_name, phone, bio, skills, resume_url, headline, location, linkedin_url, github_url, department, year, profile_links }) {
  // Validate profile_links if provided
  let linksJson = null;
  if (profile_links !== undefined) {
    if (!Array.isArray(profile_links)) throw Object.assign(new Error('profile_links must be an array'), { status: 400 });
    for (const l of profile_links) {
      if (!l.label || !l.label.trim()) throw Object.assign(new Error('Each link must have a label'), { status: 400 });
      if (!l.url || !/^https?:\/\/.+/.test(l.url)) throw Object.assign(new Error(`Invalid URL: ${l.url}`), { status: 400 });
    }
    linksJson = JSON.stringify(profile_links);
  }
  let r;
  try {
    r = await query(
      `UPDATE students
       SET full_name     = COALESCE($1, full_name),
           phone         = COALESCE($2, phone),
           bio           = COALESCE($3, bio),
           skills        = COALESCE($4, skills),
           resume_url    = COALESCE($5, resume_url),
           headline      = COALESCE($6, headline),
           location      = COALESCE($7, location),
           linkedin_url  = COALESCE($8, linkedin_url),
           github_url    = COALESCE($9, github_url),
           department    = COALESCE($10, department),
           year          = COALESCE($11, year),
           profile_links = COALESCE($14::jsonb, profile_links),
           updated_at    = NOW()
       WHERE id=$12 AND college_id=$13
       RETURNING id, full_name, email, phone, bio, skills, resume_url, headline, location, linkedin_url, github_url, profile_links`,
      [full_name, phone, bio, skills, resume_url,
       headline || null, location || null, linkedin_url || null, github_url || null,
       department || null, year || null, studentId, collegeId, linksJson]
    );
  } catch (e) {
    if (e.message && (e.message.includes('profile_links') || e.message.includes('headline'))) {
      r = await query(
        `UPDATE students
         SET full_name    = COALESCE($1, full_name),
             phone        = COALESCE($2, phone),
             bio          = COALESCE($3, bio),
             skills       = COALESCE($4, skills),
             resume_url   = COALESCE($5, resume_url),
             location     = COALESCE($6, location),
             linkedin_url = COALESCE($7, linkedin_url),
             github_url   = COALESCE($8, github_url),
             department   = COALESCE($9, department),
             year         = COALESCE($10, year),
             updated_at   = NOW()
         WHERE id=$11 AND college_id=$12
         RETURNING id, full_name, email, phone, bio, skills, resume_url, location, linkedin_url, github_url`,
        [full_name, phone, bio, skills, resume_url,
         location || null, linkedin_url || null, github_url || null,
         department || null, year || null, studentId, collegeId]
      );
    } else { throw e; }
  }
  if (!r.rowCount) throw Object.assign(new Error('Student not found'), { status: 404 });
  const row = r.rows[0];
  if (!Array.isArray(row.profile_links)) row.profile_links = [];
  return row;
}

module.exports = { registerStudent, loginStudent, getDashboard, getProfile, updateProfile };
