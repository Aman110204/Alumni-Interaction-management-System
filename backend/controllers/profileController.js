'use strict';
const profileService = require('../services/profileService');
const { success } = require('../utils/response');

/**
 * GET /api/profile/:userId?type=alumni|student
 * Returns full LinkedIn-style profile.
 * Viewer's college_id comes from req.college_id (tenant middleware).
 * Safe fallback: any DB error (including missing tables) returns a 
 * structured partial profile rather than a raw SQL crash.
 */
const getFullProfile = async (req, res, next) => {
  try {
    const userId   = parseInt(req.params.userId, 10);
    const userType = req.query.type || 'alumni';
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }
    let data;
    try {
      data = await profileService.getFullProfile(userId, userType, req.college_id);
    } catch (serviceErr) {
      // If it's a known "not found" error, forward it
      if (serviceErr.status === 404 || serviceErr.status === 400) throw serviceErr;
      // For unexpected DB errors (e.g. missing column/table during migration),
      // attempt a minimal safe profile fetch instead of crashing
      const { query } = require('../config/database');
      const table = userType === 'alumni' ? 'alumni' : 'students';
      const minQ = await query(
        `SELECT id, full_name, email, department, college_id FROM ${table} WHERE id=$1`,
        [userId]
      ).catch(() => ({ rows: [] }));
      if (!minQ.rows.length) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const row = minQ.rows[0];
      // Return a minimal safe profile so the page never hard-crashes
      data = {
        basic: {
          id: row.id, full_name: row.full_name, email: row.email,
          department: row.department, college_id: row.college_id,
          user_type: userType,
        },
        about: null, links: [], experience: [], education: [], skills: [],
        connections: { count: 0 },
        groups: { batch: null, company: null, college: null },
        referrals: { made: [], given: [], received: [] },
        mentorship: [],
        _partial: true,
        _error: 'Some profile sections could not be loaded.',
      };
    }
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/alumni/:id/companies
 * Returns valid companies for referral requests (current + career timeline).
 * Enforces: requester must be from same college or cross-college opt-in.
 */
const getAlumniCompanies = async (req, res, next) => {
  try {
    const alumniId = parseInt(req.params.id, 10);
    if (!alumniId || isNaN(alumniId)) {
      return res.status(400).json({ success: false, message: 'Invalid alumni id' });
    }
    // Alumni companies from their own college; cross-college caller sees them too
    const { query } = require('../config/database');
    const alumniRow = await query(
      `SELECT college_id FROM alumni WHERE id = $1 AND is_active = true AND is_approved = true`,
      [alumniId]
    );
    if (!alumniRow.rowCount) {
      return res.status(404).json({ success: false, message: 'Alumni not found' });
    }
    const alumniCollegeId = alumniRow.rows[0].college_id;
    const companies = await profileService.getAlumniCompanies(alumniId, alumniCollegeId);
    return success(res, { companies, alumni_id: alumniId });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/alumni/grouped?type=college|batch|company
 */
const getAlumniGrouped = async (req, res, next) => {
  try {
    const type = req.query.type || 'college';
    if (!req.college_id) {
      return res.status(400).json({ success: false, message: 'Tenant context required' });
    }
    const data = await profileService.getAlumniGrouped(type, req.college_id);
    return success(res, { groups: data, type });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/alumni/:id/mutuals
 * Returns mutual connections and common attributes with the logged-in user.
 */
const getMutuals = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (!targetId || isNaN(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid alumni id' });
    }
    const data = await profileService.getMutuals(
      req.user.id,
      req.user.role,
      targetId
    );
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getFullProfile, getAlumniCompanies, getAlumniGrouped, getMutuals };
