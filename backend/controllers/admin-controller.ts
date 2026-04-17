import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin-service';
import { success, created, paginated, error, notFound } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth-middleware';

export const adminController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.loginAdmin(req.body as { login?: string; username?: string; email?: string; password: string; college_id?: string });
      success(res, result, 'Login successful');
    } catch (err) { next(err); }
  },

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const stats = await adminService.getDashboardStats(college_id);
      success(res, stats, 'Dashboard loaded');
    } catch (err) { next(err); }
  },

  async getPendingUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await adminService.getPendingUsers(college_id, page, limit);
      success(res, result, 'Pending users fetched');
    } catch (err) { next(err); }
  },

  async listStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const result = await adminService.listStudents(college_id, {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        search: req.query.search as string | undefined,
        department: req.query.department as string | undefined,
      });
      paginated(res, { rows: result.students, total: result.total, page: result.page, limit: result.limit });
    } catch (err) { next(err); }
  },

  async listAlumni(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const result = await adminService.listAlumni(college_id, {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        search: req.query.search as string | undefined,
        department: req.query.department as string | undefined,
      });
      paginated(res, { rows: result.alumni, total: result.total, page: result.page, limit: result.limit });
    } catch (err) { next(err); }
  },

  async approveUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const role = req.params.role || (req.body as { role?: string }).role || (req.path.includes('/students/') ? 'student' : 'alumni');
      const { college_id } = req as AuthenticatedRequest;
      const result = await adminService.approveUser(id, role, college_id);
      success(res, result, 'User approved');
    } catch (err) { next(err); }
  },

  async rejectUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const role = req.params.role || (req.body as { role?: string }).role || (req.path.includes('/students/') ? 'student' : 'alumni');
      const { college_id } = req as AuthenticatedRequest;
      const result = await adminService.rejectUser(id, role, college_id);
      success(res, result, 'User rejected');
    } catch (err) { next(err); }
  },

  async listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const result = await adminService.listEvents(college_id, {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      success(res, result, 'Events fetched');
    } catch (err) { next(err); }
  },

  async createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const event = await adminService.createEvent(authReq.user.id, authReq.college_id, req.body as Record<string, unknown>);
      created(res, event, 'Event created');
    } catch (err) { next(err); }
  },

  async updateEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const id = parseInt(req.params.id, 10);
      const event = await adminService.updateEvent(id, college_id, req.body as Record<string, unknown>);
      success(res, event, 'Event updated');
    } catch (err) { next(err); }
  },

  async deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const id = parseInt(req.params.id, 10);
      await adminService.deleteEvent(id, college_id);
      success(res, {}, 'Event deleted');
    } catch (err) { next(err); }
  },

  async listOpportunities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const result = await adminService.listOpportunities(college_id, {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        status: req.query.status as string | undefined,
      });
      success(res, result, 'Opportunities fetched');
    } catch (err) { next(err); }
  },

  async updateOpportunityStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const id = parseInt(req.params.id, 10);
      const { status } = req.body as { status: string };
      const result = await adminService.updateOpportunityStatus(id, status, college_id);
      success(res, result, 'Opportunity status updated');
    } catch (err) { next(err); }
  },

  async createAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const announcement = await adminService.createAnnouncement(authReq.user.id, authReq.college_id, req.body as Record<string, unknown>);
      created(res, announcement, 'Announcement created');
    } catch (err) { next(err); }
  },

  async listAnnouncements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const result = await adminService.listAnnouncements(college_id, {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      success(res, result, 'Announcements fetched');
    } catch (err) { next(err); }
  },

  async getMentorshipRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const result = await adminService.getMentorshipRequests(college_id, {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      success(res, result, 'Mentorship requests fetched');
    } catch (err) { next(err); }
  },

  async getReferralRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const result = await adminService.getReferralRequests(college_id, {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      success(res, result, 'Referral requests fetched');
    } catch (err) { next(err); }
  },

  async listColleges(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.listColleges();
      success(res, result, 'Colleges fetched');
    } catch (err) { next(err); }
  },

  async getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const result = await adminService.getReports(college_id);
      success(res, result, 'Reports fetched');
    } catch (err) { next(err); }
  },

  async getStudentProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const result = await adminService.getStudentProfile(parseInt(req.params.id, 10), college_id);
      success(res, result, 'Student profile fetched');
    } catch (err) { next(err); }
  },

  async getAlumniProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const result = await adminService.getAlumniProfile(parseInt(req.params.id, 10), college_id);
      success(res, result, 'Alumni profile fetched');
    } catch (err) { next(err); }
  },

  async deleteStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      await adminService.deleteStudent(parseInt(req.params.id, 10), college_id);
      success(res, {}, 'Student deleted');
    } catch (err) { next(err); }
  },

  async deleteAlumni(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      await adminService.deleteAlumni(parseInt(req.params.id, 10), college_id);
      success(res, {}, 'Alumni deleted');
    } catch (err) { next(err); }
  },

  async addAlumniCareerEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      const result = await adminService.addAlumniCareerEntry(parseInt(req.params.id, 10), college_id, req.body as Record<string, unknown>);
      created(res, result, 'Career entry added');
    } catch (err) { next(err); }
  },

  async deleteAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      await adminService.deleteAnnouncement(parseInt(req.params.id, 10), college_id);
      success(res, {}, 'Announcement deleted');
    } catch (err) { next(err); }
  },

  async deleteReferral(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      await adminService.deleteReferral(parseInt(req.params.id, 10), college_id);
      success(res, {}, 'Referral deleted');
    } catch (err) { next(err); }
  },

  async deleteOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { college_id } = req as AuthenticatedRequest;
      await adminService.deleteOpportunity(parseInt(req.params.id, 10), college_id);
      success(res, {}, 'Opportunity deleted');
    } catch (err) { next(err); }
  },
};
