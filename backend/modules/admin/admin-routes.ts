import { Router } from 'express';
import { adminController } from '../../controllers/admin-controller';
import { rules, validate } from '../../middleware/validate';
import { requireAdmin } from '../../middleware/auth-middleware';
import { attachTenantContext } from '../../middleware/tenant-middleware';

const router = Router();

// Public
router.post('/login', rules.adminLogin, validate, adminController.login);

// Protected admin routes
router.use(...requireAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/pending-users', adminController.getPendingUsers);

// Students
router.get('/students', adminController.listStudents);
router.patch('/students/:id/approve', (req, _res, next) => { req.params.role = 'student'; next(); }, adminController.approveUser);
router.patch('/students/:id/reject', (req, _res, next) => { req.params.role = 'student'; next(); }, adminController.rejectUser);
router.get('/students/:id/profile', adminController.getStudentProfile);
router.delete('/students/:id', adminController.deleteStudent);

// Alumni — NOTE: /alumni/pending MUST come before /alumni/:id
router.get('/alumni/pending', adminController.getPendingUsers);
router.get('/alumni', adminController.listAlumni);
router.patch('/alumni/:id/approve', (req, _res, next) => { req.params.role = 'alumni'; next(); }, adminController.approveUser);
router.patch('/alumni/:id/reject', (req, _res, next) => { req.params.role = 'alumni'; next(); }, adminController.rejectUser);
router.get('/alumni/:id/profile', adminController.getAlumniProfile);
router.delete('/alumni/:id', adminController.deleteAlumni);
router.post('/alumni/:id/career', adminController.addAlumniCareerEntry);

// Events (admin CRUD)
router.get('/events', adminController.listEvents);
router.post('/events', rules.createEvent, validate, adminController.createEvent);
router.put('/events/:id', validate, adminController.updateEvent);
router.delete('/events/:id', adminController.deleteEvent);

// Opportunities
router.get('/opportunities', adminController.listOpportunities);
router.patch('/opportunities/:id/status', adminController.updateOpportunityStatus);
router.delete('/opportunities/:id', adminController.deleteOpportunity);

// Announcements
router.post('/announcements', adminController.createAnnouncement);
router.get('/announcements', adminController.listAnnouncements);
router.delete('/announcements/:id', adminController.deleteAnnouncement);

// Mentorship & Referral oversight
router.get('/mentorship-requests', adminController.getMentorshipRequests);
router.get('/referral-requests', adminController.getReferralRequests);
router.delete('/referrals/:id', adminController.deleteReferral);

// Colleges
router.get('/colleges', adminController.listColleges);

router.get('/reports', adminController.getReports);

export default router;
