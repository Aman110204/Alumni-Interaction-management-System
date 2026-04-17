import { connectionRepository } from '../repositories/connection-repository';
import { notificationRepository } from '../repositories/notification-repository';

export const connectionService = {
  async listMyConnectionRequests(userId: number, userRole: string, collegeId: string) {
    return connectionRepository.findAllForUser(userId, userRole, collegeId);
  },

  addConnectionMatchFlags(connections: Array<Record<string, unknown>>, userId: number, userRole: string) {
    return connections.map((c) => ({
      ...c,
      is_sender: c['requesterId'] === userId && c['requesterType'] === userRole,
      is_receiver: c['recipientId'] === userId && c['recipientType'] === userRole,
    }));
  },

  listMyGroupedConnections(connections: Array<Record<string, unknown>>, userId: number, userRole: string) {
    const accepted = connections.filter((c) => c['status'] === 'accepted');
    const pending = connections.filter((c) => c['status'] === 'pending');
    return { pending, classmates: accepted, batchmates: [], others: [] };
  },

  async createConnectionRequest(params: {
    requesterId: number; requesterType: string; recipientId: number; recipientType: string;
    collegeId?: string; message?: string; allowCrossCollege?: boolean;
  }) {
    const { requesterId, requesterType, recipientId, recipientType, collegeId, message, allowCrossCollege } = params;

    const existing = await connectionRepository.findBetween(requesterId, requesterType, recipientId, recipientType);
    if (existing?.status === 'accepted') return { ...existing, already_connected: true };
    if (existing?.status === 'pending') return { ...existing, already_connected: false };

    const isCrossCollege = false; // default; actual logic depends on tenant lookup
    return connectionRepository.create({
      requesterId, requesterType, recipientId, recipientType,
      collegeId, isCrossCollege, message, status: 'pending',
    });
  },

  async respondToConnectionRequest(requestId: number, userId: number, userRole: string, collegeId: string, status: string) {
    if (!['accepted', 'rejected'].includes(status)) throw Object.assign(new Error('Status must be accepted or rejected'), { status: 400 });
    const req = await connectionRepository.findById(requestId);
    if (!req) throw Object.assign(new Error('Connection request not found'), { status: 404 });
    if (req.recipientId !== userId || req.recipientType !== userRole) throw Object.assign(new Error('You cannot respond to this request'), { status: 403 });

    const updated = await connectionRepository.update(requestId, { status, respondedAt: new Date() });

    if (status === 'accepted') {
      notificationRepository.create({
        userId: req.requesterId, userType: req.requesterType, collegeId: collegeId || '',
        title: 'Connection Request Accepted', message: 'Your connection request was accepted.', type: 'connection',
      }).catch(() => {});
    }
    return updated;
  },

  async getConnectionStatus(userId: number, userRole: string, collegeId: string, otherId: number, otherType: string) {
    return connectionRepository.findBetween(userId, userRole, otherId, otherType);
  },

  async getConnectionBetween(userAId: number, userAType: string, userBId: number, userBType: string, collegeId: string) {
    return connectionRepository.findBetween(userAId, userAType, userBId, userBType);
  },
};
