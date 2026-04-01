'use strict';
const { query } = require('../config/database');

/* ─── helper ─────────────────────────────────────────────────────────────── */
const safeQ = async (sql, params) => {
  try { return await query(sql, params); }
  catch (e) { console.error('[networkService safeQ]', e.message, '\nSQL:', sql, '\nParams:', params); return { rows: [], rowCount: 0 }; }
};

/**
 * Helper: group a flat array of user rows into
 *   Batch → Department → Members
 * Returns the structure expected by the frontend.
 */
function groupByBatchDept(rows) {
  const batchMap = {};

  for (const user of rows) {
    // graduation_year is INT in DB; normalise to string for display
    const batchKey   = user.graduation_year ? String(user.graduation_year) : 'other';
    const batchLabel = user.graduation_year ? `Batch ${user.graduation_year}` : 'Other';
    const deptKey    = (user.department || '').trim() || 'other';
    const deptLabel  = (user.department || '').trim() || 'Other';

    if (!batchMap[batchKey]) {
      batchMap[batchKey] = { batch: batchKey, batchLabel, totalMembers: 0, departments: {} };
    }
    batchMap[batchKey].totalMembers++;

    if (!batchMap[batchKey].departments[deptKey]) {
      batchMap[batchKey].departments[deptKey] = { deptName: deptLabel, members: [] };
    }
    batchMap[batchKey].departments[deptKey].members.push({
      id:         user.id,
      name:       user.full_name,
      email:      user.email      || null,
      department: user.department || null,
      batch:      user.graduation_year ? String(user.graduation_year) : null,
      skills:     user.skills     || null,
      company:    user.company    || null,
      designation:user.designation|| null,
      role:       user.role,
      college_id: user.college_id,
    });
  }

  // Convert nested objects → sorted arrays
  return Object.entries(batchMap)
    .sort(([a], [b]) => {
      if (a === 'other') return 1;
      if (b === 'other') return -1;
      return parseInt(b, 10) - parseInt(a, 10); // newest batch first
    })
    .map(([batchKey, batchData]) => ({
      batch:        batchKey,
      batchLabel:   batchData.batchLabel,
      totalMembers: batchData.totalMembers,
      departments:  Object.values(batchData.departments)
        .sort((a, b) => a.deptName.localeCompare(b.deptName)),
    }));
}


/* ══════════════════════════════════════════════════════════════════════════
   TASK 1 — getGroupMembers
   Route: GET /api/network/group/:groupType/:groupKey
   Fix:   graduation_year column is INT — cast groupKey properly
          Return structure: { batch, totalMembers, departments }
   ════════════════════════════════════════════════════════════════════════ */
