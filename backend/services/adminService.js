'use strict';
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { signToken } = require('../utils/jwt');
const {
  assertCollegeExists,
  getDefaultCollegeId,
  normalizeCollegeId,
} = require('./tenantService');

const SALT_ROUNDS = 12;

async function loginAdmin({ login, password, college_id }) {
  const collegeId = normalizeCollegeId(college_id);
  const params = [login];
  let sql = 'SELECT id, username, email, college_id, password_hash::TEXT AS password_hash, full_name FROM admins WHERE (username=$1 OR email=$1)';
  if (collegeId) {
    params.push(collegeId);
    sql += ' AND college_id=$2';
  }
  const r = await query(sql, params);
  const admin = r.rows[0];

  // Constant-time comparison
  if (!admin) {
    await bcrypt.compare(password, '$2a$12$notarealhashjustpadding00000000000000000000000');
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const token = signToken({ id: admin.id, role: 'admin', username: admin.username, college_id: admin.college_id });
  return {
    token,
    user: { id: admin.id, username: admin.username, full_name: admin.full_name, role: 'admin', college_id: admin.college_id },
  };
}

async function getDashboard(collegeId) {
  const [students, approvedStudents, alumni, approvedAlumni, opps, events, mentorship, referrals, messages] = await Promise.all([
    query("SELECT COUNT(*) AS count FROM students WHERE college_id=$1 AND is_active=true", [collegeId]),
    query("SELECT COUNT(*) AS count FROM students WHERE college_id=$1 AND is_active=true AND is_approved=true", [collegeId]),
    query('SELECT COUNT(*) AS count FROM alumni WHERE college_id=$1', [collegeId]),
    query("SELECT COUNT(*) AS count FROM alumni WHERE college_id=$1 AND is_approved=true", [collegeId]),
    query('SELECT COUNT(*) AS count FROM opportunities WHERE college_id=$1', [collegeId]),
    query('SELECT COUNT(*) AS count FROM events WHERE college_id=$1', [collegeId]),
    query("SELECT COUNT(*) AS count FROM mentorship_requests WHERE college_id=$1 AND status='pending'", [collegeId]),
    query("SELECT COUNT(*) AS count FROM referral_requests WHERE college_id=$1 AND status='pending'", [collegeId]),
    query('SELECT COUNT(*) AS count FROM messages WHERE college_id=$1', [collegeId]),
  ]);

  return {
    students:          parseInt(students.rows[0].count),
    approved_students: parseInt(approvedStudents.rows[0].count),
    pending_students:  parseInt(students.rows[0].count) - parseInt(approvedStudents.rows[0].count),
    alumni:            parseInt(alumni.rows[0].count),
    approved_alumni:   parseInt(approvedAlumni.rows[0].count),
    pending_alumni:    parseInt(alumni.rows[0].count) - parseInt(approvedAlumni.rows[0].count),
    opportunities:     parseInt(opps.rows[0].count),
    events:            parseInt(events.rows[0].count),
    pending_mentorship:parseInt(mentorship.rows[0].count),
    pending_referrals: parseInt(referrals.rows[0].count),
    total_messages:    parseInt(messages.rows[0].count),
    messages:          parseInt(messages.rows[0].count),   // alias for AdminDashboard
  };
}

async function getStudents({ page = 1, limit = 20, search, is_approved, is_active, collegeId } = {}) {
  page  = parseInt(page)  || 1;
  limit = parseInt(limit) || 20;
  const offset = (page - 1) * limit;
  const params = [collegeId];
  const conditions = ['college_id=$1'];

  if (search) {
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    conditions.push(`(full_name ILIKE $${params.length - 2} OR email ILIKE $${params.length - 1} OR usn ILIKE $${params.length})`);
  }

  // Support ?is_approved=true/false from ManageStudents filter
  if (is_approved !== undefined && is_approved !== '') {
    const val = is_approved === 'true' || is_approved === true;
    params.push(val);
    conditions.push(`is_approved = $${params.length}`);
  }

  if (is_active !== undefined && is_active !== '') {
    const val = is_active === 'true' || is_active === true;
    params.push(val);
    conditions.push(`is_active = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countParams = [...params];

  params.push(limit, offset);
  const r = await query(
    `SELECT id, full_name, usn, department, year, email, phone, is_active, is_approved, college_id, created_at
     FROM students ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const cnt = await query(`SELECT COUNT(*) FROM students ${where}`, countParams);

  return {
    students: r.rows,
    total:    parseInt(cnt.rows[0].count),
    page, limit,
    pages:    Math.ceil(parseInt(cnt.rows[0].count) / limit) || 1,
  };
}

async function getStudentProfile(id, collegeId) {
  const [student, applications, mentorships, referrals] = await Promise.all([
    query(
      `SELECT id, full_name, usn, department, year, email, phone, bio, skills, resume_url,
              is_active, is_approved, college_id, created_at
       FROM students
       WHERE id=$1 AND college_id=$2`,
      [id, collegeId]
    ),
    query(
      `SELECT ja.id, ja.status, ja.created_at, o.title, o.company
       FROM job_applications ja
       JOIN opportunities o ON o.id = ja.opportunity_id
       WHERE ja.student_id=$1 AND ja.college_id=$2
       ORDER BY ja.created_at DESC`,
      [id, collegeId]
    ),
    query(
      `SELECT mr.id, UPPER(mr.status) AS status, mr.message, mr.created_at,
              a.full_name AS alumni_name, a.company
       FROM mentorship_requests mr
       JOIN alumni a ON a.id = mr.alumni_id
       WHERE mr.student_id=$1 AND mr.college_id=$2
       ORDER BY mr.created_at DESC`,
      [id, collegeId]
    ),
    query(
      `SELECT rr.id, UPPER(rr.status) AS status, rr.company, rr.job_title, rr.message, rr.created_at,
              a.full_name AS alumni_name
       FROM referral_requests rr
       JOIN alumni a ON a.id = rr.alumni_id
       WHERE rr.student_id=$1 AND rr.college_id=$2
       ORDER BY rr.created_at DESC`,
      [id, collegeId]
    ),
  ]);

  if (!student.rowCount) throw Object.assign(new Error('Student not found'), { status: 404 });

  return {
    ...student.rows[0],
    profile: {
      bio: student.rows[0].bio,
      skills: student.rows[0].skills,
      resume_url: student.rows[0].resume_url,
    },
    applications: applications.rows,
    mentorships: mentorships.rows,
    referrals: referrals.rows,
  };
}

async function deleteStudent(id, collegeId) {
  // Soft-delete preferred — hard delete only if explicitly needed
  const r = await query('DELETE FROM students WHERE id=$1 AND college_id=$2 RETURNING id', [id, collegeId]);
  if (!r.rowCount) throw Object.assign(new Error('Student not found'), { status: 404 });
}

async function approveStudent(id, collegeId) {
  const r = await query(
    'UPDATE students SET is_approved=true, updated_at=NOW() WHERE id=$1 AND college_id=$2 RETURNING id, full_name, email, college_id',
    [id, collegeId]
  );
  if (!r.rowCount) throw Object.assign(new Error('Student not found'), { status: 404 });
  await query(
    `INSERT INTO notifications (user_id, user_type, title, message, type, link, college_id)
     VALUES ($1, 'student', $2, $3, 'approval', $4, $5)`,
    [id, 'Registration Approved', 'Your student account has been approved by admin. You can now log in.', '/student/login', collegeId]
  );
  return r.rows[0];
}

async function rejectStudent(id, collegeId) {
  const r = await query(
    'UPDATE students SET is_approved=false, updated_at=NOW() WHERE id=$1 AND college_id=$2 RETURNING id, full_name, email, college_id',
    [id, collegeId]
  );
  if (!r.rowCount) throw Object.assign(new Error('Student not found'), { status: 404 });
  await query(
    `INSERT INTO notifications (user_id, user_type, title, message, type, college_id)
     VALUES ($1, 'student', $2, $3, 'approval', $4)`,
    [id, 'Registration Pending', 'Your student account approval was updated by admin. Contact admin if you need access.', collegeId]
  );
  return r.rows[0];
}

async function getAlumniList({ page = 1, limit = 20, approved, is_approved, search, company, department, graduation_year, location, mentoring, collegeId } = {}) {
  page  = parseInt(page)  || 1;
  limit = parseInt(limit) || 20;
  const offset = (page - 1) * limit;
  const params = [collegeId];
  const conditions = ['college_id=$1'];

  // approval filter — accept both param names
  const approvalVal = is_approved !== undefined ? is_approved : approved;
  if (approvalVal !== undefined && approvalVal !== '' && approvalVal !== 'all') {
    params.push(approvalVal === 'true' || approvalVal === true);
    conditions.push(`is_approved=$${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(full_name ILIKE $${params.length} OR email ILIKE $${params.length} OR company ILIKE $${params.length})`);
  }
  if (company) {
    params.push(`%${company}%`);
    conditions.push(`company ILIKE $${params.length}`);
  }
  if (department) {
    params.push(department);
    conditions.push(`department=$${params.length}`);
  }
  if (graduation_year) {
    params.push(parseInt(graduation_year));
    conditions.push(`graduation_year=$${params.length}`);
  }
  if (location) {
    params.push(`%${location}%`);
    conditions.push(`location ILIKE $${params.length}`);
  }
  if (mentoring === 'true' || mentoring === true) {
    conditions.push(`available_mentorship=true`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countParams = [...params];

  params.push(limit, offset);
  const r = await query(
    `SELECT id, full_name, email, company, designation, location,
            graduation_year, graduation_year AS batch, department, is_approved,
            available_mentorship, college_id, created_at
     FROM alumni ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const cnt = await query(`SELECT COUNT(*) FROM alumni ${where}`, countParams);

  return {
    alumni: r.rows,
    total:  parseInt(cnt.rows[0].count),
    page, limit,
    pages:  Math.ceil(parseInt(cnt.rows[0].count) / limit) || 1,
  };
}

async function getAlumniProfile(id, collegeId) {
  const [alumni, opportunities, mentorships, referrals, careerTimeline] = await Promise.all([
    query(
      `SELECT id, full_name, email, company, designation, designation AS role, location,
              graduation_year, graduation_year AS batch, department, phone, bio,
              linkedin_url AS linkedin, is_active, is_approved, available_mentorship,
              available_referral, college_id, created_at
       FROM alumni
       WHERE id=$1 AND college_id=$2`,
      [id, collegeId]
    ),
    query(
      `SELECT id, title, company, location, job_type, created_at
       FROM opportunities
       WHERE alumni_id=$1 AND college_id=$2
       ORDER BY created_at DESC`,
      [id, collegeId]
    ),
    query(
      `SELECT mr.id, UPPER(mr.status) AS status, mr.created_at,
              s.full_name AS student_name, s.department, s.year
       FROM mentorship_requests mr
       JOIN students s ON s.id = mr.student_id
       WHERE mr.alumni_id=$1 AND mr.college_id=$2
       ORDER BY mr.created_at DESC`,
      [id, collegeId]
    ),
    query(
      `SELECT rr.id, UPPER(rr.status) AS status, rr.created_at,
              s.full_name AS student_name, rr.company, rr.job_title
       FROM referral_requests rr
       JOIN students s ON s.id = rr.student_id
       WHERE rr.alumni_id=$1 AND rr.college_id=$2
       ORDER BY rr.created_at DESC`,
      [id, collegeId]
    ),
    query(
      `SELECT id, company, role, start_date, end_date, is_current, created_at
       FROM career_timeline WHERE alumni_id=$1 AND college_id=$2
       ORDER BY COALESCE(start_date,'1900-01-01') DESC`,
      [id, collegeId]
    ),
  ]);

  if (!alumni.rowCount) throw Object.assign(new Error('Alumni not found'), { status: 404 });

  return {
    ...alumni.rows[0],
    opportunities: opportunities.rows,
    mentorships: mentorships.rows,
    referrals: referrals.rows,
    careerTimeline: careerTimeline.rows,
  };
}

async function approveAlumni(id, collegeId) {
  // FIX: Update both status column and is_approved boolean for compatibility
  const r = await query(
    "UPDATE alumni SET is_approved=true, status='approved', updated_at=NOW() WHERE id=$1 AND college_id=$2 RETURNING id, full_name, email, college_id",
    [id, collegeId]
  );
  if (!r.rowCount) throw Object.assign(new Error('Alumni not found'), { status: 404 });
  await query(
    `INSERT INTO notifications (user_id, user_type, title, message, type, link, college_id)
     VALUES ($1, 'alumni', $2, $3, 'approval', $4, $5)`,
    [id, 'Registration Approved', 'Your alumni account has been approved by admin. You can now log in.', '/alumni/login', collegeId]
  );
  return r.rows[0];
}

async function rejectAlumni(id, collegeId) {
  // FIX: Update both status column and is_approved boolean for compatibility
  const r = await query(
    "UPDATE alumni SET is_approved=false, status='rejected', updated_at=NOW() WHERE id=$1 AND college_id=$2 RETURNING id, full_name, email, college_id",
    [id, collegeId]
  );
  if (!r.rowCount) throw Object.assign(new Error('Alumni not found'), { status: 404 });
  await query(
    `INSERT INTO notifications (user_id, user_type, title, message, type, college_id)
     VALUES ($1, 'alumni', $2, $3, 'approval', $4)`,
    [id, 'Registration Rejected', 'Your alumni account registration has been rejected by admin. Contact admin for more information.', collegeId]
  );
  return r.rows[0];
}

async function deleteAlumni(id, collegeId) {
  const r = await query('DELETE FROM alumni WHERE id=$1 AND college_id=$2 RETURNING id', [id, collegeId]);
  if (!r.rowCount) throw Object.assign(new Error('Alumni not found'), { status: 404 });
}

async function createEvent({ title, description, event_date, time_slot, location, event_type, max_capacity, organizer, speaker, adminId, collegeId }) {
  if (!title || !event_date) throw Object.assign(new Error('Title and event date are required'), { status: 400 });
  const r = await query(
    `INSERT INTO events (admin_id, college_id, title, description, event_date, time_slot, location, event_type, max_capacity, organizer, speaker, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [adminId, collegeId, title, description, event_date, time_slot || null, location, event_type || 'General',
     max_capacity || null, organizer || 'Admin', speaker || null, 'upcoming']
  );
  return r.rows[0];
}

async function updateEvent(id, fields, collegeId) {
  // FIX: Include all updatable fields — speaker, banner_url, time_slot, organizer
  const { title, description, event_date, location, event_type, max_capacity, status, speaker, banner_url, time_slot, organizer } = fields;
  const r = await query(
    `UPDATE events SET
      title        = COALESCE($1, title),
      description  = COALESCE($2, description),
      event_date   = COALESCE($3, event_date),
      location     = COALESCE($4, location),
      event_type   = COALESCE($5, event_type),
      max_capacity = COALESCE($6, max_capacity),
      status       = COALESCE($7, status),
      speaker      = COALESCE($8, speaker),
      banner_url   = COALESCE($9, banner_url),
      time_slot    = COALESCE($10, time_slot),
      organizer    = COALESCE($11, organizer),
      updated_at   = NOW()
     WHERE id=$12 AND college_id=$13 RETURNING *`,
    [title, description, event_date, location, event_type, max_capacity, status, speaker, banner_url, time_slot, organizer, id, collegeId]
  );
  if (!r.rowCount) throw Object.assign(new Error('Event not found'), { status: 404 });
  return r.rows[0];
}

async function deleteEvent(id, collegeId) {
  const r = await query('DELETE FROM events WHERE id=$1 AND college_id=$2 RETURNING id', [id, collegeId]);
  if (!r.rowCount) throw Object.assign(new Error('Event not found'), { status: 404 });
}

async function getOpportunities({ page = 1, limit = 20, status, company, location, search, role, collegeId } = {}) {
  page  = parseInt(page)  || 1;
  limit = parseInt(limit) || 20;
  const offset = (page - 1) * limit;
  const conditions = ['o.college_id = $1'];
  const params = [collegeId];

  if (status && status !== 'all') {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }
  if (company) {
    params.push(`%${company}%`);
    conditions.push(`o.company ILIKE $${params.length}`);
  }
  if (location) {
    params.push(`%${location}%`);
    conditions.push(`o.location ILIKE $${params.length}`);
  }
  if (role) {
    params.push(`%${role}%`);
    conditions.push(`o.title ILIKE $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(o.title ILIKE $${params.length} OR o.company ILIKE $${params.length} OR o.description ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countParams = [...params];

  params.push(limit, offset);
  const r = await query(
    `SELECT o.*, a.full_name AS alumni_name
     FROM opportunities o
     LEFT JOIN alumni a ON a.id = o.alumni_id
     ${where}
     ORDER BY o.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const cnt = await query(`SELECT COUNT(*) FROM opportunities o ${where}`, countParams);

  return {
    opportunities: r.rows,
    total: parseInt(cnt.rows[0].count),
    page, limit,
    pages: Math.ceil(parseInt(cnt.rows[0].count) / limit) || 1,
  };
}

async function updateOpportunityStatus(id, status, collegeId) {
  const allowed = ['active', 'closed', 'pending'];
  if (!allowed.includes(status)) {
    throw Object.assign(new Error(`Status must be one of: ${allowed.join(', ')}`), { status: 400 });
  }
  const r = await query(
    'UPDATE opportunities SET status=$1, updated_at=NOW() WHERE id=$2 AND college_id=$3 RETURNING id, title, status',
    [status, id, collegeId]
  );
  if (!r.rowCount) throw Object.assign(new Error('Opportunity not found'), { status: 404 });
  return r.rows[0];
}

/**
 * getReports — FIX: original referenced byDept, byBatch, topAlumni, monthlyApps
 * but the query only returned monthly_students etc. Realigned to what frontend expects.
 */
async function getReports(collegeId) {
  const [monthlyStudents, monthlyAlumni, topCompanies, appsByMonth, byDept, byBatch] = await Promise.all([
    query(`
      SELECT TO_CHAR(created_at, 'Mon YYYY') AS month, COUNT(*) AS count
      FROM students
      WHERE college_id = $1
      GROUP BY month, DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) DESC LIMIT 12
    `, [collegeId]),
    query(`
      SELECT TO_CHAR(created_at, 'Mon YYYY') AS month, COUNT(*) AS count
      FROM alumni
      WHERE college_id = $1
      GROUP BY month, DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) DESC LIMIT 12
    `, [collegeId]),
    query(`
      SELECT company, COUNT(*) AS alumni_count
      FROM alumni WHERE college_id = $1 AND company IS NOT NULL
      GROUP BY company ORDER BY alumni_count DESC LIMIT 10
    `, [collegeId]),
    query(`
      SELECT TO_CHAR(ja.created_at, 'Mon YYYY') AS month, COUNT(*) AS count
      FROM job_applications ja
      WHERE ja.college_id = $1
      GROUP BY month, DATE_TRUNC('month', ja.created_at)
      ORDER BY DATE_TRUNC('month', ja.created_at) DESC LIMIT 12
    `, [collegeId]),
    query(`
      SELECT department, COUNT(*) AS count
      FROM students WHERE college_id = $1 AND department IS NOT NULL
      GROUP BY department ORDER BY count DESC
    `, [collegeId]),
    query(`
      SELECT graduation_year AS batch, COUNT(*) AS count
      FROM alumni WHERE college_id = $1 AND graduation_year IS NOT NULL
      GROUP BY graduation_year ORDER BY graduation_year DESC LIMIT 10
    `, [collegeId]),
  ]);

  // Counts for mini stat cards on reports page
  const [totalStudents, totalAlumni, totalJobs] = await Promise.all([
    query('SELECT COUNT(*) AS count FROM students WHERE college_id=$1', [collegeId]),
    query('SELECT COUNT(*) AS count FROM alumni WHERE college_id=$1 AND is_approved=true', [collegeId]),
    query('SELECT COUNT(*) AS count FROM opportunities WHERE college_id=$1', [collegeId]),
  ]);

  return {
    monthly_students:     monthlyStudents.rows,
    monthly_alumni:       monthlyAlumni.rows,
    top_companies:        topCompanies.rows,
    applications_by_month: appsByMonth.rows,
    byDept:               byDept.rows,
    byBatch:              byBatch.rows,
    // For mini stat cards
    totalStudents:  parseInt(totalStudents.rows[0].count),
    totalAlumni:    parseInt(totalAlumni.rows[0].count),
    jobPostings:    parseInt(totalJobs.rows[0].count),
    engagementRate: 0, // placeholder — compute from real data as needed
  };
}

async function getMentorshipRequests({ page = 1, limit = 20, status, collegeId } = {}) {
  page  = parseInt(page)  || 1;
  limit = parseInt(limit) || 20;
  const offset = (page - 1) * limit;
  const params = [collegeId];
  let where = 'WHERE mr.college_id=$1';

  if (status) {
    params.push(status);
    where += ` AND mr.status=$${params.length}`;
  }

  params.push(limit, offset);
  const r = await query(
    `SELECT mr.*, s.full_name AS student_name, s.email AS student_email,
            a.full_name AS alumni_name, a.company
     FROM mentorship_requests mr
     JOIN students s ON s.id = mr.student_id
     JOIN alumni   a ON a.id = mr.alumni_id
     ${where}
     ORDER BY mr.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countParams = status ? [collegeId, status] : [collegeId];
  const cnt = await query(`SELECT COUNT(*) FROM mentorship_requests mr ${where}`, countParams);

  return {
    requests: r.rows,
    total:    parseInt(cnt.rows[0].count),
    page, limit,
    pages:    Math.ceil(parseInt(cnt.rows[0].count) / limit) || 1,
  };
}

async function getReferralRequests({ page = 1, limit = 20, status, collegeId } = {}) {
  page  = parseInt(page)  || 1;
  limit = parseInt(limit) || 20;
  const offset = (page - 1) * limit;
  const params = [collegeId];
  let where = 'WHERE rr.college_id=$1';

  if (status) {
    params.push(status);
    where += ` AND rr.status=$${params.length}`;
  }

  params.push(limit, offset);
  const r = await query(
    `SELECT rr.*, s.full_name AS student_name, s.email AS student_email,
            a.full_name AS alumni_name, a.company AS alumni_company
     FROM referral_requests rr
     JOIN students s ON s.id = rr.student_id
     JOIN alumni   a ON a.id = rr.alumni_id
     ${where}
     ORDER BY rr.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countParams = status ? [collegeId, status] : [collegeId];
  const cnt = await query(`SELECT COUNT(*) FROM referral_requests rr ${where}`, countParams);

  return {
    requests: r.rows,
    total:    parseInt(cnt.rows[0].count),
    page, limit,
    pages:    Math.ceil(parseInt(cnt.rows[0].count) / limit) || 1,
  };
}

async function createAlumni({ fullName, email, password, company, designation, location, graduationYear, department, phone, college_id }) {
  const bcrypt = require('bcryptjs');
  const collegeId = normalizeCollegeId(college_id) || getDefaultCollegeId();
  await assertCollegeExists(collegeId);
  if (!fullName || !email || !password) {
    throw Object.assign(new Error('Full name, email, and password are required'), { status: 400 });
  }
  const existing = await query('SELECT id FROM alumni WHERE email=$1', [email]);
  if (existing.rowCount > 0) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }
  const hash = await bcrypt.hash(password, 12);
  const r = await query(
    `INSERT INTO alumni (full_name, email, password_hash, company, designation, location, graduation_year, department, phone, is_approved, status, college_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, true, 'approved', $10)
     RETURNING id, full_name, email, college_id, is_approved, status, created_at`,
    [fullName, email, hash, company || null, designation || null, location || null,
     graduationYear ? parseInt(graduationYear) : null, department || null, phone || null, collegeId]
  );
  return r.rows[0];
}

async function deleteReferral(id, collegeId) {
  await query('DELETE FROM referral_requests WHERE id=$1 AND college_id=$2', [id, collegeId]);
}

async function deleteMentorship(id, collegeId) {
  await query('DELETE FROM mentorship_requests WHERE id=$1 AND college_id=$2', [id, collegeId]);
}

// ── ANNOUNCEMENTS ────────────────────────────────────────────────────────────
async function createAnnouncement({
  title,
  description,
  adminId,
  postedBy,
  targetRole,
  collegeId,
  scope = 'college',
  target_colleges = [],
  target_departments = [],
  target_batches = [],
}) {
  if (!title || !description) throw Object.assign(new Error('Title and description are required'), { status: 400 });
  const normalizedScope = ['college', 'global', 'targeted'].includes(scope) ? scope : 'college';
  const normalizedTargetColleges = Array.isArray(target_colleges)
    ? [...new Set(target_colleges.map(v => String(v).trim().toLowerCase()).filter(Boolean))]
    : [];
  const normalizedTargetDepartments = Array.isArray(target_departments)
    ? [...new Set(target_departments.map(v => String(v).trim()).filter(Boolean))]
    : [];
  const normalizedTargetBatches = Array.isArray(target_batches)
    ? [...new Set(target_batches.map(v => parseInt(v, 10)).filter(v => !isNaN(v)))]
    : [];
  if (normalizedScope === 'targeted') {
    await Promise.all(normalizedTargetColleges.map((id) => assertCollegeExists(id)));
  }
  const r = await query(
    `INSERT INTO announcements (admin_id, college_id, title, description, posted_by, target_role, is_global, target_colleges, target_departments, target_batches)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9::text[], $10::int[])
     RETURNING *`,
    [
      adminId || null,
      collegeId,
      title,
      description,
      postedBy || 'Admin',
      targetRole || 'all',
      normalizedScope === 'global',
      normalizedScope === 'targeted' ? normalizedTargetColleges : [],
      normalizedScope === 'targeted' ? normalizedTargetDepartments : [],
      normalizedScope === 'targeted' ? normalizedTargetBatches : [],
    ]
  );
  return r.rows[0];
}

async function getAnnouncements({ page = 1, limit = 20, targetRole, collegeId, department, batch } = {}) {
  page  = parseInt(page)  || 1;
  limit = parseInt(limit) || 20;
  const offset = (page - 1) * limit;
  const params = [collegeId];
  let where = `WHERE (
    college_id=$1
    OR is_global=true
    OR $1 = ANY(COALESCE(target_colleges, '{}'::text[]))
  )`;
  if (targetRole && targetRole !== 'all') {
    params.push(targetRole);
    where += ` AND (target_role=$${params.length} OR target_role='all')`;
  }
  if (department) {
    params.push(department);
    where += ` AND (
      COALESCE(array_length(target_departments, 1), 0) = 0
      OR $${params.length} = ANY(target_departments)
    )`;
  }
  if (batch) {
    params.push(parseInt(batch, 10));
    where += ` AND (
      COALESCE(array_length(target_batches, 1), 0) = 0
      OR $${params.length} = ANY(target_batches)
    )`;
  }
  params.push(limit, offset);
  const r = await query(
    `SELECT id, title, description, posted_by, target_role, is_global, target_colleges, target_departments, target_batches, created_at
     FROM announcements ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const countParams = params.slice(0, params.length - 2);
  const cnt = await query(`SELECT COUNT(*) FROM announcements ${where}`, countParams);
  return { announcements: r.rows, total: parseInt(cnt.rows[0].count), page, limit };
}

async function deleteAnnouncement(id, collegeId) {
  const r = await query('DELETE FROM announcements WHERE id=$1 AND college_id=$2 RETURNING id', [id, collegeId]);
  if (!r.rowCount) throw Object.assign(new Error('Announcement not found'), { status: 404 });
}

// ── PENDING ALUMNI LIST ──────────────────────────────────────────────────────
async function getPendingAlumni({ page = 1, limit = 20, collegeId } = {}) {
  page  = parseInt(page)  || 1;
  limit = parseInt(limit) || 20;
  const offset = (page - 1) * limit;
  // FIX: Filter by status='pending' (primary) OR is_approved=false as fallback
  const r = await query(
    `SELECT id, full_name, email, company, designation, graduation_year, department, phone, status, created_at
     FROM alumni WHERE college_id=$1 AND (status='pending' OR (status IS NULL AND is_approved=false))
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [collegeId, limit, offset]
  );
  const cnt = await query(`SELECT COUNT(*) FROM alumni WHERE college_id=$1 AND (status='pending' OR (status IS NULL AND is_approved=false))`, [collegeId]);
  return { alumni: r.rows, total: parseInt(cnt.rows[0].count), page, limit };
}

// ── CAREER TIMELINE ──────────────────────────────────────────────────────────
async function addCareerEntry({ alumniId, company, role, startDate, endDate, isCurrent, collegeId }) {
  if (!alumniId || !company || !role) throw Object.assign(new Error('alumni_id, company and role are required'), { status: 400 });
  if (isCurrent) {
    await query('UPDATE career_timeline SET is_current=false WHERE alumni_id=$1 AND college_id=$2', [alumniId, collegeId]);
  }
  const r = await query(
    `INSERT INTO career_timeline (alumni_id, college_id, company, role, start_date, end_date, is_current)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [alumniId, collegeId, company, role, startDate || null, endDate || null, !!isCurrent]
  );
  return r.rows[0];
}

async function getCareerTimeline(alumniId, collegeId) {
  const r = await query(
    `SELECT id, company, role, start_date, end_date, is_current, created_at
     FROM career_timeline WHERE alumni_id=$1 AND college_id=$2 ORDER BY COALESCE(start_date,'1900-01-01') DESC`,
    [alumniId, collegeId]
  );
  return r.rows;
}

module.exports = {
  loginAdmin, getDashboard,
  getStudents, getStudentProfile, approveStudent, rejectStudent, deleteStudent,
  getAlumniList, getAlumniProfile, approveAlumni, rejectAlumni, deleteAlumni, createAlumni,
  getPendingAlumni,
  createEvent, updateEvent, deleteEvent,
  getOpportunities, updateOpportunityStatus,
  getReports,
  getMentorshipRequests, getReferralRequests,
  deleteReferral, deleteMentorship,
  createAnnouncement, getAnnouncements, deleteAnnouncement,
  addCareerEntry, getCareerTimeline,
};
