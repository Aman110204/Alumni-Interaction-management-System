'use strict';
const { query } = require('../config/database');

const USER_TABLES = {
  student: 'students',
  alumni: 'alumni',
  admin: 'admins',
};

function normalizeCollegeId(value) {
  if (value == null) return null;
  const normalized = String(value).trim().toLowerCase();
  return normalized || null;
}

function getDefaultCollegeId() {
  return normalizeCollegeId(process.env.DEFAULT_COLLEGE_ID) || 'skit';
}

function getDefaultCollegeName() {
  return process.env.DEFAULT_COLLEGE_NAME || 'SKIT College';
}

function extractCollegeFromHostname(hostname) {
  if (!hostname) return null;
  const cleanHost = String(hostname).split(':')[0].trim().toLowerCase();
  if (!cleanHost || cleanHost === 'localhost' || cleanHost === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(cleanHost)) {
    return null;
  }
  const parts = cleanHost.split('.');
  if (parts.length < 3) return null;
  return normalizeCollegeId(parts[0]);
}

async function ensureCollegeExists(collegeId, details = {}) {
  const id = normalizeCollegeId(collegeId) || getDefaultCollegeId();
  const name = (details.name || id).trim();
  const location = details.location || null;
  const code = details.code || null;
  const metadata = details.metadata || {};

  const r = await query(
    `INSERT INTO colleges (id, name, location, code, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name,
           location = COALESCE(colleges.location, EXCLUDED.location),
           code = COALESCE(colleges.code, EXCLUDED.code),
           updated_at = NOW()
     RETURNING id, name, location, code`,
    [id, name, location, code, JSON.stringify(metadata)]
  );

  return r.rows[0];
}

async function getCollegeById(collegeId) {
  const id = normalizeCollegeId(collegeId);
  if (!id) return null;
  const r = await query(
    'SELECT id, name, location, code, metadata, created_at, updated_at FROM colleges WHERE id=$1',
    [id]
  );
  return r.rows[0] || null;
}

async function listColleges() {
  const r = await query(
    'SELECT id, name, location, code, metadata, created_at, updated_at FROM colleges ORDER BY name ASC'
  );
  return r.rows;
}

async function assertCollegeExists(collegeId) {
  const college = await getCollegeById(collegeId);
  if (!college) {
    throw Object.assign(new Error('Invalid college_id'), { status: 400 });
  }
  return college;
}

async function getUserCollegeId(role, userId) {
  const table = USER_TABLES[role];
  if (!table) throw Object.assign(new Error(`Unsupported role: ${role}`), { status: 400 });

  const r = await query(`SELECT college_id FROM ${table} WHERE id=$1`, [userId]);
  if (!r.rowCount) {
    throw Object.assign(new Error(`${role} not found`), { status: 404 });
  }

  return normalizeCollegeId(r.rows[0].college_id) || getDefaultCollegeId();
}

async function assertUsersShareCollege(userA, userB) {
  const [collegeA, collegeB] = await Promise.all([
    getUserCollegeId(userA.role, userA.id),
    getUserCollegeId(userB.role, userB.id),
  ]);

  if (collegeA !== collegeB) {
    throw Object.assign(new Error('Cross-college access is not allowed'), { status: 403 });
  }

  return collegeA;
}

function requireCollegeId(collegeId) {
  const normalized = normalizeCollegeId(collegeId);
  if (!normalized) {
    throw Object.assign(new Error('college_id is required'), { status: 400 });
  }
  return normalized;
}

module.exports = {
  USER_TABLES,
  normalizeCollegeId,
  getDefaultCollegeId,
  getDefaultCollegeName,
  extractCollegeFromHostname,
  ensureCollegeExists,
  getCollegeById,
  listColleges,
  assertCollegeExists,
  getUserCollegeId,
  assertUsersShareCollege,
  requireCollegeId,
};
