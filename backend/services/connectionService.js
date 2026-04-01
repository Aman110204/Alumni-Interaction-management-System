'use strict';
const { query, pool } = require('../config/database');
const { getUserCollegeId } = require('./tenantService');
// Lazy-require to avoid circular: messagingService → connectionService → messagingService
const getMessagingService = () => require('./messagingService');

async function getConnectionBetween(id1, type1, id2, type2, collegeId) {
  const r = await query(
    `SELECT * FROM connection_requests
     WHERE (college_id = $5 OR is_cross_college = true) AND (
       (requester_id=$1 AND requester_type=$2 AND recipient_id=$3 AND recipient_type=$4)
       OR
       (requester_id=$3 AND requester_type=$4 AND recipient_id=$1 AND recipient_type=$2)
     )
     ORDER BY created_at DESC LIMIT 1`,
    [id1, type1, id2, type2, collegeId]
  );
  return r.rows[0] || null;
}

async function assertConnected(id1, type1, id2, type2, collegeId) {
  const existing = await getConnectionBetween(id1, type1, id2, type2, collegeId);
  if (!existing || existing.status !== 'accepted') {
    throw Object.assign(new Error('You can message only after the connection request is accepted'), { status: 403 });
  }
  return existing;
}

async function getOrCreateConversationForPair(p1Id, p2Id, p1Type, p2Type, collegeId, client = null, isCrossCollege = false) {
  const db = client || { query: (sql, params) => require('../config/database').query(sql, params) };
  const existing = await db.query(
    `SELECT c.id
     FROM conversations c
     LEFT JOIN conversation_participants cp1
       ON cp1.conversation_id = c.id AND cp1.participant_id = $1 AND cp1.participant_type = $3
     LEFT JOIN conversation_participants cp2
       ON cp2.conversation_id = c.id AND cp2.participant_id = $2 AND cp2.participant_type = $4
     WHERE (c.college_id = $5 OR c.is_cross_college = true)
     LIMIT 1`,
    [p1Id, p2Id, p1Type, p2Type, collegeId]
  );
  if (existing.rowCount) return existing.rows[0].id;

  const conv = await db.query(
    `INSERT INTO conversations (college_id, is_cross_college, user1_id, user1_type, user2_id, user2_type)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [collegeId, !!isCrossCollege, p1Id, p1Type, p2Id, p2Type]
  );
  const conversationId = conv.rows[0].id;
  await db.query(
    `INSERT INTO conversation_participants (conversation_id, participant_id, participant_type)
     VALUES ($1, $2, $3), ($1, $4, $5)`,
    [conversationId, p1Id, p1Type, p2Id, p2Type]
  );
  return conversationId;
}

async function createConnectionRequest({ requesterId, requesterType, recipientId, recipientType, collegeId, message, allowCrossCollege = false }) {
  const validTypes = ['student', 'alumni', 'admin'];
  if (!validTypes.includes(requesterType) || !validTypes.includes(recipientType)) {
    throw Object.assign(new Error('Invalid user type'), { status: 400 });
  }
  if (requesterId === recipientId && requesterType === recipientType) {
    throw Object.assign(new Error('Cannot connect with yourself'), { status: 400 });
  }

  const [requesterCollegeId, recipientCollegeId] = await Promise.all([
    getUserCollegeId(requesterType, requesterId),
    getUserCollegeId(recipientType, recipientId),
  ]);
  const isCrossCollege = requesterCollegeId !== recipientCollegeId;
  if (isCrossCollege && !allowCrossCollege) {
    throw Object.assign(new Error('Cross-college connection requires explicit opt-in'), { status: 403 });
  }
  if (collegeId && collegeId !== requesterCollegeId) {
    throw Object.assign(new Error('Invalid college context for this connection request'), { status: 403 });
  }
  collegeId = requesterCollegeId;

  const current = await getConnectionBetween(requesterId, requesterType, recipientId, recipientType, collegeId);
  if (current?.status === 'accepted') return { ...current, already_connected: true };
  if (current?.status === 'pending') {
    const isOriginalRequester = current.requester_id === requesterId && current.requester_type === requesterType;
    if (isOriginalRequester) {
      throw Object.assign(new Error('A pending connection request already exists'), { status: 409 });
    }
  }

  let r;
  if (current) {
    r = await query(
      `UPDATE connection_requests
       SET requester_type=$1, requester_id=$2, recipient_type=$3, recipient_id=$4,
           message=$5, status='pending', responded_at=NULL, updated_at=NOW(), college_id=$7, is_cross_college=$8
       WHERE id=$6 RETURNING *`,
      [requesterType, requesterId, recipientType, recipientId, (message || '').trim() || null, current.id, collegeId, isCrossCollege]
    );
  } else {
    r = await query(
      `INSERT INTO connection_requests (requester_type, requester_id, recipient_type, recipient_id, message, status, responded_at, updated_at, college_id, is_cross_college)
       VALUES ($1,$2,$3,$4,$5,'pending',NULL,NOW(),$6,$7) RETURNING *`,
      [requesterType, requesterId, recipientType, recipientId, (message || '').trim() || null, collegeId, isCrossCollege]
    );
  }

  await query(
    `INSERT INTO notifications (user_id, user_type, title, message, type, link, college_id)
     VALUES ($1, $2, $3, $4, 'connection_request', $5, $6)`,
    [
      recipientId,
      recipientType,
      'New Connection Request',
      `${requesterType} sent you a connection request.`,
      `/${recipientType}/connections`,
      collegeId,
    ]
  );

  return r.rows[0];
}

async function respondToConnectionRequest(requestId, recipientId, recipientType, collegeId, status) {
  if (!['accepted', 'rejected'].includes(status)) {
    throw Object.assign(new Error('Status must be accepted or rejected'), { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reqRes = await client.query(
      `UPDATE connection_requests
       SET status=$1, responded_at=NOW(), updated_at=NOW()
       WHERE id=$2 AND (college_id=$5 OR is_cross_college=true) AND (
         (recipient_id=$3 AND recipient_type=$4)
         OR ($4 = 'admin' AND recipient_type='admin')
       ) RETURNING *`,
      [status, requestId, recipientId, recipientType, collegeId]
    );
    if (!reqRes.rowCount) {
      throw Object.assign(new Error('Connection request not found or you are not the recipient'), { status: 404 });
    }
    const req = reqRes.rows[0];

    let conversationId = null;
    if (status === 'accepted') {
        conversationId = await getOrCreateConversationForPair(
        req.requester_id, req.recipient_id, req.requester_type, req.recipient_type, req.college_id, client, req.is_cross_college
      );
      // Upgrade any intro-only conversation between these two users
      const studentId = req.requester_type === 'student' ? req.requester_id : req.recipient_id;
      const alumniId  = req.requester_type === 'alumni'  ? req.requester_id : req.recipient_id;
      if (studentId && alumniId) {
        getMessagingService().upgradeIntroConversation(studentId, alumniId, req.college_id).catch(() => {});
      }
    }

    await client.query(
      `INSERT INTO notifications (user_id, user_type, title, message, type, link, college_id)
       VALUES ($1, $2, $3, $4, 'connection_request', $5, $6)`,
      [
        req.requester_id,
        req.requester_type,
        status === 'accepted' ? 'Connection Approved' : 'Connection Declined',
        status === 'accepted'
          ? `${recipientType} accepted your connection request.`
          : `${recipientType} declined your connection request.`,
        `/${req.requester_type}/messages`,
        collegeId,
      ]
    );

    await client.query('COMMIT');
    return { ...req, conversation_id: conversationId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listMyConnectionRequests(userId, userType, collegeId) {
  const r = await query(
    `WITH viewer_ctx AS (
       SELECT s.department AS branch,
              s.year::text AS batch_year,
              NULL::text AS current_company,
              (
                SELECT ARRAY_REMOVE(ARRAY_AGG(LOWER(TRIM(eh.institution))), NULL)
                  FROM education_history eh
                 WHERE eh.user_id = $1 AND eh.user_role = $2 AND eh.college_id = $3
              ) AS education_institutions
         FROM students s
        WHERE $2 = 'student' AND s.id = $1 AND s.college_id = $3
       UNION ALL
       SELECT a.department AS branch,
              a.graduation_year::text AS batch_year,
              a.company::text AS current_company,
              (
                SELECT ARRAY_REMOVE(ARRAY_AGG(LOWER(TRIM(eh.institution))), NULL)
                  FROM education_history eh
                 WHERE eh.user_id = $1 AND eh.user_role = $2 AND eh.college_id = $3
              ) AS education_institutions
         FROM alumni a
        WHERE $2 = 'alumni' AND a.id = $1 AND a.college_id = $3
       UNION ALL
       SELECT NULL::varchar AS branch,
              NULL::text AS batch_year,
              NULL::text AS current_company,
              (
                SELECT ARRAY_REMOVE(ARRAY_AGG(LOWER(TRIM(eh.institution))), NULL)
                  FROM education_history eh
                 WHERE eh.user_id = $1 AND eh.user_role = $2 AND eh.college_id = $3
              ) AS education_institutions
        WHERE $2 = 'admin'
     )
     SELECT cr.*,
            cu.branch AS current_user_branch,
            cu.batch_year AS current_user_batch_year,
            cu.current_company AS current_user_company,
            cu.education_institutions AS current_user_education_institutions,
            CASE WHEN cr.requester_type='student' THEN rs.full_name
                 WHEN cr.requester_type='alumni'  THEN ra.full_name
                 ELSE radm.full_name END AS requester_name,
            CASE WHEN cr.recipient_type='student' THEN ts.full_name
                 WHEN cr.recipient_type='alumni'  THEN ta.full_name
                 ELSE tadm.full_name END AS recipient_name,
            CASE WHEN cr.requester_type='student' THEN rs.department
                 WHEN cr.requester_type='alumni'  THEN ra.department END AS requester_department,
            CASE WHEN cr.recipient_type='student' THEN ts.department
                 WHEN cr.recipient_type='alumni'  THEN ta.department END AS recipient_department,
            CASE WHEN cr.requester_type='student' THEN rs.department
                 WHEN cr.requester_type='alumni'  THEN ra.department END AS requester_branch,
            CASE WHEN cr.recipient_type='student' THEN ts.department
                 WHEN cr.recipient_type='alumni'  THEN ta.department END AS recipient_branch,
            CASE WHEN cr.requester_type='alumni'  THEN ra.company END AS requester_company,
            CASE WHEN cr.recipient_type='alumni'  THEN ta.company END AS recipient_company,
            CASE WHEN cr.requester_type='student' THEN rs.location
                 WHEN cr.requester_type='alumni'  THEN ra.location END AS requester_location,
            CASE WHEN cr.recipient_type='student' THEN ts.location
                 WHEN cr.recipient_type='alumni'  THEN ta.location END AS recipient_location,
            CASE WHEN cr.requester_type='alumni'  THEN ra.designation END AS requester_designation,
            CASE WHEN cr.recipient_type='alumni'  THEN ta.designation END AS recipient_designation,
            CASE WHEN cr.requester_type='alumni'  THEN ra.graduation_year::text
                 WHEN cr.requester_type='student' THEN rs.year::text END AS requester_graduation_year,
            CASE WHEN cr.recipient_type='alumni'  THEN ta.graduation_year::text
                 WHEN cr.recipient_type='student' THEN ts.year::text END AS recipient_graduation_year,
            CASE WHEN cr.requester_type='alumni'  THEN ra.graduation_year::text
                 WHEN cr.requester_type='student' THEN rs.year::text END AS requester_batch_year,
            CASE WHEN cr.recipient_type='alumni'  THEN ta.graduation_year::text
                 WHEN cr.recipient_type='student' THEN ts.year::text END AS recipient_batch_year,
            COALESCE(req_edu.education_institutions, ARRAY[]::text[]) AS requester_education_institutions,
            COALESCE(rec_edu.education_institutions, ARRAY[]::text[]) AS recipient_education_institutions,
            rc.name AS requester_college_name,
            tc.name AS recipient_college_name
     FROM connection_requests cr
     CROSS JOIN viewer_ctx cu
     LEFT JOIN students rs   ON rs.id   = cr.requester_id AND cr.requester_type='student'
     LEFT JOIN alumni ra     ON ra.id   = cr.requester_id AND cr.requester_type='alumni'
     LEFT JOIN admins radm   ON radm.id = cr.requester_id AND cr.requester_type='admin'
     LEFT JOIN students ts   ON ts.id   = cr.recipient_id AND cr.recipient_type='student'
     LEFT JOIN alumni ta     ON ta.id   = cr.recipient_id AND cr.recipient_type='alumni'
     LEFT JOIN admins tadm   ON tadm.id = cr.recipient_id AND cr.recipient_type='admin'
     LEFT JOIN colleges rc   ON rc.id = COALESCE(rs.college_id, ra.college_id, radm.college_id)::text
     LEFT JOIN colleges tc   ON tc.id = COALESCE(ts.college_id, ta.college_id, tadm.college_id)::text
     LEFT JOIN LATERAL (
       SELECT ARRAY_REMOVE(ARRAY_AGG(LOWER(TRIM(eh.institution))), NULL) AS education_institutions
         FROM education_history eh
        WHERE eh.user_id = cr.requester_id AND eh.user_role = cr.requester_type
     ) req_edu ON true
     LEFT JOIN LATERAL (
       SELECT ARRAY_REMOVE(ARRAY_AGG(LOWER(TRIM(eh.institution))), NULL) AS education_institutions
         FROM education_history eh
        WHERE eh.user_id = cr.recipient_id AND eh.user_role = cr.recipient_type
     ) rec_edu ON true
     WHERE (cr.college_id=$3 OR cr.is_cross_college=true) AND (
       (cr.requester_id=$1 AND cr.requester_type=$2)
       OR
       (cr.recipient_id=$1 AND cr.recipient_type=$2)
     )
     ORDER BY cr.updated_at DESC, cr.created_at DESC`,
    [userId, userType, collegeId]
  );
  return r.rows;
}

function normalizeGroupValue(value) {
  return String(value || '').trim().toLowerCase();
}

function addConnectionMatchFlags(rows, userId, userType) {
  return rows.map((row) => {
    const isRequesterSide = row.requester_id === userId && row.requester_type === userType;
    const currentCompany = normalizeGroupValue(row.current_user_company);
    const otherCompany = normalizeGroupValue(isRequesterSide ? row.recipient_company : row.requester_company);
    const currentEducation = new Set((row.current_user_education_institutions || []).map(normalizeGroupValue).filter(Boolean));
    const otherEducation = (isRequesterSide ? row.recipient_education_institutions : row.requester_education_institutions) || [];

    const companyMatch = Boolean(currentCompany && otherCompany && currentCompany === otherCompany);
    const educationMatch = otherEducation.some((institution) => currentEducation.has(normalizeGroupValue(institution)));

    return {
      ...row,
      company_match: companyMatch,
      education_match: educationMatch,
    };
  });
}

function listMyGroupedConnections(rows, userId, userType) {
  const grouped = {
    pending: [],
    classmates: [],
    batchmates: [],
    others: [],
  };

  for (const row of rows) {
    const isRequesterSide = row.requester_id === userId && row.requester_type === userType;
    if (row.status === 'pending') {
      grouped.pending.push(row);
      continue;
    }
    if (row.status !== 'accepted') continue;

    const currentBranch = normalizeGroupValue(row.current_user_branch);
    const currentBatchYear = normalizeGroupValue(row.current_user_batch_year);
    const otherBranch = normalizeGroupValue(isRequesterSide ? row.recipient_branch : row.requester_branch);
    const otherBatchYear = normalizeGroupValue(isRequesterSide ? row.recipient_batch_year : row.requester_batch_year);

    if (currentBatchYear && otherBatchYear && currentBatchYear === otherBatchYear) {
      if (currentBranch && otherBranch && currentBranch === otherBranch) {
        grouped.classmates.push(row);
      } else {
        grouped.batchmates.push(row);
      }
    } else {
      grouped.others.push(row);
    }
  }

  return grouped;
}

async function getConnectionStatus(userId, userType, collegeId, otherId, otherType) {
  return getConnectionBetween(userId, userType, otherId, otherType, collegeId);
}

function pairForUsers(userId, userType, otherId, otherType) {
  const order = { student: 0, alumni: 1, admin: 2 };
  if ((order[userType] ?? 99) <= (order[otherType] ?? 99)) {
    return { studentId: userId, alumniId: otherId };
  }
  return { studentId: otherId, alumniId: userId };
}

module.exports = {
  pairForUsers,
  assertConnected,
  createConnectionRequest,
  respondToConnectionRequest,
  listMyConnectionRequests,
  addConnectionMatchFlags,
  listMyGroupedConnections,
  getConnectionStatus,
  getConnectionBetween,
  getOrCreateConversationForPair,
};
