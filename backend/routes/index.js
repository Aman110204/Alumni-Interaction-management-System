'use strict';
const express    = require('express');
const rateLimit  = require('express-rate-limit');
const router     = express.Router();
const { query }  = require('../config/database');

const {
  requireStudent, requireAlumni, requireAdmin, requireAuth,
} = require('../middleware/authMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate, rules } = require('../middleware/validate');

const studentCtrl = require('../controllers/studentController');
const alumniCtrl  = require('../controllers/alumniController');
const adminCtrl   = require('../controllers/adminController');
const msgCtrl     = require('../controllers/messagingController');
const connCtrl    = require('../controllers/connectionController');
const featureCtrl   = require('../controllers/featureControllers');
const profileCtrl   = require('../controllers/profileController');
const networkCtrl   = require('../controllers/networkController');
const tenantService = require('../services/tenantService');
const { success } = require('../utils/response');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: false,
});
const generalLimiter = rateLimit({ windowMs: 60*1000, max: 200, message: { success: false, message: 'Too many requests.' } });
const writeLimiter   = rateLimit({ windowMs: 60*1000, max: 30,  message: { success: false, message: 'Too many write requests.' } });
const requireTenantStudent = [...requireStudent, requireTenant];
const requireTenantAlumni = [...requireAlumni, requireTenant];
const requireTenantAdmin = [...requireAdmin, requireTenant];
const requireTenantAuth = [...requireAuth, requireTenant];

router.use(generalLimiter);

// ─── HEALTH ──────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => res.json({
  success: true, message: 'Gully Connect API is running', version: '3.0.0',
  timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development',
}));

router.get('/colleges', async (_req, res, next) => {
  try {
    const colleges = await tenantService.listColleges();
    return success(res, { colleges });
  } catch (err) {
    next(err);
  }
});