async function getGroupMembers({
  userId, userRole, collegeId,
  groupType, groupKey,
  scope = 'my_college',
  search, department, batch,
  page = 1, limit = 30,
} = {}) {

  const offset      = (page - 1) * limit;
  const allColleges = scope === 'all_colleges';
  const rows        = [];

  /* ── Alumni ─────────────────────────────────────────────────────────── */
  {
    const cond   = ['a.is_approved = true', 'a.is_active = true'];
    const params = [];

    if (!allColleges) {
      params.push(collegeId);
      cond.push(`a.college_id = $${params.length}`);
    }
    if (userRole === 'alumni') {
      params.push(userId);
      cond.push(`a.id != $${params.length}`);
    }

    // ── Group filter (TASK 1 FIX) ──────────────────────────────────────
    if (groupType === 'college') {
      params.push(groupKey);
      cond.push(`a.college_id = $${params.length}`);

    } else if (groupType === 'batch') {
      /*
       * FIX: graduation_year is INT.
       * parseInt(groupKey) returns NaN for '', null, etc. → fallback -1
       * so the query returns zero rows instead of silently matching 0.
       */
      const batchYear = parseInt(groupKey, 10);
      if (isNaN(batchYear)) {
        console.warn('[getGroupMembers] Non-numeric batchYear received:', groupKey);
        return { batch: groupKey, totalMembers: 0, departments: [], page, limit };
      }
      params.push(batchYear);
      cond.push(`a.graduation_year = $${params.length}`);

    } else if (groupType === 'company') {
      if (groupKey === 'other') {
        cond.push(`(a.company IS NULL OR a.company = '')`);
      } else {
        params.push(groupKey);
        cond.push(`a.company = $${params.length}`);
      }
    }

    // Optional secondary filters
    if (search) {
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
      const n = params.length;
      cond.push(`(
        a.full_name   ILIKE $${n - 4}
        OR a.email      ILIKE $${n - 3}
        OR a.skills     ILIKE $${n - 2}
        OR a.company    ILIKE $${n - 1}
        OR a.department ILIKE $${n}
      )`);
    }
    if (department) {
      params.push(department);
      cond.push(`a.department = $${params.length}`);
    }
    if (batch) {
      const bv = parseInt(batch, 10);
      if (!isNaN(bv)) { params.push(bv); cond.push(`a.graduation_year = $${params.length}`); }
    }

    const where = `WHERE ${cond.join(' AND ')}`;
    const r = await safeQ(
      `SELECT a.id, a.full_name, a.email, a.company, a.designation, a.department,
              a.graduation_year, a.college_id, a.bio, a.headline, a.skills,
              a.available_mentorship, c.name AS college_name, 'alumni' AS role
       FROM alumni a
       LEFT JOIN colleges c ON c.id = a.college_id
       ${where}
       ORDER BY a.full_name ASC`,
      params
    );
    rows.push(...r.rows);
  }

  /* ── Students (alumni-role only, not for company groupType) ─────────── */
  if (userRole === 'alumni' && groupType !== 'company') {
    const cond   = ['s.is_active = true'];
    const params = [];

    if (!allColleges) {
      params.push(collegeId);
      cond.push(`s.college_id = $${params.length}`);
    }

    if (groupType === 'college') {
      params.push(groupKey);
      cond.push(`s.college_id = $${params.length}`);
    } else if (groupType === 'batch') {
      const batchYear = parseInt(groupKey, 10);
      if (!isNaN(batchYear)) {
        params.push(batchYear);
        cond.push(`s.year = $${params.length}`);
      }
    }

    if (search) {
      const like = `%${search}%`;
      params.push(like, like, like);
      const n = params.length;
      cond.push(`(
        s.full_name   ILIKE $${n - 2}
        OR s.department ILIKE $${n - 1}
        OR s.skills     ILIKE $${n}
      )`);
    }
    if (department) { params.push(department); cond.push(`s.department = $${params.length}`); }
    if (batch) {
      const bv = parseInt(batch, 10);
      if (!isNaN(bv)) { params.push(bv); cond.push(`s.year = $${params.length}`); }
    }

    const where = `WHERE ${cond.join(' AND ')}`;
    const r = await safeQ(
      `SELECT s.id, s.full_name, s.email, NULL AS company, NULL AS designation,
              s.department, s.year AS graduation_year, s.college_id,
              s.bio, s.headline, s.skills,
              false AS available_mentorship, c.name AS college_name, 'student' AS role
       FROM students s
       LEFT JOIN colleges c ON c.id = s.college_id
       ${where}
       ORDER BY s.full_name ASC`,
      params
    );
    rows.push(...r.rows);
  }

  // Sort combined rows
  rows.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  /* ── TASK 3: Build Batch → Dept → Members structure ─────────────────── */
  if (groupType === 'batch') {
    /*
     * When fetching a specific batch, we return the expected shape:
     * { batch, totalMembers, departments: [{ deptName, members }] }
     */
    const deptMap = {};
    for (const user of rows) {
      const deptKey = (user.department || '').trim() || 'Other';
      if (!deptMap[deptKey]) deptMap[deptKey] = { deptName: deptKey, members: [] };
      deptMap[deptKey].members.push({
        id:         user.id,
        name:       user.full_name,
        email:      user.email      || null,
        department: user.department || null,
        batch:      user.graduation_year ? String(user.graduation_year) : null,
        skills:     user.skills     || null,
        company:    user.company    || null,
        designation:user.designation|| null,
        role:       user.role,
      });
    }

    const departments = Object.values(deptMap).sort((a, b) => a.deptName.localeCompare(b.deptName));

    return {
      batch:        groupKey,
      batchLabel:   `Batch ${groupKey}`,
      totalMembers: rows.length,
      departments,
      page,
      limit,
    };
  }

  /* ── Flat paginated response for non-batch group types ──────────────── */
  let groupLabel = groupKey;
  if (groupType === 'college' && rows[0]?.college_name) groupLabel = rows[0].college_name;

  const total     = rows.length;
  const paginated = rows.slice(offset, offset + limit);

  return {
    groupType,
    groupKey,
    groupLabel,
    members:  paginated,
    total,
    page:     parseInt(page, 10),
    limit:    parseInt(limit, 10),
    pages:    Math.ceil(total / limit) || 1,
  };
}


