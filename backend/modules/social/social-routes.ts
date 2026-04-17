import { NextFunction, Request, Response, Router } from 'express';
import { connectionController } from '../../controllers/connection-controller';
import { messagingController } from '../../controllers/messaging-controller';
import { networkController } from '../../controllers/network-controller';
import { profileController } from '../../controllers/profile-controller';
import { studentController } from '../../controllers/student-controller';
import { rules, validate } from '../../middleware/validate';
import { AuthenticatedRequest, requireAuth } from '../../middleware/auth-middleware';
import { attachTenantContext } from '../../middleware/tenant-middleware';
import { adminService } from '../../services/admin-service';
import { messagingService } from '../../services/messaging-service';
import { messagingRepository } from '../../repositories/messaging-repository';
import { success } from '../../utils/response';

const router = Router();
router.use(attachTenantContext);

router.post('/connections', ...requireAuth, rules.connectionRequest, validate, connectionController.sendRequest);
router.post('/connections/request', ...requireAuth, rules.connectionRequest, validate, connectionController.sendRequest);
router.get('/connections', ...requireAuth, connectionController.listConnections);
router.get('/connections/incoming', ...requireAuth, (req: Request, _res: Response, next: NextFunction) => {
  req.query.direction = 'incoming';
  req.query.status = 'pending';
  next();
}, connectionController.listConnections);
router.get('/connections/outgoing', ...requireAuth, (req: Request, _res: Response, next: NextFunction) => {
  req.query.direction = 'outgoing';
  req.query.status = 'pending';
  next();
}, connectionController.listConnections);
router.get('/connections/accepted', ...requireAuth, (req: Request, _res: Response, next: NextFunction) => {
  req.query.status = 'accepted';
  next();
}, connectionController.listConnections);
router.get('/connections/grouped', ...requireAuth, connectionController.listGroupedConnections);
router.get('/connections/status', ...requireAuth, connectionController.getConnectionStatus);
router.get('/connections/status/:type/:id', ...requireAuth, (req: Request, _res: Response, next: NextFunction) => {
  req.query.other_id = req.params.id;
  req.query.other_type = req.params.type;
  next();
}, connectionController.getConnectionStatus);
router.patch('/connections/:id/respond', ...requireAuth, rules.connectionResponse, validate, connectionController.respondToRequest);
router.put('/connections/:id/accept', ...requireAuth, (req: Request, _res: Response, next: NextFunction) => {
  req.body = { ...(req.body as Record<string, unknown>), status: 'accepted' };
  next();
}, rules.connectionResponse, validate, connectionController.respondToRequest);
router.put('/connections/:id/reject', ...requireAuth, (req: Request, _res: Response, next: NextFunction) => {
  req.body = { ...(req.body as Record<string, unknown>), status: 'rejected' };
  next();
}, rules.connectionResponse, validate, connectionController.respondToRequest);

router.get('/conversations', ...requireAuth, messagingController.listConversations);
router.post('/conversations', ...requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { other_id, other_type, allow_cross_college } = req.body as { other_id?: number; other_type?: string; allow_cross_college?: boolean };
    const otherId = Number(other_id);
    const otherType = other_type || (authReq.user.role === 'student' ? 'alumni' : 'student');
    const conversationId = await messagingService.getOrCreateConversation(
      authReq.user.id,
      authReq.user.role,
      otherId,
      otherType,
      authReq.college_id,
      { allowCrossCollege: allow_cross_college },
    );
    const conversation = await messagingRepository.findConversationById(conversationId);
    success(res, conversation, 'Conversation ready');
  } catch (err) { next(err); }
});
router.get('/conversations/:id/messages', ...requireAuth, (req: Request, _res: Response, next: NextFunction) => {
  req.params.conversationId = req.params.id;
  next();
}, messagingController.getMessages);
router.post('/conversations/:id/messages', ...requireAuth, (req: Request, _res: Response, next: NextFunction) => {
  req.body = { ...(req.body as Record<string, unknown>), conversationId: parseInt(req.params.id, 10) };
  next();
}, rules.sendMessage, validate, messagingController.sendMessage);
router.get('/messages/conversations', ...requireAuth, messagingController.listConversations);
router.get('/messages/unread-count', ...requireAuth, messagingController.getUnreadCount);
router.post('/messages', ...requireAuth, rules.sendMessage, validate, messagingController.sendMessage);
router.post('/messages/intro', ...requireAuth, rules.sendMessage, validate, messagingController.sendMessage);
router.get('/messages/:conversationId', ...requireAuth, messagingController.getMessages);
router.get('/messages/with/:otherId', ...requireAuth, messagingController.getLegacyMessages);

router.get('/network', ...requireAuth, networkController.getNetworkUsers);
router.get('/network/grouped', ...requireAuth, networkController.getNetworkGroups);
router.get('/network/group/:groupType/:groupKey', ...requireAuth, networkController.getGroupMembers);
router.get('/network/groups', ...requireAuth, networkController.getNetworkGroups);
router.get('/network/groups/:groupType/:groupKey/members', ...requireAuth, networkController.getGroupMembers);
router.get('/network/search', ...requireAuth, networkController.searchNetwork);
router.get('/network/hierarchy', ...requireAuth, networkController.getNetworkHierarchy);

router.get('/profile/me', ...requireAuth, profileController.getMyProfile);
router.get('/profile/alumni/grouped', ...requireAuth, profileController.getAlumniGrouped);
router.get('/profile/alumni/:id', ...requireAuth, profileController.getAlumniProfile);
router.get('/profile/alumni/:id/companies', ...requireAuth, profileController.getAlumniCompanies);
router.get('/profile/:id/mutuals', ...requireAuth, profileController.getMutuals);
router.get('/profile/:id', ...requireAuth, (req: Request, res: Response, next: NextFunction) => {
  if (req.query.type === 'alumni') {
    profileController.getAlumniProfile(req, res, next);
    return;
  }
  profileController.getMyProfile(req, res, next);
});

router.get('/alumni/grouped', ...requireAuth, profileController.getAlumniGrouped);
router.get('/alumni/:id/companies', ...requireAuth, profileController.getAlumniCompanies);
router.get('/alumni/:id/mutuals', ...requireAuth, profileController.getMutuals);

router.get('/announcements', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const collegeId = (req as AuthenticatedRequest).college_id;
    const result = await adminService.listAnnouncements(collegeId, {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });
    success(res, result, 'Announcements fetched');
  } catch (err) { next(err); }
});
router.get('/colleges', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await adminService.listColleges();
    success(res, result, 'Colleges fetched');
  } catch (err) { next(err); }
});

router.get('/history', ...requireAuth, studentController.getHistory);

export default router;
