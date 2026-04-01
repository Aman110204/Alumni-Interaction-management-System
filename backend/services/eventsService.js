'use strict';
const { query } = require('../config/database');

// ─── EVENTS ───────────────────────────────────────────────────────────────────

async function listEvents({ page = 1, limit = 20, status, event_type, organizer, search, collegeId } = {}) {
  page  = parseInt(page)  || 1;
  limit = parseInt(limit) || 20;
  const offset = (page - 1) * limit;
  const params = [collegeId];
  const conditions = ['e.college_id = $1'];

  if (status) {
    params.push(status);
    conditions.push(`e.status = $${params.length}`);
  }
  if (event_type) {
    params.push(event_type);
    conditions.push(`e.event_type = $${params.length}`);
  }
  if (organizer) {
    params.push(`%${organizer}%`);
    conditions.push(`e.organizer ILIKE $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(e.title ILIKE $${params.length} OR e.description ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countParams = [...params];

  params.push(limit, offset);
  const r = await query(
    `SELECT e.*,
            (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) AS registered_count
     FROM events e ${where}
     ORDER BY e.event_date ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const cnt = await query(`SELECT COUNT(*) FROM events e ${where}`, countParams);

  return {
    events: r.rows,
    total:  parseInt(cnt.rows[0].count),
    page, limit,
    pages:  Math.ceil(parseInt(cnt.rows[0].count) / limit) || 1,
  };
}

async function getEventById(id, collegeId) {
  const r = await query(
    `SELECT e.*,
            (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) AS registered_count
     FROM events e WHERE e.id = $1 AND e.college_id = $2`,
    [id, collegeId]
  );
  if (!r.rowCount) throw Object.assign(new Error('Event not found'), { status: 404 });
  return r.rows[0];
}

async function registerForEvent(eventId, studentId, collegeId) {
  const event = await getEventById(eventId, collegeId);
  if (event.status === 'cancelled') {
    throw Object.assign(new Error('This event has been cancelled'), { status: 400 });
  }
  if (event.max_capacity && parseInt(event.registered_count) >= event.max_capacity) {
    throw Object.assign(new Error('Event is at full capacity'), { status: 400 });
  }
  try {
    await query(
      'INSERT INTO event_registrations (event_id, student_id, college_id) VALUES ($1, $2, $3)',
      [eventId, studentId, collegeId]
    );
  } catch (err) {
    if (err.code === '23505') {
      throw Object.assign(new Error('Already registered for this event'), { status: 409 });
    }
    throw err;
  }
  return { event_id: eventId, student_id: studentId };
}

async function getMyRegistrations(studentId, collegeId) {
  const r = await query(
    `SELECT e.*, er.registered_at
     FROM events e
     JOIN event_registrations er ON er.event_id = e.id
     WHERE er.student_id = $1 AND er.college_id = $2
     ORDER BY e.event_date DESC`,
    [studentId, collegeId]
  );
  return r.rows;
}

async function cancelRegistration(eventId, studentId, collegeId) {
  const r = await query(
    'DELETE FROM event_registrations WHERE event_id=$1 AND student_id=$2 AND college_id=$3 RETURNING id',
    [eventId, studentId, collegeId]
  );
  if (!r.rowCount) {
    throw Object.assign(new Error('Registration not found'), { status: 404 });
  }
  return { event_id: eventId, student_id: studentId };
}

module.exports = { listEvents, getEventById, registerForEvent, cancelRegistration, getMyRegistrations };