/* ══════════════════════════════════════════════════════════════════════════
   TASK 2 — searchNetwork
   Route: GET /api/network/search?q=keyword
   Fix:   Add email + skills to WHERE clause; group result Batch→Dept→Members
   ════════════════════════════════════════════════════════════════════════ */
async function searchNetwork({
  q, userId, userRole, collegeId,
  scope = 'my_college',
  groupType, groupKey,
  limit = 50,
} = {}) {
  if (!q || q.trim().length < 1) return [];

  const like        = `%${q.trim()}%`;
  const allColleges = scope === 'all_colleges';

  /* ── Alumni search ───────────────────────────────────────────────────── */
  const aCond   = ['a.is_approved = true', 'a.is_active = true'];
  const aParams = [];

  if (!allColleges) {
    aParams.push(collegeId);
    aCond.push(`a.college_id = $${aParams.length}`);
  }
  if (userRole === 'alumni') {
    aParams.push(userId);
    aCond.push(`a.id != $${aParams.length}`);
  }

  // Scope to a specific group if provided
  if (groupType === 'college' && groupKey) {
    aParams.push(groupKey);
    aCond.push(`a.college_id = $${aParams.length}`);
  } else if (groupType === 'batch' && groupKey) {
    const bv = parseInt(groupKey, 10);
    if (!isNaN(bv)) { aParams.push(bv); aCond.push(`a.graduation_year = $${aParams.length}`); }
  } else if (groupType === 'company' && groupKey && groupKey !== 'other') {
    aParams.push(groupKey);
    aCond.push(`a.company = $${aParams.length}`);
  }

  /*
   * TASK 2 FIX: full search across name, email, skills, company,
   *             department AND batch (graduation_year).
   * skills is TEXT in this DB — plain ILIKE works fine.
   * graduation_year is INT — cast to TEXT for ILIKE.
   */
  aParams.push(like);
  const likeIdx = aParams.length;
  aCond.push(`(
    a.full_name       ILIKE $${likeIdx}
    OR a.email          ILIKE $${likeIdx}
    OR a.skills         ILIKE $${likeIdx}
    OR a.company        ILIKE $${likeIdx}
    OR a.department     ILIKE $${likeIdx}
    OR a.graduation_year::TEXT ILIKE $${likeIdx}
  )`);

  const alumniR = await safeQ(
    `SELECT a.id, a.full_name, a.email, a.company, a.designation,
            a.department, a.graduation_year, a.skills,
            a.college_id, c.name AS college_name, 'alumni' AS role
     FROM alumni a
     LEFT JOIN colleges c ON c.id = a.college_id
     WHERE ${aCond.join(' AND ')}
     ORDER BY a.full_name ASC
     LIMIT $${aParams.length + 1}`,
    [...aParams, limit]
  );

  /* ── Students search (alumni only) ───────────────────────────────────── */
  let studentRows = [];
  if (userRole === 'alumni') {
    const sCond   = ['s.is_active = true'];
    const sParams = [];

    if (!allColleges) {
      sParams.push(collegeId);
      sCond.push(`s.college_id = $${sParams.length}`);
    }
    if (groupType === 'college' && groupKey) {
      sParams.push(groupKey);
      sCond.push(`s.college_id = $${sParams.length}`);
    } else if (groupType === 'batch' && groupKey) {
      const bv = parseInt(groupKey, 10);
      if (!isNaN(bv)) { sParams.push(bv); sCond.push(`s.year = $${sParams.length}`); }
    }

    sParams.push(like);
    const sLikeIdx = sParams.length;
    sCond.push(`(
      s.full_name   ILIKE $${sLikeIdx}
      OR s.email      ILIKE $${sLikeIdx}
      OR s.skills     ILIKE $${sLikeIdx}
      OR s.department ILIKE $${sLikeIdx}
      OR s.year::TEXT ILIKE $${sLikeIdx}
    )`);

    const sR = await safeQ(
      `SELECT s.id, s.full_name, s.email, NULL AS company, NULL AS designation,
              s.department, s.year AS graduation_year, s.skills,
              s.college_id, c.name AS college_name, 'student' AS role
       FROM students s
       LEFT JOIN colleges c ON c.id = s.college_id
       WHERE ${sCond.join(' AND ')}
       ORDER BY s.full_name ASC
       LIMIT $${sParams.length + 1}`,
      [...sParams, limit]
    );
    studentRows = sR.rows;
  }

  const allRows = [...alumniR.rows, ...studentRows];
  allRows.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  /* ── TASK 3: Group filtered results Batch → Dept → Members ─────────── */
  return groupByBatchDept(allRows);
}


