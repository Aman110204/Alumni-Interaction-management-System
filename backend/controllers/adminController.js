'use strict';
const adminService = require('../services/adminService');
const { success, created, error } = require('../utils/response');

function currentCollegeId(req) {
  if (!req.college_id) {
    throw Object.assign(new Error('Tenant context is required'), { status: 400 });
  }
  return req.college_id;
}

const login = async (req, res, next) => {
  try {
    // Accept both 'login' and 'username'/'email' fields for flexibility
    const loginField = req.body.login || req.body.username || req.body.email;
    const { password } = req.body;
    if (!loginField || !password) return error(res, 'Username/email and password are required');
    const data = await adminService.loginAdmin({
      login: loginField,
      password,
      college_id: req.tenant?.college_id || req.body.college_id,
    });
    return success(res, data, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const data = await adminService.getDashboard(currentCollegeId(req));
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const getStudents = async (req, res, next) => {
  try {
    const data = await adminService.getStudents({ ...req.query, collegeId: currentCollegeId(req) });
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const getStudentProfile = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid student ID');
    const data = await adminService.getStudentProfile(id, currentCollegeId(req));
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid student ID');
    await adminService.deleteStudent(id, currentCollegeId(req));
    return success(res, {}, 'Student deleted successfully');
  } catch (err) {
    next(err);
  }
};

const approveStudent = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid student ID');
    const data = await adminService.approveStudent(id, currentCollegeId(req));
    return success(res, data, 'Student approved successfully');
  } catch (err) {
    next(err);
  }
};

const rejectStudent = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid student ID');
    const data = await adminService.rejectStudent(id, currentCollegeId(req));
    return success(res, data, 'Student approval revoked');
  } catch (err) {
    next(err);
  }
};

const getAlumniList = async (req, res, next) => {
  try {
    const data = await adminService.getAlumniList({ ...req.query, collegeId: currentCollegeId(req) });
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const getAlumniProfile = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid alumni ID');
    const data = await adminService.getAlumniProfile(id, currentCollegeId(req));
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const approveAlumni = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid alumni ID');
    const data = await adminService.approveAlumni(id, currentCollegeId(req));
    return success(res, data, 'Alumni approved successfully');
  } catch (err) {
    next(err);
  }
};

const rejectAlumni = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid alumni ID');
    const data = await adminService.rejectAlumni(id, currentCollegeId(req));
    return success(res, data, 'Alumni rejected');
  } catch (err) {
    next(err);
  }
};

const deleteAlumni = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid alumni ID');
    await adminService.deleteAlumni(id, currentCollegeId(req));
    return success(res, {}, 'Alumni deleted successfully');
  } catch (err) {
    next(err);
  }
};

const createEvent = async (req, res, next) => {
  try {
    const data = await adminService.createEvent({ ...req.body, adminId: req.user.id, collegeId: currentCollegeId(req) });
    return created(res, data, 'Event created successfully');
  } catch (err) {
    next(err);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid event ID');
    const data = await adminService.updateEvent(id, req.body, currentCollegeId(req));
    return success(res, data, 'Event updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid event ID');
    await adminService.deleteEvent(id, currentCollegeId(req));
    return success(res, {}, 'Event deleted successfully');
  } catch (err) {
    next(err);
  }
};

const getOpportunities = async (req, res, next) => {
  try {
    const data = await adminService.getOpportunities({ ...req.query, collegeId: currentCollegeId(req) });
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const updateOpportunityStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid opportunity ID');
    if (!req.body.status) return error(res, 'Status is required');
    const data = await adminService.updateOpportunityStatus(id, req.body.status, currentCollegeId(req));
    return success(res, data, 'Opportunity status updated');
  } catch (err) {
    next(err);
  }
};

/**
 * closeOpportunity — soft-close an opportunity instead of deleting.
 * Used for DELETE /admin/opportunities/:id
 */
const closeOpportunity = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid opportunity ID');
    const data = await adminService.updateOpportunityStatus(id, 'closed', currentCollegeId(req));
    return success(res, data, 'Opportunity closed');
  } catch (err) {
    next(err);
  }
};

const getReports = async (req, res, next) => {
  try {
    const data = await adminService.getReports(currentCollegeId(req));
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const deleteReferral = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid referral ID');
    await adminService.deleteReferral(id, currentCollegeId(req));
    return success(res, {}, 'Referral deleted successfully');
  } catch (err) { next(err); }
};

const deleteMentorship = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid mentorship ID');
    await adminService.deleteMentorship(id, currentCollegeId(req));
    return success(res, {}, 'Mentorship request deleted successfully');
  } catch (err) { next(err); }
};


const getMentorshipRequests = async (req, res, next) => {
  try {
    const data = await adminService.getMentorshipRequests({ ...req.query, collegeId: currentCollegeId(req) });
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const getReferralRequests = async (req, res, next) => {
  try {
    const data = await adminService.getReferralRequests({ ...req.query, collegeId: currentCollegeId(req) });
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const createAlumni = async (req, res, next) => {
  try {
    const data = await adminService.createAlumni({
      ...req.body,
      college_id: currentCollegeId(req),
    });
    return created(res, data, 'Alumni created successfully');
  } catch (err) {
    next(err);
  }
};

const getPendingAlumni = async (req, res, next) => {
  try {
    const data = await adminService.getPendingAlumni({ ...req.query, collegeId: currentCollegeId(req) });
    return success(res, data);
  } catch (err) { next(err); }
};

const createAnnouncement = async (req, res, next) => {
  try {
    const user = req.user;
    const data = await adminService.createAnnouncement({
      ...req.body,
      adminId: user.id,
      postedBy: user.full_name || user.username || 'Admin',
      collegeId: currentCollegeId(req),
    });
    return created(res, data, 'Announcement created');
  } catch (err) { next(err); }
};

const getAnnouncements = async (req, res, next) => {
  try {
    const data = await adminService.getAnnouncements({ ...req.query, collegeId: currentCollegeId(req) });
    return success(res, data);
  } catch (err) { next(err); }
};

const deleteAnnouncement = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid announcement ID');
    await adminService.deleteAnnouncement(id, currentCollegeId(req));
    return success(res, {}, 'Announcement deleted');
  } catch (err) { next(err); }
};

const addCareerEntry = async (req, res, next) => {
  try {
    const alumniId = parseInt(req.params.id, 10);
    if (!alumniId || isNaN(alumniId)) return error(res, 'Invalid alumni ID');
    const data = await adminService.addCareerEntry({ ...req.body, alumniId, collegeId: currentCollegeId(req) });
    return created(res, data, 'Career entry added');
  } catch (err) { next(err); }
};

module.exports = {
  login, getDashboard,
  getStudents, getStudentProfile, approveStudent, rejectStudent, deleteStudent,
  getAlumniList, getAlumniProfile, approveAlumni, rejectAlumni, deleteAlumni, createAlumni,
  getPendingAlumni,
  createEvent, updateEvent, deleteEvent,
  getOpportunities, updateOpportunityStatus, closeOpportunity,
  getReports,
  getMentorshipRequests, getReferralRequests, deleteReferral, deleteMentorship,
  createAnnouncement, getAnnouncements, deleteAnnouncement,
  addCareerEntry,
};