router.get('/tenant/me', requireTenantAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, title, event_date, location, event_type, status
         FROM events
        WHERE college_id = $1
        ORDER BY event_date ASC NULLS LAST
        LIMIT 5`,
      [req.college_id]
    );

    return success(res, {
      tenant: req.college_id,
      source: req.tenant?.source || null,
      events: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PASSWORD RESET ──────────────────────────────────────────────────────────
router.post('/auth/forgot-password',  authLimiter, studentCtrl.forgotPassword);
router.post('/auth/reset-password',   authLimiter, studentCtrl.resetPassword);
router.post('/auth/change-password',  requireAuth,  studentCtrl.changePassword);

// ─── STUDENT AUTH ─────────────────────────────────────────────────────────────
router.post('/students/register', authLimiter, rules.studentRegister, validate, studentCtrl.register);
router.post('/students/login',    authLimiter, rules.studentLogin,    validate, studentCtrl.login);
router.get( '/students/dashboard', requireTenantStudent, studentCtrl.getDashboard);
router.get( '/students/profile',   requireTenantStudent, studentCtrl.getProfile);
router.get( '/students/me',        requireTenantStudent, studentCtrl.getProfile);
router.put( '/students/profile',   requireTenantStudent, rules.studentProfileUpdate, validate, studentCtrl.updateProfile);

// Student education history
router.get(   '/students/education',     requireTenantStudent, alumniCtrl.getEducation);
router.post(  '/students/education',     requireTenantStudent, alumniCtrl.addEducation);
router.put(   '/students/education/:id', requireTenantStudent, alumniCtrl.updateEducation);
router.delete('/students/education/:id', requireTenantStudent, alumniCtrl.deleteEducation);

// ─── ALUMNI AUTH ──────────────────────────────────────────────────────────────
router.post('/alumni-auth/register', authLimiter, rules.alumniRegister, validate, alumniCtrl.register);
router.post('/alumni-auth/login',    authLimiter, rules.alumniLogin,    validate, alumniCtrl.login);
router.get( '/alumni-auth/dashboard', requireTenantAlumni, alumniCtrl.getDashboard);
router.get( '/alumni-auth/profile',   requireTenantAlumni, alumniCtrl.getProfile);
router.get( '/alumni-auth/me',        requireTenantAlumni, alumniCtrl.getProfile);
router.put( '/alumni-auth/profile',   requireTenantAlumni, rules.alumniProfileUpdate, validate, alumniCtrl.updateProfile);
// Feature 6: mentor toggle
router.patch('/alumni/profile',        requireTenantAlumni, alumniCtrl.updateProfile);

// Alumni career timeline
router.get( '/alumni/career-timeline', requireTenantAlumni, alumniCtrl.getCareerTimeline);
router.post('/alumni/career-timeline', requireTenantAlumni, alumniCtrl.addCareerEntry);

// Alumni education history
router.get(   '/alumni/education',     requireTenantAlumni, alumniCtrl.getEducation);
router.post(  '/alumni/education',     requireTenantAlumni, alumniCtrl.addEducation);
router.put(   '/alumni/education/:id', requireTenantAlumni, alumniCtrl.updateEducation);
router.delete('/alumni/education/:id', requireTenantAlumni, alumniCtrl.deleteEducation);

// Feature 4: Alumni browse students
router.get('/alumni/students', requireTenantAlumni, alumniCtrl.listStudents);

// Peer discovery: student↔student and alumni↔alumni
router.get('/students/peers', requireTenantStudent, alumniCtrl.listStudents);
router.get('/alumni/peers',   requireTenantAlumni,  alumniCtrl.listAlumni);

// ─── ALUMNI DIRECTORY ────────────────────────────────────────────────────────
router.get('/alumni/filter-options', requireTenantAuth, alumniCtrl.getFilterOptions);
router.get('/alumni',                requireTenantAuth, rules.pagination, validate, alumniCtrl.listAlumni);
router.get('/alumni/:id',            requireTenantAuth, rules.idParam,   validate, alumniCtrl.getAlumniById);

// Feature 5: Students browse alumni (alias of /alumni with mentor-filter)
router.get('/students/alumni', requireTenantStudent, (req, res, next) => {
  req.query.mentor_only = req.query.mentor_only || undefined;
  alumniCtrl.listAlumni(req, res, next);
});

// ─── ADMIN AUTH & MANAGEMENT ──────────────────────────────────────────────────
router.post('/admin/login', authLimiter, rules.adminLogin, validate, adminCtrl.login);
router.get( '/admin/dashboard', requireAdmin, requireTenant, adminCtrl.getDashboard);
router.get( '/admin/reports',   requireAdmin, requireTenant, adminCtrl.getReports);

router.get(   '/admin/students',               requireAdmin, requireTenant, rules.pagination, validate, adminCtrl.getStudents);
router.get(   '/admin/students/:id/profile',   requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.getStudentProfile);
router.patch( '/admin/students/:id/approve',   requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.approveStudent);
router.patch( '/admin/students/:id/reject',    requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.rejectStudent);
router.delete('/admin/students/:id',           requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.deleteStudent);

router.post(  '/admin/alumni',               requireAdmin, requireTenant, adminCtrl.createAlumni);
router.get(   '/admin/alumni',               requireAdmin, requireTenant, rules.pagination, validate, adminCtrl.getAlumniList);
router.get(   '/admin/alumni/pending',       requireAdmin, requireTenant, adminCtrl.getPendingAlumni);
router.get(   '/admin/pending-alumni',       requireAdmin, requireTenant, adminCtrl.getPendingAlumni);
router.get(   '/admin/alumni/:id/profile',   requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.getAlumniProfile);
router.patch( '/admin/alumni/:id/approve',   requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.approveAlumni);
router.put(   '/admin/approve-alumni/:id',   requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.approveAlumni);
router.put(   '/admin/reject-alumni/:id',    requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.rejectAlumni);
router.patch( '/admin/alumni/:id/reject',    requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.rejectAlumni);
router.delete('/admin/alumni/:id',           requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.deleteAlumni);
router.post(  '/admin/alumni/:id/career',    requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.addCareerEntry);

router.get(   '/admin/announcements',     requireAdmin, requireTenant, adminCtrl.getAnnouncements);
router.post(  '/admin/announcements',     requireAdmin, requireTenant, adminCtrl.createAnnouncement);
router.delete('/admin/announcements/:id', requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.deleteAnnouncement);

router.get('/announcements', requireTenantAuth, (req, res, next) => {
  const adminService = require('../services/adminService');
  adminService.getAnnouncements({
    ...req.query,
    targetRole: req.user.role,
    collegeId: req.college_id,
    department: req.user.department,
    batch: req.user.graduation_year || req.user.year,
  })
    .then(data => success(res, data))
    .catch(next);
});

router.post(  '/admin/events',    requireAdmin, requireTenant, rules.createEvent, validate, adminCtrl.createEvent);
router.get(   '/admin/events',    requireAdmin, requireTenant, (req, res, next) => {
  const eventsService = require('../services/eventsService');
  eventsService.listEvents({ ...req.query, collegeId: req.college_id }).then(data => success(res, data)).catch(next);
});
router.put(   '/admin/events/:id',  requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.updateEvent);
router.delete('/admin/events/:id',  requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.deleteEvent);

router.get(   '/admin/opportunities',             requireAdmin, requireTenant, rules.pagination, validate, adminCtrl.getOpportunities);
router.patch( '/admin/opportunities/:id/status',  requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.updateOpportunityStatus);
router.delete('/admin/opportunities/:id',         requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.closeOpportunity);

router.get(   '/admin/mentorship',     requireAdmin, requireTenant, rules.pagination, validate, adminCtrl.getMentorshipRequests);
router.get(   '/admin/referrals',      requireAdmin, requireTenant, rules.pagination, validate, adminCtrl.getReferralRequests);
router.delete('/admin/referrals/:id',  requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.deleteReferral);
router.delete('/admin/mentorship/:id', requireAdmin, requireTenant, rules.idParam, validate, adminCtrl.deleteMentorship);

// ─── EVENTS ──────────────────────────────────────────────────────────────────
router.get(   '/events',                  requireTenantAuth,    rules.pagination, validate, featureCtrl.listEvents);
router.get(   '/events/my-registrations', requireTenantStudent, featureCtrl.getMyEventRegistrations);
router.get(   '/events/:id',              requireTenantAuth,    rules.idParam, validate, featureCtrl.getEvent);
router.post(  '/events/:id/register',     requireTenantStudent, writeLimiter, rules.idParam, validate, featureCtrl.registerForEvent);
router.delete('/events/:id/register',     requireTenantStudent, rules.idParam, validate, featureCtrl.cancelEventRegistration);

// ─── OPPORTUNITIES ───────────────────────────────────────────────────────────
router.get( '/opportunities',                 requireTenantAuth,    rules.pagination, validate, featureCtrl.listOpportunities);
router.get( '/opportunities/my-applications', requireTenantStudent, featureCtrl.getMyApplications);
router.get( '/opportunities/:id',             requireTenantAuth,    rules.idParam, validate, featureCtrl.getOpportunity);
router.post('/opportunities/:id/apply',       requireTenantStudent, writeLimiter, rules.idParam, validate, featureCtrl.applyForOpportunity);

router.post(  '/alumni-opportunities',     requireTenantAlumni, writeLimiter, rules.createOpportunity, validate, featureCtrl.createOpportunity);
router.get(   '/alumni-opportunities',     requireTenantAlumni, featureCtrl.getAlumniOpportunities);
router.put(   '/alumni-opportunities/:id', requireTenantAlumni, writeLimiter, rules.idParam, rules.updateOpportunity, validate, featureCtrl.updateOpportunity);
router.delete('/alumni-opportunities/:id', requireTenantAlumni, rules.idParam, validate, featureCtrl.deleteOpportunity);

// ─── MENTORSHIP ──────────────────────────────────────────────────────────────
router.post( '/mentorship/request',           requireTenantStudent, writeLimiter, rules.mentorshipRequest, validate, featureCtrl.requestMentorship);
router.get(  '/mentorship/my-requests',       requireTenantStudent, featureCtrl.getMyMentorshipRequests);
router.get(  '/alumni-mentorship',            requireTenantAlumni,  featureCtrl.getAlumniMentorshipRequests);
router.patch('/alumni-mentorship/:id/respond', requireTenantAlumni, rules.mentorshipResponse, validate, featureCtrl.respondToMentorship);

// ─── REFERRAL ────────────────────────────────────────────────────────────────
router.post( '/referral/request',             requireTenantStudent, writeLimiter, rules.referralRequest, validate, featureCtrl.requestReferral);
router.get(  '/referral/my-requests',         requireTenantStudent, featureCtrl.getMyReferralRequests);
router.get(  '/alumni-referral',              requireTenantAlumni,  featureCtrl.getAlumniReferralRequests);
router.patch('/alumni-referral/:id/respond',  requireTenantAlumni, rules.referralResponse, validate, featureCtrl.respondToReferral);

// ─── CONNECTIONS ─────────────────────────────────────────────────────────────
router.get( '/connections',                            requireTenantAuth, connCtrl.listRequests);
router.get( '/connections/incoming',                   requireTenantAuth, connCtrl.listIncoming);
router.get( '/connections/outgoing',                   requireTenantAuth, connCtrl.listOutgoing);
router.get( '/connections/accepted',                   requireTenantAuth, connCtrl.listAccepted);
router.post('/connections/request',                    requireTenantAuth, writeLimiter, rules.connectionRequest, validate, connCtrl.createRequest);
router.patch('/connections/:id/respond',               requireTenantAuth, rules.connectionResponse, validate, connCtrl.respond);
// Aliases for accept/reject
router.put(  '/connections/:id/accept',                requireTenantAuth, connCtrl.accept);
router.put(  '/connections/:id/reject',                requireTenantAuth, connCtrl.reject);
router.get(  '/connections/status/:otherType/:otherId', requireTenantAuth, connCtrl.getStatus);

// ─── MESSAGING ───────────────────────────────────────────────────────────────
router.get( '/conversations',                             requireTenantAuth, msgCtrl.listConversations);
router.post('/conversations',                             requireTenantAuth, writeLimiter, msgCtrl.createConversation);
router.get( '/conversations/:conversationId/messages',    requireTenantAuth, msgCtrl.getMessages);
router.post('/conversations/:conversationId/messages',    requireTenantAuth, writeLimiter, rules.sendMessage, validate, msgCtrl.sendMessage);

router.get( '/messages/conversations', requireTenantAuth, msgCtrl.listConversations);
router.post('/messages/conversations', requireTenantAuth, writeLimiter, msgCtrl.createConversation);
router.get( '/messages/unread-count',  requireTenantAuth, msgCtrl.getUnreadCount);
router.post('/messages/send',          requireTenantAuth, writeLimiter, rules.sendMessage, validate, msgCtrl.legacySend);
// Intro message: one allowed per student→alumni pair without connection
router.post('/messages/intro',         requireTenantStudent, writeLimiter, msgCtrl.sendIntroMsg);
router.get( '/messages/:userId',       requireTenantAuth, msgCtrl.getLegacyMessages);
router.post('/messages',               requireTenantAuth, writeLimiter, rules.sendMessage, validate, msgCtrl.sendMessage);

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
router.get(  '/notifications',               requireTenantAuth, rules.pagination, validate, featureCtrl.getNotifications);
router.get(  '/notifications/unread-count',  requireTenantAuth, featureCtrl.getNotifUnreadCount);
router.patch('/notifications/mark-all-read', requireTenantAuth, featureCtrl.markAllNotifsRead);
router.patch('/notifications/:id/read',      requireTenantAuth, rules.idParam, validate, featureCtrl.markNotifRead);

// ─── HISTORY ─────────────────────────────────────────────────────────────────
router.get('/history', requireTenantStudent, featureCtrl.getHistory);

// ─── FULL PROFILE (LinkedIn-style) ───────────────────────────────────────────
// ─── UNIFIED NETWORK ─────────────────────────────────────────────────────────
// Single endpoint for both students and alumni.
// Backend decides what to return based on req.user.role:
//   student → alumni only (same college unless scope=all_colleges)
//   alumni  → alumni + students (same college unless scope=all_colleges)
router.get('/network',                              requireTenantAuth, networkCtrl.getNetwork);
router.get('/network/grouped',                      requireTenantAuth, networkCtrl.getNetworkGrouped);
router.get('/network/groups',                       requireTenantAuth, networkCtrl.getNetworkGroups);
router.get('/network/hierarchy',                    requireTenantAuth, networkCtrl.getNetworkHierarchy);
router.get('/network/search',                       requireTenantAuth, networkCtrl.searchNetwork);
router.get('/network/group/:groupType/:groupKey',   requireTenantAuth, networkCtrl.getGroupMembers);

// GET /api/profile/:userId?type=alumni|student
router.get('/profile/:userId', requireTenantAuth, profileCtrl.getFullProfile);

// ─── ALUMNI COMPANIES (for referral validation) ───────────────────────────────
// GET /api/alumni/:id/companies
router.get('/alumni/:id/companies', requireTenantAuth, profileCtrl.getAlumniCompanies);
router.get('/alumni/:id/mutuals',   requireTenantAuth, profileCtrl.getMutuals);

// ─── ALUMNI GROUPED ───────────────────────────────────────────────────────────
// GET /api/alumni/grouped?type=college|batch|company
router.get('/alumni/grouped', requireTenantAuth, profileCtrl.getAlumniGrouped);

module.exports = router;