/* ══════════════════════════════════════════════════════════════════════════
   getNetworkGroups — unchanged, returns group CARDS for the Network page
   ════════════════════════════════════════════════════════════════════════ */
async function getNetworkGroups({ userId, userRole, collegeId, groupType = 'college', scope = 'my_college' } = {}) {
  const allColleges = scope === 'all_colleges';

  const alumniBuildCond = ['a.is_approved = true', 'a.is_active = true'];
  const alumniParams    = [];
  if (!allColleges)         { alumniParams.push(collegeId); alumniBuildCond.push(`a.college_id = $${alumniParams.length}`); }
  if (userRole === 'alumni') { alumniParams.push(userId);   alumniBuildCond.push(`a.id != $${alumniParams.length}`); }
  const aWhere = `WHERE ${alumniBuildCond.join(' AND ')}`;

  const alumniR = await safeQ(
    `SELECT a.id, a.full_name, a.company, a.department, a.graduation_year,
            a.college_id, c.name AS college_name
     FROM alumni a
     LEFT JOIN colleges c ON c.id = a.college_id
     ${aWhere} ORDER BY a.full_name ASC`,
    alumniParams
  );

  let studentRows = [];
  if (userRole === 'alumni') {
    const sCond   = ['s.is_active = true'];
    const sParams = [];
    if (!allColleges) { sParams.push(collegeId); sCond.push(`s.college_id = $${sParams.length}`); }
    const sR = await safeQ(
      `SELECT s.id, s.full_name, NULL AS company, s.department, s.year AS graduation_year,
              s.college_id, c.name AS college_name
       FROM students s
       LEFT JOIN colleges c ON c.id = s.college_id
       WHERE ${sCond.join(' AND ')} ORDER BY s.full_name ASC`,
      sParams
    );
    studentRows = sR.rows;
  }

  const allRows = [...alumniR.rows, ...studentRows];
  const groupMap = {};

  for (const u of allRows) {
    let key, label, description;
    if (groupType === 'college') {
      key = u.college_id || 'other';
      label = u.college_name || u.college_id || 'Other';
      description = `Members from ${label}`;
    } else if (groupType === 'batch') {
      key = u.graduation_year ? String(u.graduation_year) : 'other';
      label = u.graduation_year ? `Batch of ${u.graduation_year}` : 'Other';
      description = `Class of ${u.graduation_year || 'Unknown'}`;
    } else {
      key = u.company || 'other';
      label = u.company || 'Other / No Company';
      description = u.company ? `Alumni working at ${u.company}` : 'Alumni without company listed';
    }
    if (!groupMap[key]) groupMap[key] = { key, label, description, count: 0 };
    groupMap[key].count++;
  }

  const groups = Object.values(groupMap)
    .filter(g => g.count > 0)
    .sort((a, b) => {
      if (a.key === 'other') return 1;
      if (b.key === 'other') return -1;
      return b.count - a.count;
    });

  return { groups, groupType };
}


