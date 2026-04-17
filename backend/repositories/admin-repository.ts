import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export const adminRepository = {
  async findByUsernameOrEmail(login: string) {
    return prisma.admin.findFirst({
      where: {
        OR: [
          { username: login },
          { email: login },
        ],
        isActive: true,
      },
    });
  },

  async findById(id: number) {
    return prisma.admin.findUnique({ where: { id } });
  },

  async findByCollegeId(collegeId: string) {
    return prisma.admin.findMany({ where: { collegeId, isActive: true } });
  },

  async create(data: Prisma.AdminCreateInput) {
    return prisma.admin.create({ data });
  },

  async upsertByUsername(username: string, data: Prisma.AdminCreateInput) {
    return prisma.admin.upsert({
      where: { email: data.email as string },
      create: data,
      update: { fullName: data.fullName, college: data.college },
    });
  },
};
