'use strict';
const { query } = require('../config/database');
const { assertCollegeExists } = require('./tenantService');

async function listOpportunities({ page = 1, limit = 12, search, job_type, status = 'active', collegeId } = {}) {
  page  = parseInt(page)  || 1;
  limit = parseInt(limit) || 12;
  const offset = (page - 1) * limit;
  const conditions = ['o.college_id = $1'];
  const params = [collegeId];

  if (status) {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }

  if (search) {
    const like = `%${search}%`;
    params.push(like, like, like);
    const n = params.length;
    conditions.push(`(o.title ILIKE $${n - 2} OR o.company ILIKE $${n - 1} OR o.description ILIKE $${n})`);
  }

  if (job_type) {
    params.push(job_type);
    conditions.push(`o.job_type = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countParams = [...params];
  const cnt = await query(`SELECT COUNT(*) FROM opportunities o ${where}`, countParams);

  params.push(limit, offset);
  const r = await query(
    `SELECT o.*, a.full_name AS posted_by_name, a.company AS poster_company
     FROM opportunities o
     LEFT JOIN alumni a ON a.id = o.alumni_id
     ${where}
     ORDER BY o.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    opportunities: r.rows,
    total: parseInt(cnt.rows[0].count),
    page, limit,
    pages: Math.ceil(parseInt(cnt.rows[0].count) / limit) || 1,
  };
}

async function getOpportunityById(id, collegeId) {
  const r = await query(
    `SELECT o.*, a.full_name AS posted_by_name, a.company AS poster_company
     FROM opportunities o
     LEFT JOIN alumni a ON a.id = o.alumni_id
     WHERE o.id = $1 AND o.college_id = $2`,
    [id, collegeId]
  );
  if (!r.rowCount) throw Object.assign(new Error('Opportunity not found'), { status: 404 });
  return r.rows[0];
}

async function applyForOpportunity(opportunityId, studentId, collegeId) {
  const opp = await getOpportunityById(opportunityId, collegeId);
  if (opp.status !== 'active') {
    throw Object.assign(new Error('This opportunity is no longer active'), { status: 400 });
  }
  try {
    const r = await query(
      `INSERT INTO job_applications (opportunity_id, student_id, college_id)
       VALUES ($1, $2, $3) RETURNING id, created_at`,
      [opportunityId, studentId, collegeId]
    );
    return r.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw Object.assign(new Error('You have already applied for this opportunity'), { status: 409 });
    }
    throw err;
  }
}

async function getMyApplications(studentId, collegeId) {
  const r = await query(
    `SELECT ja.*, o.title, o.company, o.job_type, o.location, o.status AS opp_status
     FROM job_applications ja
     JOIN opportunities o ON o.id = ja.opportunity_id
     WHERE ja.student_id = $1 AND ja.college_id = $2
     ORDER BY ja.created_at DESC`,
    [studentId, collegeId]
  );
  return r.rows;
}

async function createOpportunity(alumniId, collegeId, { title, company, location, job_type, description, skills_required, salary, apply_link, deadline, openings_count }) {
  if (!title) throw Object.assign(new Error('Title is required'), { status: 400 });
  await assertCollegeExists(collegeId);
  const r = await query(
    `INSERT INTO opportunities
       (alumni_id, college_id, title, company, location, job_type, description, skills_required, salary, apply_link, deadline, openings_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [alumniId, collegeId, title, company, location, job_type || 'Full-time', description, skills_required, salary, apply_link, deadline || null, openings_count || 1]
  );
  return r.rows[0];
}

async function getAlumniOpportunities(alumniId, collegeId) {
  const r = await query(
    `SELECT o.*,
            (SELECT COUNT(*) FROM job_applications WHERE opportunity_id = o.id) AS applications_count
     FROM opportunities o
     WHERE o.alumni_id = $1 AND o.college_id = $2
     ORDER BY o.created_at DESC`,
    [alumniId, collegeId]
  );
  return r.rows;
}

async function updateOpportunity(id, alumniId, collegeId, { title, company, location, job_type, description, skills_required, salary, apply_link, deadline, status, openings_count }) {
  // Verify ownership — alumni can only update their own
  const r = await query(
    `UPDATE opportunities SET
      title           = COALESCE($1, title),
      company         = COALESCE($2, company),
      location        = COALESCE($3, location),
      job_type        = COALESCE($4, job_type),
      description     = COALESCE($5, description),
      skills_required = COALESCE($6, skills_required),
      salary          = COALESCE($7, salary),
      apply_link      = COALESCE($8, apply_link),
      deadline        = COALESCE($9, deadline),
      status          = COALESCE($10, status),
      openings_count  = COALESCE($11, openings_count),
      updated_at      = NOW()
     WHERE id = $12 AND alumni_id = $13 AND college_id = $14
     RETURNING *`,
    [title, company, location, job_type, description, skills_required, salary, apply_link, deadline || null, status, openings_count || null, id, alumniId, collegeId]
  );
  if (!r.rowCount) {
    throw Object.assign(new Error('Opportunity not found or you do not have permission to update it'), { status: 404 });
  }
  return r.rows[0];
}

async function deleteOpportunity(id, alumniId, collegeId) {
  // Verify ownership — alumni can only delete their own
  const r = await query(
    'DELETE FROM opportunities WHERE id = $1 AND alumni_id = $2 AND college_id = $3 RETURNING id',
    [id, alumniId, collegeId]
  );
  if (!r.rowCount) {
    throw Object.assign(new Error('Opportunity not found or you do not have permission to delete it'), { status: 404 });
  }
}

module.exports = {
  listOpportunities, getOpportunityById, applyForOpportunity,
  getMyApplications, createOpportunity, updateOpportunity, getAlumniOpportunities, deleteOpportunity,
};
