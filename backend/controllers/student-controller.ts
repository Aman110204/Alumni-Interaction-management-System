/**
 * controllers/student-controller.ts
 *
 * Updated login handler to forward the resolved tenant context
 * (req.tenant.hostname_tenant) into the service layer so that
 * assertSameTenant() can enforce cross-tenant isolation.
 *
 * All other handlers are unchanged.
 */

import { Request, Response, NextFunction } from 'express';
import { studentService } from '../services/student-service';
import { alumniService } from '../services/alumni-service';
import { historyService } from '../services/history-service';
import { success, created, paginated } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth-middleware';

export const studentController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await studentService.registerStudent(req.body as {
        college_id?: string;
        fullName?: string;
        full_name?: string;
        usn?: string;
        email: string;
        password: string;
        department?: string;
        year?: string | number;
        phone?: string;
      });
      created(res, result, 'Registration successful');
    } catch (err) { next(err); }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      // Forward the subdomain-resolved tenant so the service can enforce
      // cross-tenant isolation via assertSameTenant().
      const result = await studentService.loginStudent({
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
      const result = await studentService.getProfile(id, authReq.college_id);
      success(res, result, 'Profile fetched');
    } catch (err) { next(err); }
  },

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await studentService.getDashboard(authReq.user.id, authReq.college_id);
      success(res, result, 'Dashboard loaded');
    } catch (err) { next(err); }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await studentService.updateProfile(authReq.user.id, authReq.college_id, req.body as Record<string, unknown>);
      success(res, result, 'Profile updated');
    } catch (err) { next(err); }
  },

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
      const result = await studentService.changePassword(authReq.user.id, currentPassword, newPassword);
      success(res, result, 'Password changed successfully');
    } catch (err) { next(err); }
  },

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const history = await historyService.getStudentHistory(authReq.user.id, authReq.college_id);
      success(res, history, 'History fetched');
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
        ...(req.body as { institution: string; degree?: string; fieldOfStudy?: string; startYear?: number; endYear?: number; }),
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

  async listAlumni(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await alumniService.listAlumni({ ...req.query as Record<string, string>, collegeId: authReq.college_id });
      paginated(res, { rows: result.alumni, total: result.total, page: result.page, limit: result.limit });
    } catch (err) { next(err); }
  },
};
