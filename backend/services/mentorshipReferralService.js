'use strict';
const { query } = require('../config/database');
const { getUserCollegeId } = require('./tenantService');
const connectionService = require('./connectionService');

const MENTORSHIP_ACTIVE_LIMIT = 5; // max pending+accepted mentorship requests per student

async function requestMentorship(studentId, collegeId, { alumni_id, message, allow_cross_college }) {
  if (!alumni_id) throw Object.assign(new Error('alumni_id is required'), { status: 400 });
  const studentCollegeId = await getUserCollegeId('student', studentId);
  if (studentCollegeId !== collegeId) {
    throw Object.assign(new Error('Invalid tenant context for mentorship request'), { status: 403 });
  }

  const target = await query(
    'SELECT id, college_id FROM alumni WHERE id=$1 AND is_active=true',
    [alumni_id]
  );
  if (!target.rowCount) {
    throw Object.assign(new Error('Alumni not found'), { status: 404 });
  }
  const isCrossCollege = target.rows[0].college_id !== collegeId;
  if (isCrossCollege && !allow_cross_college) {
    throw Object.assign(new Error('Cross-college mentorship requires explicit opt-in'), { status: 403 });
  }

  const dup = await query(
    `SELECT 1 FROM mentorship_requests
     WHERE student_id=$1 AND alumni_id=$2 AND (college_id=$3 OR is_cross_college=true) AND status='pending'`,
    [studentId, alumni_id, collegeId]
  );
  if (dup.rowCount > 0) {
    throw Object.assign(new Error('You already have a pending mentorship request with this alumni'), { status: 409 });
  }

  // Active-request cap: count pending + accepted across all alumni
  const activeCount = await query(
    `SELECT COUNT(*) AS cnt FROM mentorship_requests
     WHERE student_id=$1 AND (college_id=$2 OR is_cross_college=true) AND status IN ('pending','accepted')`,
    [studentId, collegeId]
  );
  if (parseInt(activeCount.rows[0].cnt) >= MENTORSHIP_ACTIVE_LIMIT) {
    throw Object.assign(
      new Error(`You have reached the maximum of ${MENTORSHIP_ACTIVE_LIMIT} active mentorship requests`),
      { status: 429 }
    );
  }

  const r = await query(
    `INSERT INTO mentorship_requests (student_id, alumni_id, college_id, is_cross_college, message)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [studentId, alumni_id, collegeId, isCrossCollege, message]
  );

  const studentInfo = await query('SELECT full_name FROM students WHERE id=$1', [studentId]);
  const studentName = studentInfo.rows[0]?.full_name || 'A student';
  query(
    `INSERT INTO notifications (user_id, user_type, title, message, type, college_id)
     VALUES ($1,'alumni',$2,$3,'mentorship',$4)`,
    [alumni_id, 'New Mentorship Request', `${studentName} sent you a mentorship request.`, collegeId]
  ).catch(() => {});

  return r.rows[0];
}

async function getMyMentorshipRequests(studentId, collegeId) {
  const r = await query(
    `SELECT mr.*,
            COALESCE(mr.response_message, mr.response) AS response_message,
            a.full_name AS alumni_name, a.company, a.designation
     FROM mentorship_requests mr
     JOIN alumni a ON a.id = mr.alumni_id
     WHERE mr.student_id = $1 AND (mr.college_id = $2 OR mr.is_cross_college = true)
     ORDER BY mr.created_at DESC`,
    [studentId, collegeId]
  );
  return r.rows;
}

async function getAlumniMentorshipRequests(alumniId, collegeId) {
  const r = await query(
    `SELECT mr.*, s.full_name AS student_name, s.email AS student_email, s.department, s.year
     FROM mentorship_requests mr
     JOIN students s ON s.id = mr.student_id
     WHERE mr.alumni_id = $1 AND (mr.college_id = $2 OR mr.is_cross_college = true)
     ORDER BY mr.created_at DESC`,
    [alumniId, collegeId]
  );
  return r.rows;
}

async function respondToMentorship(requestId, alumniId, collegeId, { status, response }) {
  const allowed = ['accepted', 'rejected'];
  if (!allowed.includes(status)) {
    throw Object.assign(new Error(`Status must be one of: ${allowed.join(', ')}`), { status: 400 });
  }

  const r = await query(
    `UPDATE mentorship_requests
     SET status=$1, response=$2, response_message=$2, updated_at=NOW()
     WHERE id=$3 AND alumni_id=$4 AND (college_id=$5 OR is_cross_college = true)
     RETURNING *`,
    [status, response, requestId, alumniId, collegeId]
  );
  if (!r.rowCount) {
    throw Object.assign(new Error('Request not found or you do not have permission'), { status: 404 });
  }

  const req = r.rows[0];
  const alumniInfo = await query('SELECT full_name FROM alumni WHERE id=$1', [alumniId]);
  const alumniName = alumniInfo.rows[0]?.full_name || 'An alumni';

  // Auto-connect on mentorship acceptance if not already connected
  if (status === 'accepted') {
    try {
      const existing = await connectionService.getConnectionBetween(
        req.student_id, 'student', alumniId, 'alumni', collegeId
      );
      if (!existing || existing.status !== 'accepted') {
        await connectionService.createConnectionRequest({
          requesterId:   alumniId,
          requesterType: 'alumni',
          recipientId:   req.student_id,
          recipientType: 'student',
          collegeId,
          message: 'Auto-connected via mentorship acceptance',
        }).catch(() => {});
        // If request was created, auto-accept it
        const newConn = await connectionService.getConnectionBetween(
          req.student_id, 'student', alumniId, 'alumni', collegeId
        );
        if (newConn && newConn.status === 'pending') {
          await connectionService.respondToConnectionRequest(
            newConn.id, req.student_id, 'student', collegeId, 'accepted'
          ).catch(() => {});
        }
      }
    } catch (_) { /* non-fatal: mentorship acceptance still succeeds */ }
  }

  query(
    `INSERT INTO notifications (user_id, user_type, title, message, type, college_id)
     VALUES ($1,'student',$2,$3,'mentorship',$4)`,
    [
      req.student_id,
      `Mentorship Request ${status === 'accepted' ? 'Accepted' : 'Rejected'}`,
      `${alumniName} ${status === 'accepted' ? 'accepted' : 'declined'} your mentorship request.`,
      collegeId,
    ]
  ).catch(() => {});

  return req;
}

async function requestReferral(studentId, collegeId, { alumni_id, company, job_title, resume_url, message, allow_cross_college }) {
  if (!alumni_id || !company || !job_title) {
    throw Object.assign(new Error('alumni_id, company, and job_title are required'), { status: 400 });
  }
  const studentCollegeId = await getUserCollegeId('student', studentId);
  if (studentCollegeId !== collegeId) {
    throw Object.assign(new Error('Invalid tenant context for referral request'), { status: 403 });
  }

  const target = await query(
    'SELECT id, college_id, company FROM alumni WHERE id=$1 AND is_active=true',
    [alumni_id]
  );
  if (!target.rowCount) {
    throw Object.assign(new Error('Alumni not found'), { status: 404 });
  }
  const alumniRow = target.rows[0];
  const isCrossCollege = alumniRow.college_id !== collegeId;
  if (isCrossCollege && !allow_cross_college) {
    throw Object.assign(new Error('Cross-college referral requires explicit opt-in'), { status: 403 });
  }

  // STRICT: Referral requires an accepted connection between student and alumni
  const connection = await connectionService.getConnectionBetween(
    studentId, 'student', alumni_id, 'alumni', isCrossCollege ? alumniRow.college_id : collegeId
  );
  if (!connection || connection.status !== 'accepted') {
    throw Object.assign(
      new Error('You must be connected with this alumni before requesting a referral'),
      { status: 403 }
    );
  }

  // STRICT: Alumni must have worked at the requested company (current OR previous)
  const timelineCheck = await query(
    `SELECT 1 FROM career_timeline WHERE alumni_id=$1 AND LOWER(company)=LOWER($2)
     UNION
     SELECT 1 FROM alumni WHERE id=$1 AND LOWER(company)=LOWER($2)`,
    [alumni_id, company]
  );
  if (!timelineCheck.rowCount) {
    throw Object.assign(
      new Error(`Referral can only be requested for companies where this alumni has worked. Please choose a valid company.`),
      { status: 422 }
    );
  }

  const dup = await query(
    `SELECT 1 FROM referral_requests
     WHERE student_id=$1 AND alumni_id=$2 AND company=$3 AND (college_id=$4 OR is_cross_college = true) AND status='pending'`,
    [studentId, alumni_id, company, collegeId]
  );
  if (dup.rowCount > 0) {
    throw Object.assign(new Error('You already have a pending referral request for this company with this alumni'), { status: 409 });
  }

  const r = await query(
    `INSERT INTO referral_requests (student_id, alumni_id, college_id, is_cross_college, company, job_title, resume_url, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [studentId, alumni_id, collegeId, isCrossCollege, company, job_title, resume_url, message]
  );

  const studentInfo = await query('SELECT full_name FROM students WHERE id=$1', [studentId]);
  const studentName = studentInfo.rows[0]?.full_name || 'A student';
  query(
    `INSERT INTO notifications (user_id, user_type, title, message, type, college_id)
     VALUES ($1,'alumni',$2,$3,'referral',$4)`,
    [alumni_id, 'New Referral Request', `${studentName} is requesting a referral for ${company}.`, collegeId]
  ).catch(() => {});

  return r.rows[0];
}

async function getMyReferralRequests(studentId, collegeId) {
  const r = await query(
    `SELECT rr.*, a.full_name AS alumni_name, a.company AS alumni_company
     FROM referral_requests rr
     JOIN alumni a ON a.id = rr.alumni_id
     WHERE rr.student_id = $1 AND (rr.college_id = $2 OR rr.is_cross_college = true)
     ORDER BY rr.created_at DESC`,
    [studentId, collegeId]
  );
  return r.rows;
}

async function getAlumniReferralRequests(alumniId, collegeId) {
  const r = await query(
    `SELECT rr.*, s.full_name AS student_name, s.email AS student_email, s.department, s.year
     FROM referral_requests rr
     JOIN students s ON s.id = rr.student_id
     WHERE rr.alumni_id = $1 AND (rr.college_id = $2 OR rr.is_cross_college = true)
     ORDER BY rr.created_at DESC`,
    [alumniId, collegeId]
  );
  return r.rows;
}

async function respondToReferral(requestId, alumniId, collegeId, { status, response }) {
  const allowed = ['accepted', 'rejected'];
  if (!allowed.includes(status)) {
    throw Object.assign(new Error(`Status must be one of: ${allowed.join(', ')}`), { status: 400 });
  }

  const r = await query(
    `UPDATE referral_requests
     SET status=$1, response=$2, updated_at=NOW()
     WHERE id=$3 AND alumni_id=$4 AND (college_id=$5 OR is_cross_college = true)
     RETURNING *`,
    [status, response, requestId, alumniId, collegeId]
  );
  if (!r.rowCount) {
    throw Object.assign(new Error('Request not found or you do not have permission'), { status: 404 });
  }

  const req = r.rows[0];
  const alumniInfo = await query('SELECT full_name FROM alumni WHERE id=$1', [alumniId]);
  const alumniName = alumniInfo.rows[0]?.full_name || 'An alumni';

  query(
    `INSERT INTO notifications (user_id, user_type, title, message, type, college_id)
     VALUES ($1,'student',$2,$3,'referral',$4)`,
    [
      req.student_id,
      `Referral Request ${status === 'accepted' ? 'Accepted' : 'Rejected'}`,
      `${alumniName} ${status === 'accepted' ? 'accepted' : 'declined'} your referral request for ${req.company}.`,
      collegeId,
    ]
  ).catch(() => {});

  return req;
}

module.exports = {
  requestMentorship, getMyMentorshipRequests, getAlumniMentorshipRequests, respondToMentorship,
  requestReferral, getMyReferralRequests, getAlumniReferralRequests, respondToReferral,
};
