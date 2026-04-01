'use strict';
const alumniService = require('../services/alumniService');
const { success, created, error } = require('../utils/response');

const register = async (req, res, next) => {
  try {
    const data = await alumniService.registerAlumni({
      ...req.body,
      college_id: req.tenant?.college_id || req.body.college_id,
    });
    return created(res, data, 'Registration submitted. Awaiting admin approval.');
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return error(res, 'Email and password are required');
    const data = await alumniService.loginAlumni({
      email: email.toLowerCase().trim(),
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
    const data = await alumniService.getDashboard(req.user.id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const data = await alumniService.getProfile(req.user.id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const data = await alumniService.updateProfile(req.user.id, req.college_id, req.body);
    return success(res, data, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
};

const listAlumni = async (req, res, next) => {
  try {
    // Enhanced search: name, email, skills, company, department, batch, course
    const { page, limit, search, searchField, department, company, batch, course, skills, sort_by, sort, scope } = req.query;
    const data = await alumniService.listAlumni({
      page:        parseInt(page, 10)  || 1,
      limit:       parseInt(limit, 10) || 12,
      search,
      searchField,
      department,
      company,
      batch,
      course,
      skills,
      sort_by:     sort_by || sort,
      scope:       scope || 'my_college',
      collegeId:   req.college_id,
    });
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const getAlumniById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return error(res, 'Invalid alumni ID');
    const data = await alumniService.getAlumniById(id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const getFilterOptions = async (req, res, next) => {
  try {
    const { scope } = req.query;
    const data = await alumniService.getFilterOptions(req.college_id, scope || 'my_college');
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const getCareerTimeline = async (req, res, next) => {
  try {
    const data = await alumniService.getCareerTimeline(req.user.id, req.college_id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const addCareerEntry = async (req, res, next) => {
  try {
    const data = await alumniService.addCareerEntry({ ...req.body, alumniId: req.user.id, collegeId: req.college_id });
    return created(res, data, 'Career entry added');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register, login, getDashboard, getProfile, updateProfile,
  listAlumni, getAlumniById, getFilterOptions,
  getCareerTimeline, addCareerEntry,
};

// Feature 4: Alumni list students
const listStudents = async (req, res, next) => {
  try {
    const { page, limit, search, searchField, department, branch, batch, skills, sort } = req.query;
    const data = await alumniService.listStudents({
      page:        parseInt(page, 10)  || 1,
      limit:       parseInt(limit, 10) || 12,
      search, searchField, department, branch,
      batch, skills, sort,
      collegeId:   req.college_id,
    });
    return success(res, data);
  } catch (err) { next(err); }
};

// Feature 7: Education history
const getEducation = async (req, res, next) => {
  try {
    const data = await alumniService.getEducationHistory(req.user.id, req.user.role, req.college_id);
    return success(res, data);
  } catch (err) { next(err); }
};

const addEducation = async (req, res, next) => {
  try {
    const { institution, degree, field_of_study, start_year, end_year } = req.body;
    const data = await alumniService.addEducationEntry({
      userId: req.user.id, userRole: req.user.role,
      collegeId: req.college_id,
      institution, degree, fieldOfStudy: field_of_study,
      startYear: start_year, endYear: end_year,
    });
    return created(res, data, 'Education entry added');
  } catch (err) { next(err); }
};

const updateEducation = async (req, res, next) => {
  try {
    const entryId = parseInt(req.params.id, 10);
    const { institution, degree, field_of_study, start_year, end_year } = req.body;
    const data = await alumniService.updateEducationEntry({
      entryId, userId: req.user.id, userRole: req.user.role,
      collegeId: req.college_id,
      institution, degree, fieldOfStudy: field_of_study,
      startYear: start_year, endYear: end_year,
    });
    return success(res, data, 'Education entry updated');
  } catch (err) { next(err); }
};

const deleteEducation = async (req, res, next) => {
  try {
    const entryId = parseInt(req.params.id, 10);
    const data = await alumniService.deleteEducationEntry(entryId, req.user.id, req.user.role, req.college_id);
    return success(res, data, 'Education entry deleted');
  } catch (err) { next(err); }
};

// Re-export with new handlers
const _orig = module.exports;
module.exports = {
  ..._orig,
  listStudents,
  getEducation, addEducation, updateEducation, deleteEducation,
};