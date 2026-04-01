'use strict';
const studentService = require('../services/studentService');
const { success, created, error } = require('../utils/response');

/**
 * POST /api/students/register
 * Registers a new student.
 */
const register = async (req, res, next) => {
  try {
    const data = await studentService.registerStudent({
      ...req.body,
      college_id: req.tenant?.college_id || req.body.college_id,
    });
    return created(res, data, 'Registration successful. You can now log in.');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/students/login
 * Authenticates a student and returns a JWT.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return error(res, 'Email and password are required');
    const data = await studentService.loginStudent({
      email: email.toLowerCase().trim(),
      password,
      college_id: req.tenant?.college_id || req.body.college_id,
    });
    return success(res, data, 'Login successful');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/students/dashboard
 * Returns dashboard data for the authenticated student.
 */
const getDashboard = async (req, res, next) => {
  try {
    const data = await studentService.getDashboard(req.user.id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/students/profile
 * fKECCSdckcxkdcsc
 * SkcCSMMSCvdkdKFSKDKSK
 * Returns the student's full profile.
 */
const getProfile = async (req, res, next) => {
  try {
    const data = await studentService.getProfile(req.user.id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/students/profile
 * Updates the student's profile. Does NOT allow changing email/USN/password.
 */
const updateProfile = async (req, res, next) => {
  try {
    const data = await studentService.updateProfile(req.user.id, req.college_id, req.body);
    return success(res, data, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
};

// ── Password Reset (stub implementation — no email service) ──────────
const crypto = require('crypto');
const { query: dbQuery } = require('../config/database');
const { error: errResp, success: okResp } = require('../utils/response');

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return errResp(res, 'Email is required');
    // Always respond success to prevent user enumeration
    return okResp(res, {}, 'If your email is registered, you will receive a reset link.');
  } catch (err) { next(err); }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return errResp(res, 'Token and new password are required');
    return errResp(res, 'Password reset via email is not yet configured. Please contact admin.', 501);
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return errResp(res, 'Current and new password required');
    if (new_password.length < 8) return errResp(res, 'New password must be at least 8 characters');
    const r = await dbQuery('SELECT password_hash::TEXT AS password_hash FROM students WHERE id=$1', [req.user.id]);
    if (!r.rowCount) return errResp(res, 'User not found', 404);
    const valid = await bcrypt.compare(current_password, r.rows[0].password_hash);
    if (!valid) return errResp(res, 'Current password is incorrect', 401);
    const hash = await bcrypt.hash(new_password, 12);
    await dbQuery('UPDATE students SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
    return okResp(res, {}, 'Password changed successfully');
  } catch (err) { next(err); }
};

module.exports = {
  register,
  login,
  getDashboard,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
};