/* ══════════════════════════════════════════════════════════════════════════
   Legacy helpers — kept for backward compat
   ════════════════════════════════════════════════════════════════════════ */
async function getNetworkUsers({ userId, userRole, collegeId, page=1, limit=20, search, department, company, scope='my_college' } = {}) {
  const offset = (page - 1) * limit;
  const allColleges = scope === 'all_colleges';
  const userRows = [];

  {
    const conditions = ['a.is_approved=true','a.is_active=true'];
    const params     = [];
    if (!allColleges)         { params.push(collegeId); conditions.push(`a.college_id=$${params.length}`); }
    if (userRole === 'alumni') { params.push(userId);   conditions.push(`a.id!=$${params.length}`); }
    if (search) {
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
      const n = params.length;
      conditions.push(`(a.full_name ILIKE $${n-4} OR a.email ILIKE $${n-3} OR a.skills ILIKE $${n-2} OR a.company ILIKE $${n-1} OR a.department ILIKE $${n})`);
    }
    if (department) { params.push(department); conditions.push(`a.department=$${params.length}`); }
    if (company)    { params.push(company);    conditions.push(`a.company=$${params.length}`); }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const r = await safeQ(
      `SELECT a.id,a.full_name,a.email,a.company,a.designation,a.location,a.graduation_year,
              a.department,a.bio,a.headline,a.skills,a.linkedin_url,a.github_url,
              a.college_id,a.available_mentorship,a.available_referral,'alumni' AS role
       FROM alumni a ${where} ORDER BY a.full_name ASC`,
      params
    );
    userRows.push(...r.rows);
  }
  if (userRole === 'alumni') {
    const conditions = ['s.is_active=true'];
    const params     = [];
    if (!allColleges) { params.push(collegeId); conditions.push(`s.college_id=$${params.length}`); }
    if (search) {
      const like = `%${search}%`;
      params.push(like, like, like, like);
      const n = params.length;
      conditions.push(`(s.full_name ILIKE $${n-3} OR s.email ILIKE $${n-2} OR s.department ILIKE $${n-1} OR s.skills ILIKE $${n})`);
    }
    if (department) { params.push(department); conditions.push(`s.department=$${params.length}`); }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const r = await safeQ(
      `SELECT s.id,s.full_name,s.email,NULL AS company,NULL AS designation,s.location,
              NULL AS graduation_year,s.department,s.bio,s.headline,s.skills,
              s.linkedin_url,s.github_url,s.college_id,false AS available_mentorship,'student' AS role
       FROM students s ${where} ORDER BY s.full_name ASC`,
      params
    );
    userRows.push(...r.rows);
  }

  userRows.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  return {
    users: userRows.slice(offset, offset + limit),
    total: userRows.length,
    page:  parseInt(page,  10),
    limit: parseInt(limit, 10),
    pages: Math.ceil(userRows.length / limit) || 1,
  };
}

