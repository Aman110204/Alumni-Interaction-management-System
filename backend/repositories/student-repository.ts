import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export const studentRepository = {
  async findById(id: number, collegeId?: string) {
    return prisma.student.findFirst({
      where: { id, ...(collegeId ? { collegeId } : {}) },
    });
  },

  async findByEmail(email: string, collegeId: string) {
    return prisma.student.findFirst({ where: { email, collegeId } });
  },

  async create(data: Prisma.StudentCreateInput) {
    return prisma.student.create({ data });
  },

  async update(id: number, collegeId: string, data: Prisma.StudentUpdateInput) {
    return prisma.student.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
  },

  async delete(id: number, collegeId: string) {
    return prisma.student.delete({ where: { id } });
  },

  async findMany(params: {
    collegeId: string;
    search?: string;
    department?: string;
    year?: number;
    isApproved?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { collegeId, search, department, year, isApproved, page = 1, limit = 12 } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.StudentWhereInput = {
      collegeId,
      isActive: true,
      ...(department ? { department } : {}),
      ...(year ? { year } : {}),
      ...(isApproved !== undefined ? { isApproved } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { department: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [students, total] = await Promise.all([
      prisma.student.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.student.count({ where }),
    ]);
    return { students, total };
  },

  async approve(id: number, collegeId: string) {
    return prisma.student.update({ where: { id }, data: { isApproved: true, updatedAt: new Date() } });
  },

  async reject(id: number, collegeId: string) {
    return prisma.student.update({ where: { id }, data: { isApproved: false, updatedAt: new Date() } });
  },

  async count(where: Prisma.StudentWhereInput) {
    return prisma.student.count({ where });
  },
};
