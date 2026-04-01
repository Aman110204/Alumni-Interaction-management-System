'use strict';
const eventsService  = require('../services/eventsService');
const oppsService    = require('../services/opportunitiesService');
const mrService      = require('../services/mentorshipReferralService');
const notifService   = require('../services/notificationsService');
const historyService = require('../services/historyService');
const { success, created, error } = require('../utils/response');

// ─── EVENTS ───────────────────────────────────────────────────────────────────
const listEvents = async (req, res, next) => {
  try {
    const data = await eventsService.listEvents({ ...req.query, collegeId: req.college_id });
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const getEvent = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid event ID');
    const data = await eventsService.getEventById(id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const registerForEvent = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid event ID');
    const data = await eventsService.registerForEvent(id, req.user.id, req.college_id);
    return success(res, data, 'Successfully registered for event');
  } catch (err) {
    next(err);
  }
};

const cancelEventRegistration = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid event ID');
    const data = await eventsService.cancelRegistration(id, req.user.id, req.college_id);
    return success(res, data, 'Registration cancelled');
  } catch (err) {
    next(err);
  }
};

const getMyEventRegistrations = async (req, res, next) => {
  try {
    const data = await eventsService.getMyRegistrations(req.user.id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

// ─── OPPORTUNITIES ────────────────────────────────────────────────────────────
const listOpportunities = async (req, res, next) => {
  try {
    const data = await oppsService.listOpportunities({ ...req.query, collegeId: req.college_id });
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const getOpportunity = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid opportunity ID');
    const data = await oppsService.getOpportunityById(id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const applyForOpportunity = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid opportunity ID');
    const data = await oppsService.applyForOpportunity(id, req.user.id, req.college_id);
    return created(res, data, 'Application submitted successfully');
  } catch (err) {
    next(err);
  }
};

const getMyApplications = async (req, res, next) => {
  try {
    const data = await oppsService.getMyApplications(req.user.id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

// RBAC: Only alumni can post opportunities
const createOpportunity = async (req, res, next) => {
  try {
    const data = await oppsService.createOpportunity(req.user.id, req.college_id, req.body);
    return created(res, data, 'Opportunity posted successfully');
  } catch (err) {
    next(err);
  }
};

// FIX: Alumni can update their own opportunities
const updateOpportunity = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid opportunity ID');
    const data = await oppsService.updateOpportunity(id, req.user.id, req.college_id, req.body);
    return success(res, data, 'Opportunity updated successfully');
  } catch (err) {
    next(err);
  }
};

const getAlumniOpportunities = async (req, res, next) => {
  try {
    const data = await oppsService.getAlumniOpportunities(req.user.id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const deleteOpportunity = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid opportunity ID');
    // Service verifies ownership — alumni can only delete their own
    await oppsService.deleteOpportunity(id, req.user.id, req.college_id);
    return success(res, {}, 'Opportunity deleted');
  } catch (err) {
    next(err);
  }
};

// ─── MENTORSHIP ───────────────────────────────────────────────────────────────
const requestMentorship = async (req, res, next) => {
  try {
    const data = await mrService.requestMentorship(req.user.id, req.college_id, req.body);
    return created(res, data, 'Mentorship request sent');
  } catch (err) {
    next(err);
  }
};

const getMyMentorshipRequests = async (req, res, next) => {
  try {
    const data = await mrService.getMyMentorshipRequests(req.user.id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const getAlumniMentorshipRequests = async (req, res, next) => {
  try {
    const data = await mrService.getAlumniMentorshipRequests(req.user.id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const respondToMentorship = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid request ID');
    const data = await mrService.respondToMentorship(id, req.user.id, req.college_id, req.body);
    return success(res, data, 'Response recorded');
  } catch (err) {
    next(err);
  }
};

// ─── REFERRAL ─────────────────────────────────────────────────────────────────
const requestReferral = async (req, res, next) => {
  try {
    const data = await mrService.requestReferral(req.user.id, req.college_id, req.body);
    return created(res, data, 'Referral request sent');
  } catch (err) {
    next(err);
  }
};

const getMyReferralRequests = async (req, res, next) => {
  try {
    const data = await mrService.getMyReferralRequests(req.user.id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const getAlumniReferralRequests = async (req, res, next) => {
  try {
    const data = await mrService.getAlumniReferralRequests(req.user.id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const respondToReferral = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid request ID');
    const data = await mrService.respondToReferral(id, req.user.id, req.college_id, req.body);
    return success(res, data, 'Response recorded');
  } catch (err) {
    next(err);
  }
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const data = await notifService.getNotifications(req.user.id, req.user.role, req.college_id, req.query);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const getNotifUnreadCount = async (req, res, next) => {
  try {
    const count = await notifService.getUnreadCount(req.user.id, req.user.role, req.college_id);
    return success(res, { count });
  } catch (err) {
    next(err);
  }
};

const markNotifRead = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid notification ID');
    await notifService.markRead(id, req.user.id, req.user.role, req.college_id);
    return success(res, {}, 'Marked as read');
  } catch (err) {
    next(err);
  }
};

const markAllNotifsRead = async (req, res, next) => {
  try {
    await notifService.markAllRead(req.user.id, req.user.role, req.college_id);
    return success(res, {}, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

// ─── HISTORY ──────────────────────────────────────────────────────────────────
const getHistory = async (req, res, next) => {
  try {
    const data = await historyService.getStudentHistory(req.user.id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listEvents, getEvent, registerForEvent, cancelEventRegistration, getMyEventRegistrations,
  listOpportunities, getOpportunity, applyForOpportunity, getMyApplications,
  createOpportunity, updateOpportunity, getAlumniOpportunities, deleteOpportunity,
  requestMentorship, getMyMentorshipRequests, getAlumniMentorshipRequests, respondToMentorship,
  requestReferral, getMyReferralRequests, getAlumniReferralRequests, respondToReferral,
  getNotifications, getNotifUnreadCount, markNotifRead, markAllNotifsRead,
  getHistory,
};
