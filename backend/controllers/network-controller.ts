import { Request, Response, NextFunction } from 'express';
import { networkService } from '../services/network-service';
import { success } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth-middleware';

export const networkController = {
  async getNetworkUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await networkService.getNetworkUsers({
        userId: authReq.user.id, userRole: authReq.user.role, collegeId: authReq.college_id,
        ...req.query as { page?: number; limit?: number; search?: string; department?: string; company?: string; scope?: string },
      });
      success(res, result, 'Network users fetched');
    } catch (err) { next(err); }
  },

  async getNetworkGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await networkService.getNetworkGroups({
        userId: authReq.user.id, userRole: authReq.user.role, collegeId: authReq.college_id,
        groupType: req.query.groupType as string, scope: req.query.scope as string,
      });
      success(res, result, 'Network groups fetched');
    } catch (err) { next(err); }
  },

  async getGroupMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await networkService.getGroupMembers({
        userId: authReq.user.id, userRole: authReq.user.role, collegeId: authReq.college_id,
        groupType: req.params.groupType, groupKey: req.params.groupKey,
        search: req.query.search as string, page: Number(req.query.page) || 1,
        scope: req.query.scope as string,
      });
      success(res, result, 'Group members fetched');
    } catch (err) { next(err); }
  },

  async searchNetwork(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await networkService.searchNetwork({
        q: req.query.q as string, userId: authReq.user.id, userRole: authReq.user.role,
        collegeId: authReq.college_id, scope: req.query.scope as string,
      });
      success(res, result, 'Search results fetched');
    } catch (err) { next(err); }
  },

  async getNetworkHierarchy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await networkService.getNetworkHierarchy({
        userId: authReq.user.id, userRole: authReq.user.role, collegeId: authReq.college_id,
        ...req.query as Record<string, string>,
      });
      success(res, result, 'Network hierarchy fetched');
    } catch (err) { next(err); }
  },
};
