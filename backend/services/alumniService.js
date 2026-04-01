'use strict';
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { signToken } = require('../utils/jwt');
const {
  assertCollegeExists,
  getDefaultCollegeId,
  normalizeCollegeId,
} = require('./tenantService');

const SALT_ROUNDS = 12;

async function registerAlumni({ fullName, email, password, company, designation, location, graduationYear, department, phone, college_id }) {
  const collegeId = normalizeCollegeId(college_id) || getDefaultCollegeId();
  await assertCollegeExists(collegeId);
  const existing = await query('SELECT id FROM alumni WHERE email=$1', [email]);
  if (existing.rowCount > 0) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const r = await query(
    `INSERT INTO alumni (full_name, email, password_hash, company, designation, location, graduation_year, department, phone, is_approved, status, college_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, false, 'pending', $10)
     RETURNING id, full_name, email, college_id, is_approved, status, created_at`,
    [fullName, email, hash, company, designation, location, graduationYear, department, phone, collegeId]
  );
  return r.rows[0];
}

async function loginAlumni({ email, password, college_id }) {
  const collegeId = normalizeCollegeId(college_id);
  const params = [email];
  let sql = 'SELECT id, full_name, email, college_id, password_hash::TEXT AS password_hash, is_approved, is_active, status FROM alumni WHERE email=$1';
  if (collegeId) {
    params.push(collegeId);
    sql += ' AND college_id=$2';
  }
  const r = await query(sql, params);
  const alumni = r.rows[0];

  if (!alumni) {
    await bcrypt.compare(password, '$2a$12$notarealhashjustpadding00000000000000000000000');
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  if (!alumni.is_active) {
    throw Object.assign(new Error('Account has been deactivated. Contact admin.'), { status: 403 });
  }

  const valid = await bcrypt.compare(password, alumni.password_hash);
  if (!valid) throw Object.assign(new Error('Invalid email or password'), { status: 401 });

  const approvalStatus = alumni.status || (alumni.is_approved ? 'approved' : 'pending');
  if (approvalStatus === 'rejected') {
    throw Object.assign(new Error('Your account registration has been rejected. Please contact admin.'), { status: 403 });
  }
  if (approvalStatus !== 'approved') {
    throw Object.assign(new Error('Your account is pending admin approval. You will be notified once approved.'), { status: 403 });
  }

  const token = signToken({ id: alumni.id, role: 'alumni', email: alumni.email, college_id: alumni.college_id });
  return {
    token,
    user: { id: alumni.id, full_name: alumni.full_name, email: alumni.email, role: 'alumni', college_id: alumni.college_id },
  };
}

async function getDashboard(alumniId, collegeId) {
  const [profile, opps, mentorship, referrals, notifications] = await Promise.all([
    query('SELECT id, full_name, email, company, designation, location, college_id FROM alumni WHERE id=$1 AND college_id=$2', [alumniId, collegeId]),
    query('SELECT COUNT(*) AS count FROM opportunities WHERE alumni_id=$1 AND college_id=$2', [alumniId, collegeId]),
    query(`SELECT COUNT(*) AS count FROM mentorship_requests WHERE alumni_id=$1 AND college_id=$2 AND status='pending'`, [alumniId, collegeId]),
    query(`SELECT COUNT(*) AS count FROM referral_requests   WHERE alumni_id=$1 AND college_id=$2 AND status='pending'`, [alumniId, collegeId]),
    query(`SELECT COUNT(*) AS count FROM notifications WHERE user_id=$1 AND user_type='alumni' AND college_id=$2 AND is_read=false`, [alumniId, collegeId]),
  ]);

  if (!profile.rowCount) throw Object.assign(new Error('Alumni not found'), { status: 404 });

  const posted_opportunities = parseInt(opps.rows[0].count);
  const pending_mentorship   = parseInt(mentorship.rows[0].count);
  const pending_referrals    = parseInt(referrals.rows[0].count);
  const unread_notifications = parseInt(notifications.rows[0].count);

  return {
    profile: profile.rows[0],
    stats: { posted_opportunities, pending_mentorship, pending_referrals, unread_notifications },
    my_opportunities:      posted_opportunities,
    pending_mentorship,
    pending_referrals,
    unread_notifications,
    unread_messages:       unread_notifications,
    total_connections:     0,
    total_students_helped: pending_mentorship + pending_referrals,
  };
}

async function getProfile(alumniId, collegeId) {
  let r;
  try {
    r = await query(
      `SELECT id, full_name, email, company, designation, location, graduation_year,
              department, phone, bio, linkedin_url, github_url, headline, profile_photo,
              available_mentorship, available_referral, skills, profile_links, college_id, created_at
       FROM alumni WHERE id=$1 AND college_id=$2`,
      [alumniId, collegeId]
    );
  } catch (e) {
    if (e.message && e.message.includes('profile_links')) {
      r = await query(
        `SELECT id, full_name, email, company, designation, location, graduation_year,
                department, phone, bio, linkedin_url, github_url, headline, profile_photo,
                available_mentorship, available_referral, skills, college_id, created_at
         FROM alumni WHERE id=$1 AND college_id=$2`,
        [alumniId, collegeId]
      );
    } else { throw e; }
  }
  if (!r.rowCount) throw Object.assign(new Error('Alumni not found'), { status: 404 });
  const row = r.rows[0];
  if (!Array.isArray(row.profile_links)) row.profile_links = [];
  return row;
}

async function updateProfile(alumniId, collegeId, { full_name, company, designation, location, phone, bio, linkedin_url, github_url, headline, available_mentorship, available_referral, skills, department, graduation_year, profile_links }) {
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
      `UPDATE alumni SET
        full_name            = COALESCE($1, full_name),
        company              = COALESCE($2, company),
        designation          = COALESCE($3, designation),
        location             = COALESCE($4, location),
        phone                = COALESCE($5, phone),
        bio                  = COALESCE($6, bio),
        linkedin_url         = COALESCE($7, linkedin_url),
        github_url           = COALESCE($8, github_url),
        headline             = COALESCE($9, headline),
        available_mentorship = COALESCE($10, available_mentorship),
        available_referral   = COALESCE($11, available_referral),
        skills               = COALESCE($12, skills),
        department           = COALESCE($13, department),
        graduation_year      = COALESCE($14, graduation_year),
        profile_links        = COALESCE($15::jsonb, profile_links)
       WHERE id=$16 AND college_id=$17
       RETURNING id, full_name, email, company, designation, location, graduation_year,
                 department, phone, bio, linkedin_url, github_url, headline,
                 available_mentorship, available_referral, skills, profile_links, college_id`,
      [full_name||null, company||null, designation||null, location||null, phone||null,
       bio||null, linkedin_url||null, github_url||null, headline||null,
       available_mentorship!=null ? available_mentorship : null,
       available_referral!=null   ? available_referral   : null,
       skills||null, department||null, graduation_year||null,
       linksJson, alumniId, collegeId]
    );
  } catch (e) {
    if (e.message && e.message.includes('profile_links')) {
      r = await query(
        `UPDATE alumni SET
          full_name            = COALESCE($1, full_name),
          company              = COALESCE($2, company),
          designation          = COALESCE($3, designation),
          location             = COALESCE($4, location),
          phone                = COALESCE($5, phone),
          bio                  = COALESCE($6, bio),
          linkedin_url         = COALESCE($7, linkedin_url),
          github_url           = COALESCE($8, github_url),
          headline             = COALESCE($9, headline),
          available_mentorship = COALESCE($10, available_mentorship),
          available_referral   = COALESCE($11, available_referral),
          skills               = COALESCE($12, skills),
          department           = COALESCE($13, department),
          graduation_year      = COALESCE($14, graduation_year)
         WHERE id=$15 AND college_id=$16
         RETURNING id, full_name, email, company, designation, location, graduation_year,
                   department, phone, bio, linkedin_url, github_url, headline,
                   available_mentorship, available_referral, skills, college_id`,
        [full_name||null, company||null, designation||null, location||null, phone||null,
         bio||null, linkedin_url||null, github_url||null, headline||null,
         available_mentorship!=null ? available_mentorship : null,
         available_referral!=null   ? available_referral   : null,
         skills||null, department||null, graduation_year||null,
         alumniId, collegeId]
      );
    } else { throw e; }
  }
  if (!r.rowCount) throw Object.assign(new Error('Alumni not found'), { status: 404 });
  const row = r.rows[0];
  if (!Array.isArray(row.profile_links)) row.profile_links = [];
  return row;
}

