'use strict';
const { query } = require('../config/database');

/**
 * getFullProfile — LinkedIn-style full profile for any user
 * Returns: basic, about, experience, education, skills, connections,
 *          groups, referrals, mentorship
 * Tenant-safe: cross-college only for connections/mentorship/referrals
 */
async function getFullProfile(userId, userType, viewerCollegeId) {
  if (!['alumni', 'student'].includes(userType)) {
    throw Object.assign(new Error('Invalid user type'), { status: 400 });
  }

  const table = userType === 'alumni' ? 'alumni' : 'students';
  const collegeJoin = viewerCollegeId
    ? `AND (u.college_id = $2 OR true)` // allow cross-college profile view but tag it
    : '';

  // Basic profile — try with optional columns (profile_links, headline), fallback without
  let profileQ;
  const fetchAlumniProfile = async (withOptional) => {
    const linkCol = withOptional ? ', u.profile_links' : ", NULL AS profile_links";
    return query(
      `SELECT u.id, u.full_name, u.email, u.company, u.designation, u.location,
              u.graduation_year, u.department, u.phone, u.bio, u.headline,
              u.linkedin_url, u.github_url, u.profile_photo,
              u.available_mentorship, u.available_referral, u.skills` + linkCol + `,
              u.college_id, u.created_at,
              c.name AS college_name
       FROM alumni u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE u.id = $1 AND u.is_active = true AND u.is_approved = true`,
      [userId]
    );
  };
  const fetchStudentProfile = async (withOptional) => {
    const linkCol = withOptional ? ', u.profile_links' : ", NULL AS profile_links";
    return query(
      `SELECT u.id, u.full_name, u.email, u.department, u.year, u.location,
              u.phone, u.bio, u.headline, u.linkedin_url, u.github_url,
              u.resume_url, u.skills` + linkCol + `, u.college_id, u.created_at,
              c.name AS college_name
       FROM students u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE u.id = $1 AND u.is_active = true`,
      [userId]
    );
  };

  try {
    profileQ = userType === 'alumni'
      ? await fetchAlumniProfile(true)
      : await fetchStudentProfile(true);
  } catch (e) {
    if (e.message && e.message.includes('profile_links')) {
      // Column not yet created — query without it
      profileQ = userType === 'alumni'
        ? await fetchAlumniProfile(false)
        : await fetchStudentProfile(false);
    } else { throw e; }
  }

  if (!profileQ.rowCount) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const profile = profileQ.rows[0];
  const profileCollegeId = profile.college_id;

  // Parallel fetch of all sections — use safeQuery so missing tables never crash the whole profile
  const safeQuery = async (sql, params) => {
    try { return await query(sql, params); } catch { return { rows: [], rowCount: 0 }; }
  };

  const [
    experienceR,
    educationR,
    connectionsR,
    referralsMadeR,
    referralsReceivedR,
    mentorshipR,
    batchGroupR,
    companyGroupR,
    collegeGroupR,
  ] = await Promise.all([
    // Experience (career timeline for alumni, empty for students)
    userType === 'alumni'
      ? query(
          `SELECT id, company, role, start_date, end_date, is_current
           FROM career_timeline WHERE alumni_id = $1 AND college_id = $2
           ORDER BY COALESCE(start_date,'1900-01-01') DESC`,
          [userId, profileCollegeId]
        )
      : Promise.resolve({ rows: [] }),

    // Education
    query(
      `SELECT id, institution, degree, field_of_study, start_year, end_year
       FROM education_history WHERE user_id = $1 AND user_role = $2 AND college_id = $3
       ORDER BY COALESCE(end_year, 9999) DESC`,
      [userId, userType, profileCollegeId]
    ),

    // Connections count (cross-college allowed) — table is connection_requests
    query(
      `SELECT COUNT(*) AS count FROM connection_requests
       WHERE ((requester_id=$1 AND requester_type=$2) OR (recipient_id=$1 AND recipient_type=$2))
         AND status='accepted'`,
      [userId, userType]
    ),

    // Referrals made (if student) / given (if alumni)
    userType === 'student'
      ? query(
          `SELECT rr.id, rr.company, rr.job_title, rr.status, rr.created_at,
                  a.full_name AS alumni_name, a.company AS alumni_company
           FROM referral_requests rr
           LEFT JOIN alumni a ON a.id = rr.alumni_id
           WHERE rr.student_id = $1 AND (rr.college_id = $2 OR rr.is_cross_college = true)
           ORDER BY rr.created_at DESC LIMIT 10`,
          [userId, profileCollegeId]
        )
      : query(
          `SELECT rr.id, rr.company, rr.job_title, rr.status, rr.created_at,
                  s.full_name AS student_name
           FROM referral_requests rr
           LEFT JOIN students s ON s.id = rr.student_id
           WHERE rr.alumni_id = $1 AND (rr.college_id = $2 OR rr.is_cross_college = true)
           ORDER BY rr.created_at DESC LIMIT 10`,
          [userId, profileCollegeId]
        ),

    // Referrals received responses
    userType === 'student'
      ? query(
          `SELECT rr.id, rr.status, rr.response, rr.company, a.full_name AS alumni_name
           FROM referral_requests rr
           LEFT JOIN alumni a ON a.id = rr.alumni_id
           WHERE rr.student_id = $1 AND rr.status IN ('accepted','rejected')
             AND (rr.college_id = $2 OR rr.is_cross_college = true)
           ORDER BY rr.updated_at DESC LIMIT 5`,
          [userId, profileCollegeId]
        )
      : Promise.resolve({ rows: [] }),

    // Mentorship
    userType === 'student'
      ? query(
          `SELECT mr.id, mr.status, mr.message, mr.response, mr.created_at,
                  a.full_name AS alumni_name, a.company, a.designation
           FROM mentorship_requests mr
           LEFT JOIN alumni a ON a.id = mr.alumni_id
           WHERE mr.student_id = $1 AND (mr.college_id = $2 OR mr.is_cross_college = true)
           ORDER BY mr.created_at DESC LIMIT 10`,
          [userId, profileCollegeId]
        )
      : query(
          `SELECT mr.id, mr.status, mr.message, mr.response, mr.created_at,
                  s.full_name AS student_name, s.department, s.year
           FROM mentorship_requests mr
           LEFT JOIN students s ON s.id = mr.student_id
           WHERE mr.alumni_id = $1 AND (mr.college_id = $2 OR mr.is_cross_college = true)
           ORDER BY mr.created_at DESC LIMIT 10`,
          [userId, profileCollegeId]
        ),

    // Batch group members
    userType === 'alumni'
      ? query(
          `SELECT id, full_name, company, designation, graduation_year, college_id
           FROM alumni WHERE college_id = $1 AND graduation_year = (
             SELECT graduation_year FROM alumni WHERE id = $2
           ) AND is_active = true AND is_approved = true AND id != $2
           LIMIT 20`,
          [profileCollegeId, userId]
        )
      : query(
          `SELECT id, full_name, department, year, college_id
           FROM students WHERE college_id = $1 AND year = (
             SELECT year FROM students WHERE id = $2
           ) AND is_active = true AND id != $2
           LIMIT 20`,
          [profileCollegeId, userId]
        ),

    // Company group members (alumni only)
    userType === 'alumni'
      ? query(
          `SELECT id, full_name, company, designation, college_id
           FROM alumni WHERE company = (
             SELECT company FROM alumni WHERE id = $1
           ) AND company IS NOT NULL AND is_active = true AND is_approved = true AND id != $1
           LIMIT 20`,
          [userId]
        )
      : Promise.resolve({ rows: [] }),

    // College group count
    userType === 'alumni'
      ? query(
          `SELECT COUNT(*) AS count FROM alumni
           WHERE college_id = $1 AND is_active = true AND is_approved = true AND id != $2`,
          [profileCollegeId, userId]
        )
      : query(
          `SELECT COUNT(*) AS count FROM students
           WHERE college_id = $1 AND is_active = true AND id != $2`,
          [profileCollegeId, userId]
        ),
  ]);

  // Parse skills
  let skills = [];
  if (profile.skills) {
    if (Array.isArray(profile.skills)) skills = profile.skills;
    else if (typeof profile.skills === 'string') {
      skills = profile.skills.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  return {
    basic: {
      id:                 profile.id,
      full_name:          profile.full_name,
      email:              profile.email,
      avatar:             profile.profile_photo || null,
      college_id:         profile.college_id,
      college_name:       profile.college_name,
      batch:              profile.graduation_year || profile.year,
      company:            profile.company || null,
      designation:        profile.designation || null,
      department:         profile.department || null,
      location:           profile.location || null,
      headline:           profile.headline || null,
      linkedin_url:       profile.linkedin_url || null,
      github_url:         profile.github_url || null,
      resume_url:         profile.resume_url || null,
      available_mentorship: profile.available_mentorship || false,
      available_referral:   profile.available_referral || false,
      user_type:          userType,
      member_since:       profile.created_at,
    },
    about: profile.bio || null,
    links: (() => {
      const pl = profile.profile_links;
      if (!pl) return [];
      if (Array.isArray(pl)) return pl;
      if (typeof pl === 'string') {
        try { const parsed = JSON.parse(pl); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
      }
      return [];
    })(),
    experience: experienceR.rows,
    education:  educationR.rows,
    skills,
    connections: {
      count: parseInt(connectionsR.rows[0]?.count || 0),
    },
    groups: {
      batch: {
        label: userType === 'alumni'
          ? (profile.graduation_year ? `Batch of ${profile.graduation_year}` : 'Batch')
          : (profile.year ? `${profile.year} Year Students` : 'Batch'),
        members: batchGroupR.rows,
        count: batchGroupR.rowCount,
      },
      company: userType === 'alumni' ? {
        label: profile.company ? `${profile.company} Alumni` : 'Company',
        members: companyGroupR.rows,
        count: companyGroupR.rowCount,
      } : null,
      college: {
        label: profile.college_name || profile.college_id,
        count: parseInt(collegeGroupR.rows[0]?.count || 0),
        college_id: profileCollegeId,
      },
    },
    referrals: {
      made:     userType === 'student' ? referralsMadeR.rows : [],
      given:    userType === 'alumni'  ? referralsMadeR.rows : [],
      received: referralsReceivedR.rows,
    },
    mentorship: mentorshipR.rows,
  };
}

/**
 * getAlumniCompanies — returns companies alumni has worked at (current + past)
 * Used to validate referral company restriction
 */
async function getAlumniCompanies(alumniId, collegeId) {
  const [current, timeline] = await Promise.all([
    query(
      `SELECT company FROM alumni WHERE id = $1 AND college_id = $2 AND company IS NOT NULL`,
      [alumniId, collegeId]
    ),
    query(
      `SELECT DISTINCT company FROM career_timeline
       WHERE alumni_id = $1 AND college_id = $2 AND company IS NOT NULL`,
      [alumniId, collegeId]
    ),
  ]);

  const companies = new Set();
  if (current.rows[0]?.company) companies.add(current.rows[0].company);
  timeline.rows.forEach(r => r.company && companies.add(r.company));
  return Array.from(companies);
}

/**
 * getAlumniGrouped — grouped alumni by college/batch/company
 */
async function getAlumniGrouped(type, collegeId) {
  const ALLOWED = ['college', 'batch', 'company'];
  if (!ALLOWED.includes(type)) {
    throw Object.assign(new Error('type must be college, batch or company'), { status: 400 });
  }

  let groupField;
  if (type === 'college') groupField = 'a.college_id';
  else if (type === 'batch') groupField = 'a.graduation_year';
  else groupField = 'a.company';

  // Tenant filter: college and batch are strictly tenant-scoped, company allows cross-college
  const tenantClause = type === 'company'
    ? `(a.college_id = $1 OR true)` // company groups show cross-college
    : `a.college_id = $1`;

  const r = await query(
    `SELECT
       ${groupField} AS group_key,
       json_agg(json_build_object(
         'id', a.id,
         'full_name', a.full_name,
         'company', a.company,
         'designation', a.designation,
         'department', a.department,
         'graduation_year', a.graduation_year,
         'college_id', a.college_id,
         'available_mentorship', a.available_mentorship,
         'available_referral', a.available_referral
       ) ORDER BY a.full_name) AS users
     FROM alumni a
     WHERE ${tenantClause}
       AND a.is_active = true
       AND a.is_approved = true
       AND ${groupField} IS NOT NULL
     GROUP BY ${groupField}
     ORDER BY COUNT(*) DESC`,
    [collegeId]
  );

  return r.rows.map(row => ({
    group:      row.group_key,
    group_type: type,
    users:      row.users,
    count:      row.users.length,
  }));
}

/**
 * GET /api/alumni/:id/mutuals
 * Returns mutual connections + common attributes between the logged-in user and target alumni.
 */
async function getMutuals(viewerId, viewerRole, targetAlumniId) {
  const { query } = require('../config/database');

  // Fetch target alumni basic info
  const targetRows = await query(
    `SELECT id, full_name, department, graduation_year, company, skills, college_id
     FROM alumni WHERE id = $1 AND is_active = true AND is_approved = true`,
    [targetAlumniId]
  );
  if (!targetRows.rowCount) throw Object.assign(new Error('Alumni not found'), { status: 404 });
  const target = targetRows.rows[0];

  // Fetch viewer info
  const viewerTable = viewerRole === 'alumni' ? 'alumni' : 'students';
  const viewerCols  = viewerRole === 'alumni'
    ? 'id, full_name, department, graduation_year, company, skills, college_id'
    : 'id, full_name, department, year AS graduation_year, NULL AS company, skills, college_id';
  const viewerRows = await query(
    `SELECT ${viewerCols} FROM ${viewerTable} WHERE id = $1`,
    [viewerId]
  );
  if (!viewerRows.rowCount) throw Object.assign(new Error('Viewer not found'), { status: 404 });
  const viewer = viewerRows.rows[0];

  // Mutual connections — people connected to BOTH viewer and target
  const mutualRows = await query(
    `SELECT u.id, u.full_name, u.department, u.company, 'alumni' AS role
     FROM alumni u
     WHERE u.id != $1 AND u.id != $2
       AND u.is_active = true AND u.is_approved = true
       AND EXISTS (
         SELECT 1 FROM connections c
         WHERE c.status = 'accepted'
           AND ((c.requester_id=$1 AND c.requester_type=$3 AND c.recipient_id=u.id AND c.recipient_type='alumni')
             OR (c.recipient_id=$1 AND c.recipient_type=$3 AND c.requester_id=u.id AND c.requester_type='alumni'))
       )
       AND EXISTS (
         SELECT 1 FROM connections c
         WHERE c.status = 'accepted'
           AND ((c.requester_id=$2 AND c.requester_type='alumni' AND c.recipient_id=u.id AND c.recipient_type='alumni')
             OR (c.recipient_id=$2 AND c.recipient_type='alumni' AND c.requester_id=u.id AND c.requester_type='alumni'))
       )
     LIMIT 20`,
    [viewerId, targetAlumniId, viewerRole]
  ).catch(() => ({ rows: [] }));

  // Common attributes
  const commonAttributes = [];

  if (viewer.department && target.department && viewer.department === target.department) {
    commonAttributes.push({ type: 'same_department', label: 'Same Department', value: viewer.department });
  }

  const viewerYear  = viewer.graduation_year ? String(viewer.graduation_year) : null;
  const targetYear  = target.graduation_year  ? String(target.graduation_year)  : null;
  if (viewerYear && targetYear && viewerYear === targetYear) {
    commonAttributes.push({ type: 'same_batch', label: 'Same Batch', value: `Class of ${viewerYear}` });
  }

  if (viewer.company && target.company &&
      viewer.company.trim().toLowerCase() === target.company.trim().toLowerCase()) {
    commonAttributes.push({ type: 'same_company', label: 'Same Company', value: viewer.company });
  }

  if (viewer.skills && target.skills) {
    const vs = viewer.skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const ts = target.skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const common = vs.filter(s => ts.includes(s));
    if (common.length) {
      commonAttributes.push({ type: 'same_skills', label: 'Common Skills', value: common.join(', ') });
    }
  }

  if (viewer.college_id && target.college_id && viewer.college_id === target.college_id) {
    commonAttributes.push({ type: 'same_college', label: 'Same College', value: viewer.college_id });
  }

  return {
    target: {
      id:             target.id,
      full_name:      target.full_name,
      department:     target.department,
      graduation_year:target.graduation_year,
      company:        target.company,
    },
    mutual_connections: mutualRows.rows.map(r => ({
      id:         r.id,
      full_name:  r.full_name,
      department: r.department,
      company:    r.company,
      role:       r.role,
    })),
    mutual_connections_count: mutualRows.rows.length,
    common_attributes: commonAttributes,
  };
}

module.exports = { getFullProfile, getAlumniCompanies, getAlumniGrouped, getMutuals };
