'use strict';
const msgService = require('../services/messagingService');
const { success, created, error } = require('../utils/response');

/**
 * GET /api/conversations
 * GET /api/messages/conversations  (legacy)
 * Returns all conversations for the authenticated user.
 */
const listConversations = async (req, res, next) => {
  try {
    const data = await msgService.listConversations(req.user.id, req.user.role, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/conversations/:conversationId/messages?page=1&limit=50
 * Returns paginated messages for a conversation.
 * Verifies user is a participant before returning data.
 */
const getMessages = async (req, res, next) => {
  try {
    const cid = parseInt(req.params.conversationId, 10);
    if (!cid || isNaN(cid)) return error(res, 'Invalid conversation ID');
    const data = await msgService.getMessages(cid, req.user.id, req.user.role, req.college_id, req.query);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/conversations/:conversationId/messages
 * Body: { message }
 *
 * POST /api/messages
 * Body: { other_id, other_type?, message, conversation_id? }
 *
 * Sends a message. Verifies sender is a participant.
 */
const sendMessage = async (req, res, next) => {
  try {
    const { message, other_id, conversation_id } = req.body;
    if (!message || !message.trim()) return error(res, 'Message text is required');

    // Route 1: direct conversation ID (new API)
    let cid = parseInt(req.params.conversationId, 10) || parseInt(conversation_id, 10);

    // Route 2: legacy — derive conversation from other_id
    if (!cid && other_id) {
      let studentId, alumniId;
      if (req.user.role === 'student') {
        studentId = req.user.id; alumniId = parseInt(other_id, 10);
      } else {
        alumniId  = req.user.id; studentId = parseInt(other_id, 10);
      }
      if (!alumniId || !studentId) return error(res, 'Valid other_id is required');
      cid = await msgService.getOrCreateConversation(
        studentId,
        alumniId,
        undefined,
        undefined,
        req.college_id,
        { allowCrossCollege: req.body.allow_cross_college === true || req.body.allow_cross_college === 'true' }
      );
    }

    if (!cid) return error(res, 'conversation_id or other_id is required');

    const data = await msgService.sendMessage(cid, req.user.id, req.user.role, req.college_id, message.trim());
    return created(res, data, 'Message sent');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/messages/:userId  — legacy route (student-side)
 * Returns conversation with another user, creating it if needed.
 */
const getLegacyMessages = async (req, res, next) => {
  try {
    const otherId = parseInt(req.params.userId, 10);
    if (!otherId || isNaN(otherId)) return error(res, 'Invalid user ID');
    const data = await msgService.getLegacyMessages(req.user.id, req.user.role, req.college_id, otherId);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/messages/unread-count
 * Returns total unread message count.
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await msgService.getUnreadCount(req.user.id, req.user.role, req.college_id);
    return success(res, { count });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/messages/send  — legacy send
 * Body: { other_id, message }
 * Accepts both 'other_id' and legacy 'receiver_id'.
 */
const legacySend = async (req, res, next) => {
  try {
    // Accept both legacy field names
    const other_id = req.body.other_id || req.body.receiver_id;
    const { message } = req.body;

    if (!message || !message.trim()) return error(res, 'Message is required');
    if (!other_id) return error(res, 'other_id (or receiver_id) is required');

    let studentId, alumniId;
    if (req.user.role === 'student') {
      studentId = req.user.id; alumniId = parseInt(other_id, 10);
    } else {
      alumniId  = req.user.id; studentId = parseInt(other_id, 10);
    }

    if (!alumniId || !studentId) return error(res, 'Invalid other_id');

    const data = await msgService.sendMessageToUser(
      studentId,
      alumniId,
      req.user.id,
      req.user.role,
      req.college_id,
      message.trim(),
      { allowCrossCollege: req.body.allow_cross_college === true || req.body.allow_cross_college === 'true' }
    );
    return created(res, data, 'Message sent');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/conversations
 * POST /api/messages/conversations
 * Body: { other_id, other_type? }
 * Creates or returns an existing conversation.
 * Supports admin<->student, admin<->alumni, student<->alumni.
 */
const createConversation = async (req, res, next) => {
  try {
    const { other_id, other_type } = req.body;
    if (!other_id) return error(res, 'other_id is required');

    const otherId   = parseInt(other_id, 10);
    // Default other_type: alumni for students, student for alumni, student for admin
    const defaultOtherType = req.user.role === 'student' ? 'alumni'
                           : req.user.role === 'alumni'  ? 'student'
                           : 'student';
    const otherType = other_type || defaultOtherType;
    if (!otherId) return error(res, 'Invalid other_id');

    const cid = await msgService.getOrCreateConversation(
      req.user.id,
      req.user.role,
      otherId,
      otherType,
      req.college_id,
      { allowCrossCollege: req.body.allow_cross_college === true || req.body.allow_cross_college === 'true' }
    );
    const convs = await msgService.listConversations(req.user.id, req.user.role, req.college_id);
    const conv  = convs.find(c => c.conversation_id === cid) || { conversation_id: cid };
    return success(res, conv, 'Conversation ready');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listConversations,
  createConversation,
  getMessages,
  sendMessage,
  getLegacyMessages,
  getUnreadCount,
  legacySend,
};

/**
 * POST /api/messages/intro
 * Send a single intro message alongside a mentorship request — no connection required.
 * Body: { alumni_id, message }
 */
const sendIntroMsg = async (req, res, next) => {
  try {
    const { alumni_id, message } = req.body;
    if (!alumni_id || !message) {
      return res.status(400).json({ success: false, message: 'alumni_id and message are required' });
    }
    const ms = require('../services/messagingService');
    const result = await ms.sendIntroMessage(
      req.user.id,
      parseInt(alumni_id, 10),
      req.college_id,
      message
    );
    return res.status(201).json({ success: true, data: result, message: 'Intro message sent' });
  } catch (err) {
    next(err);
  }
};

// sendIntroMsg is exported via the main module.exports block above — added inline:
module.exports.sendIntroMsg = sendIntroMsg;
