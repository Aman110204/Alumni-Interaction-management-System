import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export const connectionRepository = {
  async findByPair(requesterId: number, requesterType: string, recipientId: number, recipientType: string) {
    return prisma.connectionRequest.findFirst({
      where: {
        OR: [
          { requesterId, requesterType, recipientId, recipientType },
          { requesterId: recipientId, requesterType: recipientType, recipientId: requesterId, recipientType: requesterType },
        ],
      },
    });
  },

  async findById(id: number) {
    return prisma.connectionRequest.findUnique({ where: { id } });
  },

  async create(data: Prisma.ConnectionRequestCreateInput) {
    return prisma.connectionRequest.create({ data });
  },

  async update(id: number, data: Prisma.ConnectionRequestUpdateInput) {
    return prisma.connectionRequest.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
  },

  async findAllForUser(userId: number, userRole: string, collegeId: string) {
    return prisma.connectionRequest.findMany({
      where: {
        OR: [
          { requesterId: userId, requesterType: userRole },
          { recipientId: userId, recipientType: userRole },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findBetween(userAId: number, userAType: string, userBId: number, userBType: string) {
    return prisma.connectionRequest.findFirst({
      where: {
        OR: [
          { requesterId: userAId, requesterType: userAType, recipientId: userBId, recipientType: userBType },
          { requesterId: userBId, requesterType: userBType, recipientId: userAId, recipientType: userAType },
        ],
      },
    });
  },
};
