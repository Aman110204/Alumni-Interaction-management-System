import { Request, Response, NextFunction } from 'express';
import { messagingService } from '../services/messaging-service';
import { success } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth-middleware';

export const messagingController = {
  async listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const conversations = await messagingService.listConversations(authReq.user.id, authReq.user.role, authReq.college_id);
      success(res, conversations, 'Conversations fetched');
    } catch (err) { next(err); }
  },

  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const convId = parseInt(req.params.conversationId || req.params.id, 10);
      const result = await messagingService.getMessages(convId, authReq.user.id, authReq.user.role, authReq.college_id, {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      success(res, result, 'Messages fetched');
    } catch (err) { next(err); }
  },

  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { conversationId, other_id, other_type, message, allow_cross_college } = req.body as { conversationId?: number; other_id?: number; other_type?: string; message: string; allow_cross_college?: boolean };

      if (conversationId) {
        const msg = await messagingService.sendMessage(conversationId, authReq.user.id, authReq.user.role, authReq.college_id, message);
        success(res, msg, 'Message sent');
        return;
      }

      if (other_id) {
        const otherType = other_type || (authReq.user.role === 'student' ? 'alumni' : 'student');
        const userId = authReq.user.id;
        const otherId = Number(other_id);
        const studentId = authReq.user.role === 'student' ? userId : otherId;
        const alumniId = authReq.user.role === 'alumni' ? userId : otherId;
        const msg = await messagingService.sendMessageToUser(studentId, alumniId, userId, authReq.user.role, authReq.college_id, message, { allowCrossCollege: allow_cross_college });
        success(res, msg, 'Message sent');
        return;
      }

      success(res, {}, 'Nothing to send');
    } catch (err) { next(err); }
  },

  async getLegacyMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const otherId = parseInt(req.params.otherId || req.params.other_id, 10);
      const result = await messagingService.getLegacyMessages(authReq.user.id, authReq.user.role, authReq.college_id, otherId);
      success(res, result, 'Messages fetched');
    } catch (err) { next(err); }
  },

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const count = await messagingService.getUnreadCount(authReq.user.id, authReq.user.role, authReq.college_id);
      success(res, { unread_count: count }, 'Unread count fetched');
    } catch (err) { next(err); }
  },
};
