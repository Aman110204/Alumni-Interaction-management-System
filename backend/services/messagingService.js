'use strict';
const { query, pool } = require('../config/database');
const connectionService = require('./connectionService');
const { getUserCollegeId } = require('./tenantService');

async function resolveConversationCollegeId(p1Id, type1, p2Id, type2, providedCollegeId) {
  const [collegeA, collegeB] = await Promise.all([
    getUserCollegeId(type1, p1Id),
    getUserCollegeId(type2, p2Id),
  ]);

  if (collegeA !== collegeB) {
    throw Object.assign(new Error('Cross-college access is not allowed'), { status: 403 });
  }
  if (providedCollegeId && providedCollegeId !== collegeA) {
    throw Object.assign(new Error('Invalid college context for this conversation'), { status: 403 });
  }

  return collegeA;
}

async function getOrCreateConversation(p1IdOrStudentId, p1TypeOrAlumniId, p2Id, p2Type, collegeId, options = {}) {
  let p1Id;
  let type1;
  let type2;
  const allowCrossCollege = !!options.allowCrossCollege;

  if (typeof p1TypeOrAlumniId === 'number' && p2Id === undefined) {
    p1Id = p1IdOrStudentId;
    type1 = 'student';
    p2Id = p1TypeOrAlumniId;
    type2 = 'alumni';
  } else {
    p1Id = p1IdOrStudentId;
    type1 = p1TypeOrAlumniId;
    type2 = p2Type;
  }

  const [collegeA, collegeB] = await Promise.all([
    getUserCollegeId(type1, p1Id),
    getUserCollegeId(type2, p2Id),
  ]);
  const isCrossCollege = collegeA !== collegeB;
  if (isCrossCollege && !allowCrossCollege) {
    throw Object.assign(new Error('Cross-college messaging requires explicit opt-in'), { status: 403 });
  }
  const resolvedCollegeId = isCrossCollege
    ? (collegeId || collegeA)
    : await resolveConversationCollegeId(p1Id, type1, p2Id, type2, collegeId);

  const r = await query(`
    SELECT c.id FROM conversations c
    JOIN conversation_participants cp1
      ON cp1.conversation_id = c.id AND cp1.participant_id = $1 AND cp1.participant_type = $3
    JOIN conversation_participants cp2
      ON cp2.conversation_id = c.id AND cp2.participant_id = $2 AND cp2.participant_type = $4
    WHERE (c.college_id = $5 OR c.is_cross_college = true)
  `, [p1Id, p2Id, type1, type2, resolvedCollegeId]);

  if (r.rowCount > 0) return r.rows[0].id;

  if (type1 !== 'admin' && type2 !== 'admin') {
    await connectionService.assertConnected(p1Id, type1, p2Id, type2, resolvedCollegeId);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const conv = await client.query(
      `INSERT INTO conversations (college_id, is_cross_college, user1_id, user1_type, user2_id, user2_type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [resolvedCollegeId, isCrossCollege, p1Id, type1, p2Id, type2]
    );
    const cid = conv.rows[0].id;
    await client.query(
      `INSERT INTO conversation_participants (conversation_id, participant_id, participant_type)
       VALUES ($1, $2, $4), ($1, $3, $5)`,
      [cid, p1Id, p2Id, type1, type2]
    );
    await client.query('COMMIT');
    return cid;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listConversations(userId, userType, collegeId) {
  const r = await query(`
    SELECT
      c.id AS conversation_id,
      c.updated_at,
      cp_other.participant_id   AS other_id,
      cp_other.participant_type AS other_type,
      CASE
        WHEN cp_other.participant_type = 'student' THEN s.full_name
        WHEN cp_other.participant_type = 'alumni'  THEN a.full_name
        ELSE adm.full_name
      END AS other_name,
      CASE WHEN cp_other.participant_type = 'alumni' THEN a.company ELSE NULL END AS other_company,
      CASE WHEN cp_other.participant_type = 'alumni' THEN a.designation ELSE NULL END AS other_designation,
      CASE WHEN cp_other.participant_type = 'student' THEN s.department ELSE NULL END AS other_department,
      (SELECT m.message    FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
      (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.is_read = false
         AND NOT (m.sender_id = $1 AND m.sender_type = $2)) AS unread_count
    FROM conversations c
    JOIN conversation_participants cp_me
      ON cp_me.conversation_id = c.id AND cp_me.participant_id = $1 AND cp_me.participant_type = $2
    JOIN conversation_participants cp_other
      ON cp_other.conversation_id = c.id
     AND NOT (cp_other.participant_id = $1 AND cp_other.participant_type = $2)
    LEFT JOIN students s   ON s.id   = cp_other.participant_id AND cp_other.participant_type = 'student'
    LEFT JOIN alumni   a   ON a.id   = cp_other.participant_id AND cp_other.participant_type = 'alumni'
    LEFT JOIN admins   adm ON adm.id = cp_other.participant_id AND cp_other.participant_type = 'admin'
    WHERE c.college_id = $3 OR c.is_cross_college = true
    ORDER BY last_message_at DESC NULLS LAST
  `, [userId, userType, collegeId]);

  return r.rows;
}

async function getMessages(conversationId, userId, userType, collegeId, { page = 1, limit = 50 } = {}) {
  page = parseInt(page) || 1;
  limit = Math.min(parseInt(limit) || 50, 100);

  const access = await query(
    `SELECT 1 FROM conversation_participants cp
     JOIN conversations c ON c.id = cp.conversation_id
     WHERE cp.conversation_id = $1 AND cp.participant_id = $2 AND cp.participant_type = $3 AND (c.college_id = $4 OR c.is_cross_college = true)`,
    [conversationId, userId, userType, collegeId]
  );
  if (!access.rowCount) throw Object.assign(new Error('Access denied to this conversation'), { status: 403 });

  const offset = (page - 1) * limit;
  const r = await query(`
    SELECT m.id, m.sender_id, m.sender_type, m.message, m.is_read, m.created_at,
      CASE
        WHEN m.sender_type = 'student' THEN s.full_name
        WHEN m.sender_type = 'alumni'  THEN a.full_name
        ELSE adm.full_name
      END AS sender_name
    FROM messages m
    LEFT JOIN students s   ON s.id   = m.sender_id AND m.sender_type = 'student'
    LEFT JOIN alumni   a   ON a.id   = m.sender_id AND m.sender_type = 'alumni'
    LEFT JOIN admins   adm ON adm.id = m.sender_id AND m.sender_type = 'admin'
    WHERE m.conversation_id = $1 AND (m.college_id = $4 OR m.is_cross_college = true)
    ORDER BY m.created_at DESC LIMIT $2 OFFSET $3
  `, [conversationId, limit, offset, collegeId]);

  query(
    `UPDATE messages SET is_read = true
     WHERE conversation_id = $1 AND (college_id = $4 OR is_cross_college = true)
       AND is_read = false AND NOT (sender_id = $2 AND sender_type = $3)`,
    [conversationId, userId, userType, collegeId]
  ).catch(() => {});

  return r.rows.reverse();
}

async function sendMessage(conversationId, senderId, senderType, collegeId, messageText) {
  const trimmed = (messageText || '').trim();
  if (!trimmed) throw Object.assign(new Error('Message cannot be empty'), { status: 400 });

  const access = await query(
    `SELECT 1 FROM conversation_participants cp
     JOIN conversations c ON c.id = cp.conversation_id
     WHERE cp.conversation_id = $1 AND cp.participant_id = $2 AND cp.participant_type = $3 AND (c.college_id = $4 OR c.is_cross_college = true)`,
    [conversationId, senderId, senderType, collegeId]
  );
  if (!access.rowCount) throw Object.assign(new Error('Access denied to this conversation'), { status: 403 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO messages (conversation_id, sender_id, sender_type, college_id, is_cross_college, message)
       SELECT $1,$2,$3,c.college_id,c.is_cross_college,$4
       FROM conversations c
       WHERE c.id = $1
       RETURNING *`,
      [conversationId, senderId, senderType, trimmed]
    );
    await client.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1 AND (college_id = $2 OR is_cross_college = true)', [conversationId, collegeId]);
    await client.query(
      `INSERT INTO notifications (user_id, user_type, title, message, type, link, college_id)
       SELECT cp.participant_id, cp.participant_type,
              'New Message', $2, 'message', '/messages', $3
       FROM conversation_participants cp
       WHERE cp.conversation_id = $1
         AND NOT (cp.participant_id = $4 AND cp.participant_type = $5)`,
      [conversationId, trimmed.slice(0, 80) + (trimmed.length > 80 ? '...' : ''), collegeId, senderId, senderType]
    );
    await client.query('COMMIT');
    return r.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function sendMessageToUser(studentId, alumniId, senderId, senderType, collegeId, messageText, options = {}) {
  const cid = await getOrCreateConversation(studentId, 'student', alumniId, 'alumni', collegeId, options);
  return sendMessage(cid, senderId, senderType, collegeId, messageText);
}

async function getUnreadCount(userId, userType, collegeId) {
  const r = await query(`
    SELECT COUNT(*) AS count FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    JOIN conversations c ON c.id = m.conversation_id
    WHERE cp.participant_id = $1 AND cp.participant_type = $2
      AND (c.college_id = $3 OR c.is_cross_college = true) AND (m.college_id = $3 OR m.is_cross_college = true)
      AND m.is_read = false AND NOT (m.sender_id = $1 AND m.sender_type = $2)
  `, [userId, userType, collegeId]);
  return parseInt(r.rows[0].count);
}

async function getLegacyMessages(currentId, currentType, collegeId, otherId, otherType) {
  const resolvedOtherType = otherType || (currentType === 'student' ? 'alumni' : 'student');
  const cid = await getOrCreateConversation(currentId, currentType, otherId, resolvedOtherType, collegeId);
  return getMessages(cid, currentId, currentType, collegeId);
}



/**
 * sendIntroMessage — allows ONE intro message alongside a mentorship request
 * without requiring an accepted connection. Creates a "intro-only" conversation
 * flagged so it cannot be used for further messaging until connected.
 */
async function sendIntroMessage(studentId, alumniId, collegeId, messageText) {
  const trimmed = (messageText || '').trim();
  if (!trimmed) throw Object.assign(new Error('Intro message cannot be empty'), { status: 400 });
  if (trimmed.length > 500) throw Object.assign(new Error('Intro message must be 500 characters or fewer'), { status: 400 });

  // Validate same-tenant
  const [sCol, aCol] = await Promise.all([
    getUserCollegeId('student', studentId),
    getUserCollegeId('alumni', alumniId),
  ]);
  const isCrossCollege = sCol !== aCol;
  const resolvedCollegeId = isCrossCollege ? sCol : sCol;
  if (!isCrossCollege && sCol !== collegeId) {
    throw Object.assign(new Error('Invalid college context'), { status: 403 });
  }

  // Check if intro already sent (one intro per student-alumni pair)
  const existing = await query(
    `SELECT c.id FROM conversations c
     JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.participant_id = $1 AND cp1.participant_type = 'student'
     JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.participant_id = $2 AND cp2.participant_type = 'alumni'
     WHERE (c.college_id = $3 OR c.is_cross_college = true) AND c.is_intro_only = true
     LIMIT 1`,
    [studentId, alumniId, resolvedCollegeId]
  );
  if (existing.rowCount > 0) {
    throw Object.assign(new Error('You have already sent an intro message to this alumni'), { status: 409 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const conv = await client.query(
      `INSERT INTO conversations (college_id, is_cross_college, user1_id, user1_type, user2_id, user2_type, is_intro_only)
       VALUES ($1, $2, $3, 'student', $4, 'alumni', true) RETURNING id`,
      [resolvedCollegeId, isCrossCollege, studentId, alumniId]
    );
    const cid = conv.rows[0].id;
    await client.query(
      `INSERT INTO conversation_participants (conversation_id, participant_id, participant_type)
       VALUES ($1, $2, 'student'), ($1, $3, 'alumni')`,
      [cid, studentId, alumniId]
    );
    const msg = await client.query(
      `INSERT INTO messages (conversation_id, sender_id, sender_type, college_id, is_cross_college, message)
       VALUES ($1, $2, 'student', $3, $4, $5) RETURNING *`,
      [cid, studentId, resolvedCollegeId, isCrossCollege, trimmed]
    );
    await client.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [cid]);
    await client.query(
      `INSERT INTO notifications (user_id, user_type, title, message, type, link, college_id)
       VALUES ($1, 'alumni', 'Intro Message', $2, 'message', '/alumni/messages', $3)`,
      [alumniId, trimmed.slice(0, 80) + (trimmed.length > 80 ? '…' : ''), resolvedCollegeId]
    );
    await client.query('COMMIT');
    return { conversation_id: cid, message: msg.rows[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * upgradeIntroConversation — called when a connection is accepted;
 * lifts is_intro_only flag so full messaging is enabled.
 */
async function upgradeIntroConversation(studentId, alumniId, collegeId) {
  await query(
    `UPDATE conversations SET is_intro_only = false
     WHERE (college_id = $3 OR is_cross_college = true)
       AND is_intro_only = true
       AND (
         (user1_id = $1 AND user1_type = 'student' AND user2_id = $2 AND user2_type = 'alumni')
         OR
         (user1_id = $2 AND user1_type = 'alumni'  AND user2_id = $1 AND user2_type = 'student')
       )`,
    [studentId, alumniId, collegeId]
  );
}

module.exports = {
  getOrCreateConversation,
  listConversations,
  getMessages,
  sendMessage,
  sendMessageToUser,
  getUnreadCount,
  getLegacyMessages,
  sendIntroMessage,
  upgradeIntroConversation,
};
