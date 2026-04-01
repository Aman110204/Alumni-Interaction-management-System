'use strict';
const { query } = require('../config/database');

async function getStudentHistory(studentId, collegeId) {
  const [apps, events, mentorship, referrals] = await Promise.all([
    query(`
      SELECT ja.id, ja.created_at, ja.status, 'application' AS type,
             o.title, o.company, o.job_type, o.location
      FROM job_applications ja
      JOIN opportunities o ON o.id = ja.opportunity_id AND o.college_id = ja.college_id
      WHERE ja.student_id = $1 AND ja.college_id = $2
      ORDER BY ja.created_at DESC LIMIT 50
    `, [studentId, collegeId]),
    query(`
      SELECT er.id, er.registered_at AS created_at, 'event_registration' AS type,
             e.title, e.event_date, e.location, e.event_type, e.status
      FROM event_registrations er
      JOIN events e ON e.id = er.event_id AND e.college_id = er.college_id
      WHERE er.student_id = $1 AND er.college_id = $2
      ORDER BY er.registered_at DESC LIMIT 50
    `, [studentId, collegeId]),
    query(`
      SELECT mr.id, mr.created_at, mr.status, 'mentorship' AS type,
             mr.message, a.full_name AS with_name, a.company
      FROM mentorship_requests mr
      JOIN alumni a ON a.id = mr.alumni_id AND a.college_id = mr.college_id
      WHERE mr.student_id = $1 AND mr.college_id = $2
      ORDER BY mr.created_at DESC LIMIT 50
    `, [studentId, collegeId]),
    query(`
      SELECT rr.id, rr.created_at, rr.status, 'referral' AS type,
             rr.company, rr.job_title, a.full_name AS with_name
      FROM referral_requests rr
      JOIN alumni a ON a.id = rr.alumni_id AND a.college_id = rr.college_id
      WHERE rr.student_id = $1 AND rr.college_id = $2
      ORDER BY rr.created_at DESC LIMIT 50
    `, [studentId, collegeId]),
  ]);

  return [
    ...apps.rows,
    ...events.rows,
    ...mentorship.rows,
    ...referrals.rows,
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

module.exports = { getStudentHistory };
