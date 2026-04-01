'use strict';
const { body, param, query, validationResult } = require('express-validator');

const collegeIdRule = body('college_id')
  .optional({ nullable: true, checkFalsy: true })
  .trim()
  .matches(/^[a-zA-Z0-9_-]{2,80}$/)
  .withMessage('college_id must be 2-80 chars and use letters, numbers, _ or -');

/**
 * validate — run after express-validator chains.
 * If there are validation errors, responds with 400 and error list.
 * Otherwise calls next().
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// ─── Validation Rule Sets ────────────────────────────────────────────────────

const rules = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  studentRegister: [
    collegeIdRule,
    body('fullName')
      .trim().notEmpty().withMessage('Full name is required')
      .isLength({ min: 2, max: 120 }).withMessage('Full name must be 2–120 characters'),
    body('usn')
      .trim().notEmpty().withMessage('USN is required')
      .isLength({ min: 3, max: 30 }).withMessage('USN must be 3–30 characters')
      .matches(/^[A-Za-z0-9]+$/).withMessage('USN must be alphanumeric'),
    body('email')
      .trim().isEmail().withMessage('Valid email is required')
      .normalizeEmail()
      .isLength({ max: 120 }).withMessage('Email too long'),
    body('password')
      .isLength({ min: 6, max: 100 }).withMessage('Password must be 6–100 characters'),
    body('department')
      .optional().trim().isLength({ max: 80 }).withMessage('Department too long'),
    body('year')
      .optional().trim().isLength({ max: 20 }).withMessage('Year too long'),
    body('phone')
      .optional().trim()
      .matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Invalid phone number'),
  ],

  studentLogin: [
    collegeIdRule,
    body('email')
      .trim().isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ max: 100 }).withMessage('Password too long'),
  ],

  alumniRegister: [
    collegeIdRule,
    body('fullName')
      .trim().notEmpty().withMessage('Full name is required')
      .isLength({ min: 2, max: 120 }).withMessage('Full name must be 2–120 characters'),
    body('email')
      .trim().isEmail().withMessage('Valid email is required')
      .normalizeEmail()
      .isLength({ max: 120 }).withMessage('Email too long'),
    body('password')
      .isLength({ min: 6, max: 100 }).withMessage('Password must be 6–100 characters'),
    body('company')
      .optional().trim().isLength({ max: 120 }).withMessage('Company name too long'),
    body('designation')
      .optional().trim().isLength({ max: 120 }).withMessage('Designation too long'),
    body('location')
      .optional().trim().isLength({ max: 120 }).withMessage('Location too long'),
    body('graduationYear')
      .optional()
      .isInt({ min: 1950, max: new Date().getFullYear() + 5 })
      .withMessage('Invalid graduation year'),
  ],

  alumniLogin: [
    collegeIdRule,
    body('email')
      .trim().isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ max: 100 }).withMessage('Password too long'),
  ],

  adminLogin: [
    collegeIdRule,
    body('login').optional().trim().notEmpty().withMessage('Login field cannot be empty'),
    body('username').optional().trim(),
    body('email').optional().trim().isEmail().withMessage('Invalid email'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ max: 100 }).withMessage('Password too long'),
  ],

  // ── Profile Updates ───────────────────────────────────────────────────────
  studentProfileUpdate: [
    body('full_name').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2–120 chars'),
    body('phone').optional().trim().matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Invalid phone number'),
    body('bio').optional().trim().isLength({ max: 1000 }).withMessage('Bio max 1000 chars'),
    body('skills').optional().trim().isLength({ max: 500 }).withMessage('Skills max 500 chars'),
    body('headline').optional().trim().isLength({ max: 200 }).withMessage('Headline max 200 chars'),
    body('location').optional().trim().isLength({ max: 120 }).withMessage('Location too long'),
    body('linkedin_url').optional({ nullable: true, checkFalsy: true }).trim().isURL().withMessage('LinkedIn URL must be valid'),
    body('github_url').optional({ nullable: true, checkFalsy: true }).trim().isURL().withMessage('GitHub URL must be valid'),
    body('resume_url').optional({ nullable: true, checkFalsy: true }).trim().isURL().withMessage('Resume URL must be a valid URL'),
  ],

  alumniProfileUpdate: [
    body('full_name')
      .optional().trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2–120 chars'),
    body('company')
      .optional().trim().isLength({ max: 120 }).withMessage('Company too long'),
    body('designation')
      .optional().trim().isLength({ max: 120 }).withMessage('Designation too long'),
    body('location')
      .optional().trim().isLength({ max: 120 }).withMessage('Location too long'),
    body('phone')
      .optional().trim()
      .matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Invalid phone number'),
    body('bio')
      .optional().trim().isLength({ max: 1000 }).withMessage('Bio max 1000 chars'),
    body('linkedin_url')
      .optional({ nullable: true, checkFalsy: true }).trim().isURL().withMessage('LinkedIn URL must be valid'),
    body('available_mentorship')
      .optional().isBoolean().withMessage('Must be boolean'),
    body('available_referral')
      .optional().isBoolean().withMessage('Must be boolean'),
    // FIX: Add skills, department, graduation_year
    body('skills')
      .optional().trim().isLength({ max: 500 }).withMessage('Skills max 500 chars'),
    body('department')
      .optional().trim().isLength({ max: 80 }).withMessage('Department too long'),
    body('graduation_year')
      .optional({ nullable: true, checkFalsy: true })
      .isInt({ min: 1990, max: 2100 }).withMessage('Invalid graduation year'),
    body('headline').optional().trim().isLength({ max: 200 }).withMessage('Headline max 200 chars'),
    body('github_url').optional({ nullable: true, checkFalsy: true }).trim().isURL().withMessage('GitHub URL must be valid'),
  ],

  // ── Messages ──────────────────────────────────────────────────────────────
  sendMessage: [
    body('message')
      .trim().notEmpty().withMessage('Message text is required')
      .isLength({ min: 1, max: 2000 }).withMessage('Message must be 1-2000 characters'),
  ],

  connectionRequest: [
    body('other_id')
      .notEmpty().withMessage('other_id is required')
      .isInt({ min: 1 }).withMessage('other_id must be a positive integer'),
    body('other_type')
      .trim().notEmpty().withMessage('other_type is required')
      .isIn(['student', 'alumni']).withMessage('other_type must be student or alumni'),
    body('message')
      .optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('Message max 1000 chars'),
  ],

  connectionResponse: [
    body('status')
      .trim().notEmpty().withMessage('Status is required')
      .isIn(['accepted', 'rejected']).withMessage('Status must be accepted or rejected'),
  ],

  // Events ────────────────────────────────────────────────────────────────
  createEvent: [
    body('title')
      .trim().notEmpty().withMessage('Event title is required')
      .isLength({ min: 3, max: 200 }).withMessage('Title must be 3–200 chars'),
    body('event_date')
      .notEmpty().withMessage('Event date is required')
      .isISO8601().withMessage('Event date must be a valid ISO date'),
    body('description')
      .optional().trim().isLength({ max: 2000 }).withMessage('Description max 2000 chars'),
    body('location')
      .optional().trim().isLength({ max: 200 }).withMessage('Location max 200 chars'),
    body('event_type')
      .optional().trim().isLength({ max: 60 }).withMessage('Event type max 60 chars'),
    body('max_capacity')
      .optional()
      .isInt({ min: 1, max: 100000 }).withMessage('Capacity must be 1–100000'),
  ],

  // ── Opportunities ─────────────────────────────────────────────────────────
  createOpportunity: [
    body('title')
      .trim().notEmpty().withMessage('Opportunity title is required')
      .isLength({ min: 3, max: 200 }).withMessage('Title must be 3–200 chars'),
    body('company')
      .optional().trim().isLength({ max: 120 }).withMessage('Company name too long'),
    body('location')
      .optional().trim().isLength({ max: 120 }).withMessage('Location too long'),
    body('job_type')
      .optional().trim()
      .isIn(['Full-time','Part-time','Internship','Contract','Freelance'])
      .withMessage('Invalid job type'),
    body('description')
      .optional().trim().isLength({ max: 3000 }).withMessage('Description max 3000 chars'),
    body('skills_required')
      .optional().trim().isLength({ max: 500 }).withMessage('Skills max 500 chars'),
    body('salary')
      .optional().trim().isLength({ max: 80 }).withMessage('Salary field too long'),
    body('apply_link')
      .optional({ nullable: true, checkFalsy: true }).trim().isURL().withMessage('Apply link must be a valid URL'),
    body('deadline')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601().withMessage('Deadline must be a valid date'),
  ],

  // FIX: All fields optional for partial updates
  updateOpportunity: [
    body('title')
      .optional().trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3–200 chars'),
    body('company')
      .optional().trim().isLength({ max: 120 }).withMessage('Company name too long'),
    body('location')
      .optional().trim().isLength({ max: 120 }).withMessage('Location too long'),
    body('job_type')
      .optional().trim()
      .isIn(['Full-time','Part-time','Internship','Contract','Freelance'])
      .withMessage('Invalid job type'),
    body('description')
      .optional().trim().isLength({ max: 3000 }).withMessage('Description max 3000 chars'),
    body('skills_required')
      .optional().trim().isLength({ max: 500 }).withMessage('Skills max 500 chars'),
    body('salary')
      .optional().trim().isLength({ max: 80 }).withMessage('Salary field too long'),
    body('apply_link')
      .optional({ nullable: true, checkFalsy: true }).trim().isURL().withMessage('Apply link must be a valid URL'),
    body('deadline')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601().withMessage('Deadline must be a valid date'),
    body('status')
      .optional().trim()
      .isIn(['active','closed']).withMessage('Status must be active or closed'),
  ],

  // ── Mentorship ────────────────────────────────────────────────────────────
  mentorshipRequest: [
    body('alumni_id')
      .notEmpty().withMessage('alumni_id is required')
      .isInt({ min: 1 }).withMessage('alumni_id must be a positive integer'),
    body('message')
      .optional().trim().isLength({ max: 1000 }).withMessage('Message max 1000 chars'),
  ],

  mentorshipResponse: [
    body('status')
      .notEmpty().withMessage('Status is required')
      .isIn(['accepted','rejected']).withMessage('Status must be accepted or rejected'),
    body('response')
      .optional().trim().isLength({ max: 1000 }).withMessage('Response max 1000 chars'),
  ],

  // ── Referral ──────────────────────────────────────────────────────────────
  referralRequest: [
    body('alumni_id')
      .notEmpty().withMessage('alumni_id is required')
      .isInt({ min: 1 }).withMessage('alumni_id must be a positive integer'),
    body('company')
      .trim().notEmpty().withMessage('Company is required')
      .isLength({ max: 120 }).withMessage('Company name too long'),
    body('job_title')
      .trim().notEmpty().withMessage('Job title is required')
      .isLength({ max: 120 }).withMessage('Job title too long'),
    body('resume_url')
      .optional().trim().isURL().withMessage('Resume URL must be valid'),
    body('message')
      .optional().trim().isLength({ max: 1000 }).withMessage('Message max 1000 chars'),
  ],

  referralResponse: [
    body('status')
      .notEmpty().withMessage('Status is required')
      .isIn(['accepted','rejected']).withMessage('Status must be accepted or rejected'),
    body('response')
      .optional().trim().isLength({ max: 1000 }).withMessage('Response max 1000 chars'),
  ],

  // ── Pagination ────────────────────────────────────────────────────────────
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1, max: 10000 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],

  // ── Param IDs ─────────────────────────────────────────────────────────────
  idParam: [
    param('id')
      .isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  ],
};

module.exports = { validate, rules };