async function getNetworkGrouped({ userId, userRole, collegeId, groupBy='college', scope='my_college', search, department } = {}) {
  const allColleges = scope === 'all_colleges';
  const userRows    = [];

  {
    const conditions = ['a.is_approved=true','a.is_active=true'];
    const params     = [];
    if (!allColleges)         { params.push(collegeId); conditions.push(`a.college_id=$${params.length}`); }
    if (userRole === 'alumni') { params.push(userId);   conditions.push(`a.id!=$${params.length}`); }
    if (search) {
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
      const n = params.length;
      conditions.push(`(a.full_name ILIKE $${n-4} OR a.email ILIKE $${n-3} OR a.skills ILIKE $${n-2} OR a.company ILIKE $${n-1} OR a.department ILIKE $${n})`);
    }
    if (department) { params.push(department); conditions.push(`a.department=$${params.length}`); }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const r = await safeQ(
      `SELECT a.id,a.full_name,a.company,a.designation,a.department,a.graduation_year,
              a.location,a.college_id,a.bio,a.headline,a.skills,a.available_mentorship,'alumni' AS role
       FROM alumni a ${where} ORDER BY a.full_name ASC`,
      params
    );
    userRows.push(...r.rows);
  }
  if (userRole === 'alumni') {
    const conditions = ['s.is_active=true'];
    const params     = [];
    if (!allColleges) { params.push(collegeId); conditions.push(`s.college_id=$${params.length}`); }
    if (search) {
      const like = `%${search}%`;
      params.push(like, like, like, like);
      const n = params.length;
      conditions.push(`(s.full_name ILIKE $${n-3} OR s.email ILIKE $${n-2} OR s.department ILIKE $${n-1} OR s.skills ILIKE $${n})`);
    }
    if (department) { params.push(department); conditions.push(`s.department=$${params.length}`); }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const r = await safeQ(
      `SELECT s.id,s.full_name,NULL AS company,NULL AS designation,s.department,
              NULL AS graduation_year,s.location,s.college_id,s.bio,s.headline,
              s.skills,false AS available_mentorship,'student' AS role
       FROM students s ${where} ORDER BY s.full_name ASC`,
      params
    );
    userRows.push(...r.rows);
  }

  const grouped = {};
  for (const u of userRows) {
    let key = 'Other';
    if      (groupBy === 'college') key = u.college_id       || 'Other';
    else if (groupBy === 'batch')   key = u.graduation_year  ? `Class of ${u.graduation_year}` : 'Other';
    else if (groupBy === 'company') key = u.company          || (u.role === 'student' ? 'Students' : 'Other');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(u);
  }
  return Object.entries(grouped)
    .filter(([, users]) => users.length > 0)
    .map(([group, users]) => ({ group, users }))
    .sort((a, b) => a.group.localeCompare(b.group));
}

