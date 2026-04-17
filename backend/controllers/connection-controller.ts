import { Request, Response, NextFunction } from 'express';
import { connectionService } from '../services/connection-service';
import { success } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth-middleware';

export const connectionController = {
  async sendRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { other_id, other_type, message, allow_cross_college } = req.body as { other_id: number; other_type: string; message?: string; allow_cross_college?: boolean };
      const result = await connectionService.createConnectionRequest({
        requesterId: authReq.user.id, requesterType: authReq.user.role,
        recipientId: Number(other_id), recipientType: other_type,
        collegeId: authReq.college_id, message, allowCrossCollege: allow_cross_college,
      });
      success(res, result, 'Connection request sent');
    } catch (err) { next(err); }
  },

  async listConnections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const connections = await connectionService.listMyConnectionRequests(authReq.user.id, authReq.user.role, authReq.college_id);
      const flagged = connectionService.addConnectionMatchFlags(connections as Array<Record<string, unknown>>, authReq.user.id, authReq.user.role);
      const status = req.query.status as string | undefined;
      const direction = req.query.direction as string | undefined;
      const filtered = (flagged as Array<Record<string, unknown>>).filter((connection) => {
        if (status && connection['status'] !== status) return false;
        if (direction === 'incoming' && !connection['is_receiver']) return false;
        if (direction === 'outgoing' && !connection['is_sender']) return false;
        return true;
      });
      success(res, filtered, 'Connections fetched');
    } catch (err) { next(err); }
  },

  async listGroupedConnections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const connections = await connectionService.listMyConnectionRequests(authReq.user.id, authReq.user.role, authReq.college_id);
      const grouped = connectionService.listMyGroupedConnections(connections as Array<Record<string, unknown>>, authReq.user.id, authReq.user.role);
      success(res, grouped, 'Grouped connections fetched');
    } catch (err) { next(err); }
  },

  async respondToRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const id = parseInt(req.params.id, 10);
      const { status } = req.body as { status: string };
      const result = await connectionService.respondToConnectionRequest(id, authReq.user.id, authReq.user.role, authReq.college_id, status);
      success(res, result, `Connection request ${status}`);
    } catch (err) { next(err); }
  },

  async getConnectionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const otherId = parseInt(req.query.other_id as string, 10);
      const otherType = req.query.other_type as string;
      const result = await connectionService.getConnectionStatus(authReq.user.id, authReq.user.role, authReq.college_id, otherId, otherType);
      success(res, { connection: result }, 'Connection status fetched');
    } catch (err) { next(err); }
  },
};
