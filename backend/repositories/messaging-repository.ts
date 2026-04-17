import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export const messagingRepository = {
  async findConversationById(id: number) {
    return prisma.conversation.findUnique({ where: { id }, include: { participants: true } });
  },

  async findConversationBetween(user1Id: number, user1Type: string, user2Id: number, user2Type: string) {
    return prisma.conversation.findFirst({
      where: {
        OR: [
          { user1Id, user1Type, user2Id, user2Type },
          { user1Id: user2Id, user1Type: user2Type, user2Id: user1Id, user2Type: user1Type },
        ],
      },
      include: { participants: true },
    });
  },

  async createConversation(data: Prisma.ConversationCreateInput) {
    return prisma.conversation.create({ data, include: { participants: true } });
  },

  async addParticipant(conversationId: number, participantId: number, participantType: string) {
    return prisma.conversationParticipant.upsert({
      where: { conversationId_participantId_participantType: { conversationId, participantId, participantType } },
      create: { conversationId, participantId, participantType },
      update: {},
    });
  },

  async getConversationsForUser(userId: number, userType: string, collegeId: string) {
    return prisma.conversation.findMany({
      where: {
        OR: [
          { user1Id: userId, user1Type: userType },
          { user2Id: userId, user2Type: userType },
        ],
      },
      include: {
        participants: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async getMessages(conversationId: number, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
  },

  async createMessage(data: Prisma.MessageCreateInput) {
    const msg = await prisma.message.create({ data });
    const conversationId =
      typeof data.conversation === 'object' &&
      data.conversation !== null &&
      'connect' in data.conversation &&
      data.conversation.connect
        ? data.conversation.connect.id
        : undefined;
    if (conversationId) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    }
    return msg;
  },

  async getUnreadCount(userId: number, userType: string, collegeId: string) {
    return prisma.message.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: {
          participants: { some: { participantId: userId, participantType: userType } },
        },
      },
    });
  },

  async isParticipant(conversationId: number, userId: number, userType: string) {
    const p = await prisma.conversationParticipant.findFirst({ where: { conversationId, participantId: userId, participantType: userType } });
    return !!p;
  },
};
