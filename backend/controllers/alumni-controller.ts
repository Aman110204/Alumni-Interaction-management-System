import { Request, Response, NextFunction } from 'express';
import { alumniService } from '../services/alumni-service';
import { success, created, paginated } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth-middleware';

export const alumniController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await alumniService.registerAlumni(req.body as {
        college_id?: string;
        fullName?: string;
        full_name?: string;
        email: string;
        password: string;
        company?: string;
        designation?: string;
        location?: string;
        graduationYear?: number;
        graduation_year?: number;
        department?: string;
        phone?: string;
      });
      created(res, result, 'Registration successful. Awaiting admin approval.');
    } catch (err) { next(err); }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      // Forward the subdomain-resolved tenant so the service can enforce
      // cross-tenant isolation via assertSameTenant().
      const result = await alumniService.loginAlumni({
        ...(req.body as { email: string; password: string; college_id?: string }),
        requestTenantId: authReq.tenant?.hostname_tenant ?? null,
      });
      success(res, result, 'Login successful');
    } catch (err) { next(err); }
  },

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const id = req.params.id ? parseInt(req.params.id, 10) : authReq.user.id;
      const result = await alumniService.getAlumniById(id, authReq.college_id);
      success(res, result, 'Profile fetched');
    } catch (err) { next(err); }
  },

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await alumniService.getDashboard(authReq.user.id, authReq.college_id);
      success(res, result, 'Dashboard loaded');
    } catch (err) { next(err); }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await alumniService.updateProfile(authReq.user.id, authReq.college_id, req.body as Record<string, unknown>);
      success(res, result, 'Profile updated');
    } catch (err) { next(err); }
  },

  async listAlumni(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await alumniService.listAlumni({ ...req.query as Record<string, string>, collegeId: authReq.college_id });
      paginated(res, { rows: result.alumni, total: result.total, page: result.page, limit: result.limit });
    } catch (err) { next(err); }
  },

  async listStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await alumniService.listStudents({
        collegeId: authReq.college_id,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        search: req.query.search as string | undefined,
        department: req.query.department as string | undefined,
      });
      paginated(res, { rows: result.students, total: result.total, page: result.page, limit: result.limit });
    } catch (err) { next(err); }
  },

  async getAlumniById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const id = parseInt(req.params.id, 10);
      const result = await alumniService.getAlumniById(id, authReq.college_id);
      success(res, result, 'Alumni fetched');
    } catch (err) { next(err); }
  },

  async getFilterOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await alumniService.getFilterOptions(authReq.college_id, req.query.scope as string);
      success(res, result, 'Filter options fetched');
    } catch (err) { next(err); }
  },

  async getCareerTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await alumniService.getCareerTimeline(authReq.user.id, authReq.college_id);
      success(res, result, 'Career timeline fetched');
    } catch (err) { next(err); }
  },

  async addCareerEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await alumniService.addCareerEntry({
        alumniId: authReq.user.id,
        collegeId: authReq.college_id,
        ...(req.body as {
          company: string;
          role?: string;
          start_date?: string;
          end_date?: string;
          is_current?: boolean;
          description?: string;
        }),
      });
      created(res, result, 'Career entry added');
    } catch (err) { next(err); }
  },

  async getEducationHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await alumniService.getEducationHistory(authReq.user.id, authReq.user.role, authReq.college_id);
      success(res, result, 'Education history fetched');
    } catch (err) { next(err); }
  },

  async addEducationEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await alumniService.addEducationEntry({
        userId: authReq.user.id,
        userRole: authReq.user.role,
        collegeId: authReq.college_id,
        ...(req.body as {
          institution: string;
          degree?: string;
          fieldOfStudy?: string;
          startYear?: number;
          endYear?: number;
        }),
      });
      created(res, result, 'Education entry added');
    } catch (err) { next(err); }
  },

  async updateEducationEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await alumniService.updateEducationEntry({
        entryId: parseInt(req.params.id, 10),
        userId: authReq.user.id,
        userRole: authReq.user.role,
        collegeId: authReq.college_id,
        ...(req.body as Record<string, unknown>),
      });
      success(res, result, 'Education entry updated');
    } catch (err) { next(err); }
  },

  async deleteEducationEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      await alumniService.deleteEducationEntry(parseInt(req.params.id, 10), authReq.user.id, authReq.user.role, authReq.college_id);
      success(res, {}, 'Education entry deleted');
    } catch (err) { next(err); }
  },
};
