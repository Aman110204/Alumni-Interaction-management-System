import { Router } from 'express';
import { eventController, opportunityController, mentorshipController, referralController, notificationController } from '../../controllers/feature-controllers';
import { rules, validate } from '../../middleware/validate';
import { requireStudent, requireAlumni, requireAuth } from '../../middleware/auth-middleware';
import { attachTenantContext } from '../../middleware/tenant-middleware';

const router = Router();
router.use(attachTenantContext);

// ── Events ────────────────────────────────────────────────────────────────────
router.get('/events', ...requireAuth, eventController.listEvents);
router.get('/events/my-registrations', ...requireStudent, eventController.getMyRegistrations);
router.get('/events/:id', ...requireAuth, eventController.getEvent);
router.post('/events/:id/register', ...requireStudent, eventController.registerForEvent);
router.delete('/events/:id/register', ...requireStudent, eventController.cancelRegistration);

// ── Opportunities ─────────────────────────────────────────────────────────────
router.get('/opportunities', ...requireAuth, opportunityController.listOpportunities);
router.get('/opportunities/my-applications', ...requireStudent, opportunityController.getMyApplications);
router.get('/opportunities/my-opportunities', ...requireAlumni, opportunityController.getAlumniOpportunities);
router.get('/opportunities/:id', ...requireAuth, opportunityController.getOpportunity);
router.post('/opportunities', ...requireAlumni, rules.createOpportunity, validate, opportunityController.createOpportunity);
router.post('/alumni-opportunities', ...requireAlumni, rules.createOpportunity, validate, opportunityController.createOpportunity);
router.get('/alumni-opportunities', ...requireAlumni, opportunityController.getAlumniOpportunities);
router.put('/opportunities/:id', ...requireAlumni, rules.updateOpportunity, validate, opportunityController.updateOpportunity);
router.put('/alumni-opportunities/:id', ...requireAlumni, rules.updateOpportunity, validate, opportunityController.updateOpportunity);
router.delete('/opportunities/:id', ...requireAlumni, opportunityController.deleteOpportunity);
router.delete('/alumni-opportunities/:id', ...requireAlumni, opportunityController.deleteOpportunity);
router.post('/opportunities/:id/apply', ...requireStudent, opportunityController.applyForOpportunity);

// ── Mentorship ────────────────────────────────────────────────────────────────
router.post('/mentorship', ...requireStudent, rules.mentorshipRequest, validate, mentorshipController.requestMentorship);
router.post('/mentorship/request', ...requireStudent, rules.mentorshipRequest, validate, mentorshipController.requestMentorship);
router.get('/mentorship/my-requests', ...requireStudent, mentorshipController.getMyRequests);
router.get('/mentorship/incoming', ...requireAlumni, mentorshipController.getAlumniRequests);
router.get('/alumni-mentorship', ...requireAlumni, mentorshipController.getAlumniRequests);
router.patch('/mentorship/:id/respond', ...requireAlumni, rules.mentorshipResponse, validate, mentorshipController.respondToRequest);
router.patch('/alumni-mentorship/:id/respond', ...requireAlumni, rules.mentorshipResponse, validate, mentorshipController.respondToRequest);

// ── Referrals ─────────────────────────────────────────────────────────────────
router.post('/referrals', ...requireStudent, rules.referralRequest, validate, referralController.requestReferral);
router.post('/referral/request', ...requireStudent, rules.referralRequest, validate, referralController.requestReferral);
router.get('/referrals/my-requests', ...requireStudent, referralController.getMyRequests);
router.get('/referral/my-requests', ...requireStudent, referralController.getMyRequests);
router.get('/referrals/incoming', ...requireAlumni, referralController.getAlumniRequests);
router.get('/alumni-referral', ...requireAlumni, referralController.getAlumniRequests);
router.patch('/referrals/:id/respond', ...requireAlumni, rules.referralResponse, validate, referralController.respondToRequest);
router.patch('/alumni-referral/:id/respond', ...requireAlumni, rules.referralResponse, validate, referralController.respondToRequest);

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications', ...requireAuth, notificationController.getNotifications);
router.get('/notifications/unread-count', ...requireAuth, notificationController.getUnreadCount);
router.patch('/notifications/read-all', ...requireAuth, notificationController.markAllRead);
router.patch('/notifications/mark-all-read', ...requireAuth, notificationController.markAllRead);
router.patch('/notifications/:id/read', ...requireAuth, notificationController.markRead);

export default router;
