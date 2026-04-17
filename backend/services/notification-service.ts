import { notificationRepository } from '../repositories/notification-repository';

export const notificationService = {
  async getNotifications(userId: number, userType: string, collegeId: string, query: { page?: number; limit?: number } = {}) {
    const page = parseInt(String(query.page || 1), 10);
    const limit = parseInt(String(query.limit || 20), 10);
    const { notifications, total } = await notificationRepository.findMany(userId, userType, collegeId, page, limit);
    return { notifications, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  },

  async getUnreadCount(userId: number, userType: string, collegeId: string) {
    return notificationRepository.countUnread(userId, userType, collegeId);
  },

  async markRead(notificationId: number, userId: number, userType: string, collegeId: string) {
    return notificationRepository.markRead(notificationId, userId, userType, collegeId);
  },

  async markAllRead(userId: number, userType: string, collegeId: string) {
    return notificationRepository.markAllRead(userId, userType, collegeId);
  },

  async createNotification(data: { userId: number; userType: string; collegeId: string; title: string; message: string; type?: string; link?: string }) {
    return notificationRepository.create({
      userId: data.userId,
      userType: data.userType,
      collegeId: data.collegeId,
      title: data.title,
      message: data.message,
      type: data.type || 'general',
      link: data.link,
    });
  },
};
