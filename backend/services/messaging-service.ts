import { messagingRepository } from '../repositories/messaging-repository';

export const messagingService = {
  async listConversations(userId: number, userRole: string, collegeId: string) {
    return messagingRepository.getConversationsForUser(userId, userRole, collegeId);
  },

  async getOrCreateConversation(userId: number, userRole: string, otherId: number, otherType: string, collegeId: string, options: { allowCrossCollege?: boolean } = {}) {
    const existing = await messagingRepository.findConversationBetween(userId, userRole, otherId, otherType);
    if (existing) return existing.id;

    const conv = await messagingRepository.createConversation({
      collegeId,
      user1Id: userId, user1Type: userRole,
      user2Id: otherId, user2Type: otherType,
    });

    await Promise.all([
      messagingRepository.addParticipant(conv.id, userId, userRole),
      messagingRepository.addParticipant(conv.id, otherId, otherType),
    ]);

    return conv.id;
  },

  async getMessages(conversationId: number, userId: number, userRole: string, collegeId: string, query: { page?: number; limit?: number } = {}) {
    const isParticipant = await messagingRepository.isParticipant(conversationId, userId, userRole);
    if (!isParticipant) throw Object.assign(new Error('You are not a participant in this conversation'), { status: 403 });
    const page = parseInt(String(query.page || 1), 10);
    const limit = parseInt(String(query.limit || 50), 10);
    const messages = await messagingRepository.getMessages(conversationId, page, limit);
    return { messages, page, limit };
  },

  async sendMessage(conversationId: number, senderId: number, senderType: string, collegeId: string, message: string) {
    const isParticipant = await messagingRepository.isParticipant(conversationId, senderId, senderType);
    if (!isParticipant) throw Object.assign(new Error('You are not a participant in this conversation'), { status: 403 });
    return messagingRepository.createMessage({
      conversation: { connect: { id: conversationId } },
      senderId, senderType, message, collegeId,
    });
  },

  async sendMessageToUser(studentId: number, alumniId: number, senderId: number, senderType: string, collegeId: string, message: string, options: { allowCrossCollege?: boolean } = {}) {
    const userId = senderType === 'student' ? studentId : alumniId;
    const otherId = senderType === 'student' ? alumniId : studentId;
    const otherType = senderType === 'student' ? 'alumni' : 'student';
    const convId = await this.getOrCreateConversation(userId, senderType, otherId, otherType, collegeId, options);
    return this.sendMessage(convId, senderId, senderType, collegeId, message);
  },

  async getLegacyMessages(userId: number, userRole: string, collegeId: string, otherId: number) {
    const otherType = userRole === 'student' ? 'alumni' : 'student';
    const existing = await messagingRepository.findConversationBetween(userId, userRole, otherId, otherType);
    if (!existing) return { messages: [], conversation_id: null };
    const messages = await messagingRepository.getMessages(existing.id);
    return { messages, conversation_id: existing.id };
  },

  async getUnreadCount(userId: number, userRole: string, collegeId: string) {
    return messagingRepository.getUnreadCount(userId, userRole, collegeId);
  },

  async sendIntroMessage(studentId: number, alumniId: number, collegeId: string, message: string) {
    const convId = await this.getOrCreateConversation(studentId, 'student', alumniId, 'alumni', collegeId, { allowCrossCollege: false });
    return this.sendMessage(convId, studentId, 'student', collegeId, message);
  },
};
