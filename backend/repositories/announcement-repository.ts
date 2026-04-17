import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export const announcementRepository = {
  async create(data: Prisma.AnnouncementCreateInput) {
    return prisma.announcement.create({ data });
  },

  async findMany(params: {
    collegeId: string;
    targetRole?: string;
    department?: string;
    page?: number;
    limit?: number;
  }) {
    const { collegeId, targetRole, department, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.AnnouncementWhereInput = {
      AND: [
        { OR: [{ collegeId }, { isGlobal: true }] },
        ...(targetRole && targetRole !== 'admin' ? [{ OR: [{ targetRole }, { targetRole: 'all' }] }] : []),
      ],
    };
    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.announcement.count({ where }),
    ]);
    return { announcements, total };
  },

  async findById(id: number) {
    return prisma.announcement.findUnique({ where: { id } });
  },

  async delete(id: number, collegeId: string) {
    return prisma.announcement.delete({ where: { id } });
  },
};