/* ─── getNetworkHierarchy — unchanged ────────────────────────────────────── */
async function getNetworkHierarchy({ userId, userRole, collegeId, scope = 'my_college', searchField, batch, department, company } = {}) {
  const allColleges = scope === 'all_colleges';
  const rows        = [];

  const alumniCond   = ['a.is_approved = true', 'a.is_active = true'];
  const alumniParams = [];

  if (!allColleges)         { alumniParams.push(collegeId); alumniCond.push(`a.college_id = $${alumniParams.length}`); }
  if (userRole === 'alumni') { alumniParams.push(userId);   alumniCond.push(`a.id != $${alumniParams.length}`); }

  // Apply filters regardless of searchField — batch/dept/company filters always narrow results
  if (batch) {
    const bv = parseInt(batch, 10);
    if (!isNaN(bv)) { alumniParams.push(bv); alumniCond.push(`a.graduation_year = $${alumniParams.length}`); }
  }
  if (department) {
    alumniParams.push(department); alumniCond.push(`a.department = $${alumniParams.length}`);
  }
  if (company) {
    alumniParams.push(company); alumniCond.push(`a.company = $${alumniParams.length}`);
  }

  const alumniWhere = `WHERE ${alumniCond.join(' AND ')}`;
  const alumniR = await safeQ(
    `SELECT a.id, a.full_name, a.company, a.designation, a.department,
            a.graduation_year, a.college_id, a.bio, a.headline, a.skills,
            a.available_mentorship, c.name AS college_name, 'alumni' AS role
     FROM alumni a
     LEFT JOIN colleges c ON c.id = a.college_id
     ${alumniWhere} ORDER BY a.full_name ASC`,
    alumniParams
  );
  rows.push(...alumniR.rows);

  if (userRole === 'alumni') {
    const studentCond   = ['s.is_active = true'];
    const studentParams = [];
    if (!allColleges) { studentParams.push(collegeId); studentCond.push(`s.college_id = $${studentParams.length}`); }
    // Apply filters regardless of searchField
    if (batch) {
      const bv = parseInt(batch, 10);
      if (!isNaN(bv)) { studentParams.push(bv); studentCond.push(`s.year = $${studentParams.length}`); }
    }
    if (department) {
      studentParams.push(department); studentCond.push(`s.department = $${studentParams.length}`);
    }
    const studentWhere = `WHERE ${studentCond.join(' AND ')}`;
    const studentR = await safeQ(
      `SELECT s.id, s.full_name, NULL AS company, NULL AS designation, s.department,
              s.year AS graduation_year, s.college_id, NULL AS bio, NULL AS headline,
              NULL AS skills, false AS available_mentorship, c.name AS college_name, 'student' AS role
       FROM students s
       LEFT JOIN colleges c ON c.id = s.college_id
       ${studentWhere} ORDER BY s.full_name ASC`,
      studentParams
    );
    rows.push(...studentR.rows);
  }

  if (allColleges) {
    const collegeMap = {};
    for (const user of rows) {
      const ck = user.college_id || 'other';
      if (!collegeMap[ck]) collegeMap[ck] = { key: ck, label: user.college_name || 'Other', count: 0, batches: {} };
      collegeMap[ck].count++;
      const bk = user.graduation_year ? String(user.graduation_year) : 'other';
      if (!collegeMap[ck].batches[bk]) collegeMap[ck].batches[bk] = { key: bk, label: user.graduation_year ? `Batch ${user.graduation_year}` : 'Other', count: 0, depts: {} };
      collegeMap[ck].batches[bk].count++;
      const dk = user.department || 'other';
      if (!collegeMap[ck].batches[bk].depts[dk]) collegeMap[ck].batches[bk].depts[dk] = { key: dk, label: user.department || 'Other', count: 0, users: [] };
      collegeMap[ck].batches[bk].depts[dk].count++;
      collegeMap[ck].batches[bk].depts[dk].users.push(user);
    }
    const hierarchy = Object.values(collegeMap).map(col => ({
      key: col.key, label: col.label, count: col.count,
      batches: Object.values(col.batches).map(b => ({
        key: b.key, label: b.label, count: b.count,
        depts: Object.values(b.depts).map(d => ({ key: d.key, label: d.label, count: d.count, users: d.users })),
      })),
    }));
    return { hierarchy, total: rows.length };
  } else {
    const batchMap = {};
    for (const user of rows) {
      const bk = user.graduation_year ? String(user.graduation_year) : 'other';
      if (!batchMap[bk]) batchMap[bk] = { key: bk, label: user.graduation_year ? `Batch ${user.graduation_year}` : 'Other', count: 0, depts: {} };
      batchMap[bk].count++;
      const dk = user.department || 'other';
      if (!batchMap[bk].depts[dk]) batchMap[bk].depts[dk] = { key: dk, label: user.department || 'Other', count: 0, users: [] };
      batchMap[bk].depts[dk].count++;
      batchMap[bk].depts[dk].users.push(user);
    }
    const hierarchy = Object.values(batchMap)
      .sort((a, b) => { if (a.key === 'other') return 1; if (b.key === 'other') return -1; return parseInt(b.key) - parseInt(a.key); })
      .map(b => ({ key: b.key, label: b.label, count: b.count, depts: Object.values(b.depts).map(d => ({ key: d.key, label: d.label, count: d.count, users: d.users })) }));
    return { hierarchy, total: rows.length };
  }
}

module.exports = {
  getNetworkUsers,
  getNetworkGrouped,
  getNetworkGroups,
  getGroupMembers,
  searchNetwork,
  getNetworkHierarchy,
};