/**
 * listAlumni — Enhanced search supporting:
 * name, email, skills, company, department, batch (graduation_year), course, searchField
 * Also supports all_colleges scope (no college_id restriction).
 */
async function listAlumni({ page = 1, limit = 12, search, searchField, department, company, batch, course, skills, sort_by = 'full_name', collegeId, scope = 'my_college' } = {}) {
  const offset = (page - 1) * limit;
  const conditions = ['a.is_approved = true', 'a.is_active = true'];
  const params = [];

  // College scope
  if (scope !== 'all_colleges') {
    params.push(collegeId);
    conditions.push(`a.college_id = $${params.length}`);
  }

  if (search) {
    const like = `%${search}%`;
    // If a specific field is requested, search only that field
    if (searchField && searchField !== 'all') {
      const fieldMap = {
        name:       'a.full_name',
        batch:      null, // handled below with cast
        branch:     'a.department',
        department: 'a.department',
        company:    'a.company',
        position:   'a.designation',
        skills:     'a.skills',
        college:    'a.college_id',
      };
      if (searchField === 'batch') {
        params.push(like);
        conditions.push(`CAST(a.graduation_year AS TEXT) ILIKE $${params.length}`);
      } else if (fieldMap[searchField]) {
        params.push(like);
        conditions.push(`${fieldMap[searchField]} ILIKE $${params.length}`);
      } else {
        // fallback: full text
        params.push(like, like, like, like, like, like);
        const n = params.length;
        conditions.push(`(a.full_name ILIKE $${n-5} OR a.email ILIKE $${n-4} OR a.skills ILIKE $${n-3} OR a.company ILIKE $${n-2} OR a.department ILIKE $${n-1} OR CAST(a.graduation_year AS TEXT) ILIKE $${n})`);
      }
    } else {
      // Full-text: name, email, skills, company, department, batch, designation, college
      params.push(like, like, like, like, like, like, like);
      const n = params.length;
      conditions.push(
        `(a.full_name ILIKE $${n-6} OR a.email ILIKE $${n-5} OR a.skills ILIKE $${n-4} OR a.company ILIKE $${n-3} OR a.department ILIKE $${n-2} OR a.designation ILIKE $${n-1} OR CAST(a.graduation_year AS TEXT) ILIKE $${n})`
      );
    }
  }

  if (department) {
    params.push(department);
    conditions.push(`a.department = $${params.length}`);
  }

  if (company) {
    params.push(company);
    conditions.push(`a.company = $${params.length}`);
  }

  if (batch) {
    params.push(parseInt(batch, 10));
    conditions.push(`a.graduation_year = $${params.length}`);
  }

  if (course) {
    params.push(`%${course}%`);
    conditions.push(`a.department ILIKE $${params.length}`);
  }

  if (skills) {
    params.push(`%${skills}%`);
    conditions.push(`a.skills ILIKE $${params.length}`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  // Sort: support 'latest', 'oldest', 'most_connected', and legacy field names
  let orderClause;
  if (sort_by === 'latest')         orderClause = 'a.created_at DESC';
  else if (sort_by === 'oldest')    orderClause = 'a.created_at ASC';
  else if (sort_by === 'most_connected') orderClause = 'a.full_name ASC'; // fallback; real count needs subquery
  else {
    const ALLOWED = ['full_name', 'company', 'graduation_year', 'designation', 'created_at'];
    orderClause = `a.${ALLOWED.includes(sort_by) ? sort_by : 'full_name'} ASC`;
  }

  const countParams = [...params];
  const totalResult = await query(
    `SELECT COUNT(*) FROM alumni a ${where}`,
    countParams
  );

  params.push(limit, offset);
  const dataResult = await query(
    `SELECT a.id, a.full_name, a.email, a.company, a.designation, a.location,
            a.graduation_year, a.department, a.bio, a.college_id,
            a.available_mentorship, a.available_referral, a.skills, a.linkedin_url
     FROM alumni a
     ${where}
     ORDER BY ${orderClause}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    alumni: dataResult.rows,
    total:  parseInt(totalResult.rows[0].count),
    page:   parseInt(page),
    limit:  parseInt(limit),
    pages:  Math.ceil(parseInt(totalResult.rows[0].count) / limit) || 1,
  };
}

async function getAlumniById(id, collegeId) {
  const r = await query(
    `SELECT id, full_name, email, company, designation, location,
            graduation_year, department, bio, linkedin_url, college_id,
            available_mentorship, available_referral, skills
     FROM alumni WHERE id=$1 AND college_id=$2 AND is_approved=true AND is_active=true`,
    [id, collegeId]
  );
  if (!r.rowCount) throw Object.assign(new Error('Alumni not found'), { status: 404 });
  return r.rows[0];
}

/**
 * getFilterOptions — Returns distinct values for use in the All Filters panel.
 * Supports both my_college and all_colleges scope.
 */
async function getFilterOptions(collegeId, scope = 'my_college') {
  let depts, companies, batches, skills;
  if (scope === 'all_colleges') {
    [depts, companies, batches] = await Promise.all([
      query('SELECT DISTINCT department FROM alumni WHERE is_approved=true AND department IS NOT NULL ORDER BY department'),
      query('SELECT DISTINCT company FROM alumni WHERE is_approved=true AND company IS NOT NULL ORDER BY company'),
      query('SELECT DISTINCT graduation_year AS batch FROM alumni WHERE is_approved=true AND graduation_year IS NOT NULL ORDER BY graduation_year DESC'),
    ]);
  } else {
    [depts, companies, batches] = await Promise.all([
      query('SELECT DISTINCT department FROM alumni WHERE college_id=$1 AND is_approved=true AND department IS NOT NULL ORDER BY department', [collegeId]),
      query('SELECT DISTINCT company FROM alumni WHERE college_id=$1 AND is_approved=true AND company IS NOT NULL ORDER BY company', [collegeId]),
      query('SELECT DISTINCT graduation_year AS batch FROM alumni WHERE college_id=$1 AND is_approved=true AND graduation_year IS NOT NULL ORDER BY graduation_year DESC', [collegeId]),
    ]);
  }
  return {
    departments: depts.rows.map(r => r.department),
    companies:   companies.rows.map(r => r.company),
    batches:     batches.rows.map(r => r.batch),
  };
}

async function getCareerTimeline(alumniId, collegeId) {
  const r = await query(
    `SELECT id, company, role, start_date, end_date, is_current, created_at
     FROM career_timeline WHERE alumni_id=$1 AND college_id=$2
     ORDER BY COALESCE(start_date,'1900-01-01') DESC`,
    [alumniId, collegeId]
  );
  return r.rows;
}

async function addCareerEntry({ alumniId, company, role, startDate, endDate, isCurrent, collegeId }) {
  if (!alumniId || !company || !role) {
    throw Object.assign(new Error('company and role are required'), { status: 400 });
  }
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

// Feature 4: Alumni can browse students — enhanced search
async function listStudents({ page = 1, limit = 12, search, searchField, department, branch, batch, skills, sort, collegeId } = {}) {
  const offset = (page - 1) * limit;
  const conditions = ['s.is_active = true', 's.is_approved = true', 's.college_id = $1'];
  const params = [collegeId];

  if (search) {
    const like = `%${search}%`;
    if (searchField && searchField !== 'all') {
      const fieldMap = {
        name:       's.full_name',
        batch:      null,
        branch:     's.department',
        department: 's.department',
        skills:     's.skills',
      };
      if (searchField === 'batch') {
        params.push(like);
        conditions.push(`CAST(s.year AS TEXT) ILIKE $${params.length}`);
      } else if (fieldMap[searchField]) {
        params.push(like);
        conditions.push(`${fieldMap[searchField]} ILIKE $${params.length}`);
      } else {
        params.push(like, like, like, like, like);
        const n = params.length;
        conditions.push(`(s.full_name ILIKE $${n-4} OR s.email ILIKE $${n-3} OR s.department ILIKE $${n-2} OR s.skills ILIKE $${n-1} OR CAST(s.year AS TEXT) ILIKE $${n})`);
      }
    } else {
      params.push(like, like, like, like, like);
      const n = params.length;
      conditions.push(`(s.full_name ILIKE $${n-4} OR s.email ILIKE $${n-3} OR s.department ILIKE $${n-2} OR s.skills ILIKE $${n-1} OR CAST(s.year AS TEXT) ILIKE $${n})`);
    }
  }

  if (department) {
    params.push(department);
    conditions.push(`s.department = $${params.length}`);
  }
  if (branch) {
    params.push(branch);
    conditions.push(`s.department = $${params.length}`);
  }
  if (batch) {
    params.push(parseInt(batch, 10));
    conditions.push(`s.year = $${params.length}`);
  }
  if (skills) {
    params.push(`%${skills}%`);
    conditions.push(`s.skills ILIKE $${params.length}`);
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  let orderClause;
  if (sort === 'latest')      orderClause = 's.created_at DESC';
  else if (sort === 'oldest') orderClause = 's.created_at ASC';
  else                         orderClause = 's.full_name ASC';

  const countQ = await query(`SELECT COUNT(*) FROM students s ${where}`, params);
  const total = parseInt(countQ.rows[0].count);

  params.push(limit, offset);
  const r = await query(
    `SELECT s.id, s.full_name, s.email, s.department, s.year, s.skills, s.bio, s.headline,
            s.location, s.linkedin_url, s.github_url, s.college_id
     FROM students s
     ${where}
     ORDER BY ${orderClause}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { students: r.rows, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) || 1 };
}

// Feature 7: Education history
async function getEducationHistory(userId, userRole, collegeId) {
  const r = await query(
    `SELECT id, institution, degree, field_of_study, start_year, end_year
     FROM education_history WHERE user_id=$1 AND user_role=$2 AND college_id=$3
     ORDER BY COALESCE(end_year, 9999) DESC, start_year DESC`,
    [userId, userRole, collegeId]
  );
  return r.rows;
}

async function addEducationEntry({ userId, userRole, collegeId, institution, degree, fieldOfStudy, startYear, endYear }) {
  if (!institution) throw Object.assign(new Error('institution is required'), { status: 400 });
  const r = await query(
    `INSERT INTO education_history (user_id, user_role, college_id, institution, degree, field_of_study, start_year, end_year)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [userId, userRole, collegeId, institution, degree || null, fieldOfStudy || null, startYear || null, endYear || null]
  );
  return r.rows[0];
}

async function updateEducationEntry({ entryId, userId, userRole, collegeId, institution, degree, fieldOfStudy, startYear, endYear }) {
  const r = await query(
    `UPDATE education_history SET institution=$1, degree=$2, field_of_study=$3, start_year=$4, end_year=$5
     WHERE id=$6 AND user_id=$7 AND user_role=$8 AND college_id=$9 RETURNING *`,
    [institution, degree || null, fieldOfStudy || null, startYear || null, endYear || null, entryId, userId, userRole, collegeId]
  );
  if (!r.rowCount) throw Object.assign(new Error('Education entry not found'), { status: 404 });
  return r.rows[0];
}

async function deleteEducationEntry(entryId, userId, userRole, collegeId) {
  const r = await query(
    'DELETE FROM education_history WHERE id=$1 AND user_id=$2 AND user_role=$3 AND college_id=$4 RETURNING id',
    [entryId, userId, userRole, collegeId]
  );
  if (!r.rowCount) throw Object.assign(new Error('Education entry not found'), { status: 404 });
  return { deleted: true };
}

module.exports = {
  registerAlumni, loginAlumni, getDashboard, getProfile, updateProfile,
  listAlumni, getAlumniById, getFilterOptions,
  getCareerTimeline, addCareerEntry,
  listStudents,
  getEducationHistory, addEducationEntry, updateEducationEntry, deleteEducationEntry,
};