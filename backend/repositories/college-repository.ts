import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export const collegeRepository = {
  async findById(id: string) {
    return prisma.college.findUnique({ where: { id } });
  },

  async findAll() {
    return prisma.college.findMany({ orderBy: { name: 'asc' } });
  },

  async upsert(id: string, name: string, code?: string | null, location?: string | null) {
    return prisma.college.upsert({
      where: { id },
      create: { id, name, code, location },
      update: { name, updatedAt: new Date() },
    });
  },

  async create(data: { id: string; name: string; location?: string; code?: string; metadata?: Record<string, unknown> }) {
    return prisma.college.create({
      data: {
        ...data,
        metadata: (data.metadata || {}) as Prisma.InputJsonObject,
      },
    });
  },
};
