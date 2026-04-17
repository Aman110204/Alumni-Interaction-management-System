import { Request, Response, NextFunction } from 'express';
import { profileService } from '../services/profile-service';
import { success } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth-middleware';

export const profileController = {
  async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await profileService.getFullProfile(authReq.user.id, authReq.user.role, authReq.college_id);
      success(res, result, 'Profile fetched');
    } catch (err) { next(err); }
  },

  async getAlumniProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const alumniId = parseInt(req.params.id, 10);
      const result = await profileService.getFullProfile(alumniId, 'alumni', authReq.college_id);
      success(res, result, 'Alumni profile fetched');
    } catch (err) { next(err); }
  },

  async getAlumniCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const alumniId = parseInt(req.params.id, 10);
      const result = await profileService.getAlumniCompanies(alumniId, authReq.college_id);
      success(res, result, 'Companies fetched');
    } catch (err) { next(err); }
  },

  async getAlumniGrouped(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const type = req.query.type as string || 'batch';
      const result = await profileService.getAlumniGrouped(type, authReq.college_id);
      success(res, result, 'Grouped alumni fetched');
    } catch (err) { next(err); }
  },

  async getMutuals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const targetId = parseInt(req.params.id, 10);
      const result = await profileService.getMutuals(authReq.user.id, authReq.user.role, targetId);
      success(res, result, 'Mutuals fetched');
    } catch (err) { next(err); }
  },
};
