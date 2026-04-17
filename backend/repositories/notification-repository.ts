import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export const notificationRepository = {
  async create(data: Prisma.NotificationCreateInput) {
    return prisma.notification.create({ data });
  },

  async findMany(userId: number, userType: string, collegeId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.NotificationWhereInput = { userId, userType, collegeId };
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
    ]);
    return { notifications, total };
  },

  async countUnread(userId: number, userType: string, collegeId: string) {
    return prisma.notification.count({ where: { userId, userType, collegeId, isRead: false } });
  },

  async markRead(id: number, userId: number, userType: string, collegeId: string) {
    return prisma.notification.updateMany({ where: { id, userId, userType, collegeId }, data: { isRead: true } });
  },

  async markAllRead(userId: number, userType: string, collegeId: string) {
    return prisma.notification.updateMany({ where: { userId, userType, collegeId }, data: { isRead: true } });
  },

  async createBulk(notifications: Prisma.NotificationCreateManyInput[]) {
    return prisma.notification.createMany({ data: notifications });
  },
};
