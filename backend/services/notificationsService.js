'use strict';
const { query } = require('../config/database');

async function getNotifications(userId, userType, collegeId, { page = 1, limit = 20 } = {}) {
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 20;
  const offset = (page - 1) * limit;

  const r = await query(
    `SELECT * FROM notifications
     WHERE user_id=$1 AND user_type=$2 AND college_id=$3
     ORDER BY created_at DESC
     LIMIT $4 OFFSET $5`,
    [userId, userType, collegeId, limit, offset]
  );
  const cnt = await query(
    'SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND user_type=$2 AND college_id=$3',
    [userId, userType, collegeId]
  );

  return {
    notifications: r.rows,
    total: parseInt(cnt.rows[0].count),
    page, limit,
    pages: Math.ceil(parseInt(cnt.rows[0].count) / limit) || 1,
  };
}

async function getUnreadCount(userId, userType, collegeId) {
  const r = await query(
    `SELECT COUNT(*) AS count FROM notifications
     WHERE user_id=$1 AND user_type=$2 AND college_id=$3 AND is_read=false`,
    [userId, userType, collegeId]
  );
  return parseInt(r.rows[0].count);
}

async function markRead(notificationId, userId, userType, collegeId) {
  await query(
    `UPDATE notifications SET is_read=true
     WHERE id=$1 AND user_id=$2 AND user_type=$3 AND college_id=$4`,
    [notificationId, userId, userType, collegeId]
  );
}

async function markAllRead(userId, userType, collegeId) {
  await query(
    'UPDATE notifications SET is_read=true WHERE user_id=$1 AND user_type=$2 AND college_id=$3',
    [userId, userType, collegeId]
  );
}

module.exports = { getNotifications, getUnreadCount, markRead, markAllRead };
