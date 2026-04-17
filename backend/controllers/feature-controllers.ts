import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event-service';
import { opportunityService } from '../services/opportunity-service';
import { mentorshipService } from '../services/mentorship-service';
import { referralService } from '../services/referral-service';
import { notificationService } from '../services/notification-service';
import { success, created, paginated } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth-middleware';

// ── Events ──────────────────────────────────────────────────────────────────

export const eventController = {
  async listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await eventService.listEvents({ ...req.query as Record<string, string>, collegeId: authReq.college_id });
      success(res, result, 'Events fetched');
    } catch (err) { next(err); }
  },

  async getEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await eventService.getEventById(parseInt(req.params.id, 10), authReq.college_id);
      success(res, result, 'Event fetched');
    } catch (err) { next(err); }
  },

  async registerForEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await eventService.registerForEvent(parseInt(req.params.id, 10), authReq.user.id, authReq.college_id);
      success(res, result, 'Registered for event');
    } catch (err) { next(err); }
  },

  async cancelRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await eventService.cancelRegistration(parseInt(req.params.id, 10), authReq.user.id, authReq.college_id);
      success(res, result, 'Registration cancelled');
    } catch (err) { next(err); }
  },

  async getMyRegistrations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await eventService.getMyRegistrations(authReq.user.id, authReq.college_id);
      success(res, result, 'Registrations fetched');
    } catch (err) { next(err); }
  },
};

// ── Opportunities ───────────────────────────────────────────────────────────

export const opportunityController = {
  async listOpportunities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await opportunityService.listOpportunities({ ...req.query as Record<string, string>, collegeId: authReq.college_id });
      success(res, result, 'Opportunities fetched');
    } catch (err) { next(err); }
  },

  async getOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await opportunityService.getOpportunityById(parseInt(req.params.id, 10), authReq.college_id);
      success(res, result, 'Opportunity fetched');
    } catch (err) { next(err); }
  },

  async applyForOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await opportunityService.applyForOpportunity(parseInt(req.params.id, 10), authReq.user.id, authReq.college_id);
      created(res, result, 'Applied for opportunity');
    } catch (err) { next(err); }
  },

  async getMyApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await opportunityService.getMyApplications(authReq.user.id, authReq.college_id);
      success(res, result, 'Applications fetched');
    } catch (err) { next(err); }
  },

  async createOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await opportunityService.createOpportunity(authReq.user.id, authReq.college_id, req.body as Record<string, unknown>);
      created(res, result, 'Opportunity created');
    } catch (err) { next(err); }
  },

  async getAlumniOpportunities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await opportunityService.getAlumniOpportunities(authReq.user.id, authReq.college_id);
      success(res, result, 'Alumni opportunities fetched');
    } catch (err) { next(err); }
  },

  async updateOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await opportunityService.updateOpportunity(parseInt(req.params.id, 10), authReq.user.id, authReq.college_id, req.body as Record<string, unknown>);
      success(res, result, 'Opportunity updated');
    } catch (err) { next(err); }
  },

  async deleteOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      await opportunityService.deleteOpportunity(parseInt(req.params.id, 10), authReq.user.id, authReq.college_id);
      success(res, {}, 'Opportunity deleted');
    } catch (err) { next(err); }
  },
};

// ── Mentorship ──────────────────────────────────────────────────────────────

export const mentorshipController = {
  async requestMentorship(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await mentorshipService.requestMentorship(authReq.user.id, authReq.college_id, req.body as { alumni_id: number; message?: string; allow_cross_college?: boolean });
      created(res, result, 'Mentorship request sent');
    } catch (err) { next(err); }
  },

  async getMyRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await mentorshipService.getMyMentorshipRequests(authReq.user.id, authReq.college_id);
      success(res, result, 'Mentorship requests fetched');
    } catch (err) { next(err); }
  },

  async getAlumniRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await mentorshipService.getAlumniMentorshipRequests(authReq.user.id, authReq.college_id);
      success(res, result, 'Mentorship requests fetched');
    } catch (err) { next(err); }
  },

  async respondToRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await mentorshipService.respondToMentorship(parseInt(req.params.id, 10), authReq.user.id, authReq.college_id, req.body as { status: string; response?: string });
      success(res, result, 'Mentorship response recorded');
    } catch (err) { next(err); }
  },
};

// ── Referral ────────────────────────────────────────────────────────────────

export const referralController = {
  async requestReferral(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await referralService.requestReferral(authReq.user.id, authReq.college_id, req.body as { alumni_id: number; company: string; job_title: string; resume_url?: string; message?: string; allow_cross_college?: boolean });
      created(res, result, 'Referral request sent');
    } catch (err) { next(err); }
  },

  async getMyRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await referralService.getMyReferralRequests(authReq.user.id, authReq.college_id);
      success(res, result, 'Referral requests fetched');
    } catch (err) { next(err); }
  },

  async getAlumniRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await referralService.getAlumniReferralRequests(authReq.user.id, authReq.college_id);
      success(res, result, 'Referral requests fetched');
    } catch (err) { next(err); }
  },

  async respondToRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await referralService.respondToReferral(parseInt(req.params.id, 10), authReq.user.id, authReq.college_id, req.body as { status: string; response?: string });
      success(res, result, 'Referral response recorded');
    } catch (err) { next(err); }
  },
};

// ── Notifications ───────────────────────────────────────────────────────────

export const notificationController = {
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await notificationService.getNotifications(authReq.user.id, authReq.user.role, authReq.college_id, {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      success(res, result, 'Notifications fetched');
    } catch (err) { next(err); }
  },

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const count = await notificationService.getUnreadCount(authReq.user.id, authReq.user.role, authReq.college_id);
      success(res, { unread_count: count }, 'Unread count fetched');
    } catch (err) { next(err); }
  },

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      await notificationService.markRead(parseInt(req.params.id, 10), authReq.user.id, authReq.user.role, authReq.college_id);
      success(res, {}, 'Notification marked as read');
    } catch (err) { next(err); }
  },

  async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      await notificationService.markAllRead(authReq.user.id, authReq.user.role, authReq.college_id);
      success(res, {}, 'All notifications marked as read');
    } catch (err) { next(err); }
  },
};
