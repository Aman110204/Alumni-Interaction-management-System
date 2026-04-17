import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export const alumniRepository = {
  async findById(id: number, collegeId?: string) {
    return prisma.alumni.findFirst({
      where: { id, ...(collegeId ? { collegeId } : {}) },
    });
  },

  async findByEmail(email: string, collegeId: string) {
    return prisma.alumni.findFirst({ where: { email, collegeId } });
  },

  async create(data: Prisma.AlumniCreateInput) {
    return prisma.alumni.create({ data });
  },

  async update(id: number, data: Prisma.AlumniUpdateInput) {
    return prisma.alumni.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
  },

  async delete(id: number) {
    return prisma.alumni.delete({ where: { id } });
  },

  async findMany(params: {
    collegeId?: string;
    search?: string;
    department?: string;
    company?: string;
    graduationYear?: number;
    isApproved?: boolean;
    availableMentorship?: boolean;
    scope?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  }) {
    const { collegeId, search, department, company, graduationYear, isApproved, availableMentorship, scope, page = 1, limit = 12, sortBy } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.AlumniWhereInput = {
      isActive: true,
      ...(scope !== 'all_colleges' && collegeId ? { collegeId } : {}),
      ...(isApproved !== undefined ? { isApproved } : {}),
      ...(department ? { department: { contains: department, mode: 'insensitive' } } : {}),
      ...(company ? { company: { contains: company, mode: 'insensitive' } } : {}),
      ...(graduationYear ? { graduationYear } : {}),
      ...(availableMentorship !== undefined ? { availableMentorship } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
              { department: { contains: search, mode: 'insensitive' } },
              { skills: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.AlumniOrderByWithRelationInput =
      sortBy === 'name' ? { fullName: 'asc' }
      : sortBy === 'graduation_year' ? { graduationYear: 'desc' }
      : { createdAt: 'desc' };

    const [alumni, total] = await Promise.all([
      prisma.alumni.findMany({ where, skip, take: limit, orderBy }),
      prisma.alumni.count({ where }),
    ]);
    return { alumni, total };
  },

  async approve(id: number) {
    return prisma.alumni.update({ where: { id }, data: { isApproved: true, status: 'approved', updatedAt: new Date() } });
  },

  async reject(id: number) {
    return prisma.alumni.update({ where: { id }, data: { isApproved: false, status: 'rejected', updatedAt: new Date() } });
  },

  async getCareerTimeline(alumniId: number) {
    return prisma.careerTimeline.findMany({
      where: { alumniId },
      orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
    });
  },

  async addCareerEntry(data: Prisma.CareerTimelineCreateInput) {
    return prisma.careerTimeline.create({ data });
  },

  async getEducationHistory(userId: number, userRole: string, collegeId: string) {
    return prisma.educationHistory.findMany({
      where: { userId, userRole, collegeId },
      orderBy: { startYear: 'desc' },
    });
  },

  async addEducationEntry(data: Prisma.EducationHistoryCreateInput) {
    return prisma.educationHistory.create({ data });
  },

  async updateEducationEntry(id: number, userId: number, data: Prisma.EducationHistoryUpdateInput) {
    return prisma.educationHistory.update({ where: { id, userId }, data: { ...data, updatedAt: new Date() } });
  },

  async deleteEducationEntry(id: number, userId: number) {
    return prisma.educationHistory.delete({ where: { id, userId } });
  },

  async count(where: Prisma.AlumniWhereInput) {
    return prisma.alumni.count({ where });
  },

  async getDistinctDepartments(collegeId: string) {
    return prisma.alumni.findMany({
      where: { collegeId, isActive: true, isApproved: true, department: { not: null } },
      select: { department: true },
      distinct: ['department'],
      orderBy: { department: 'asc' },
    });
  },

  async getDistinctCompanies(collegeId: string) {
    return prisma.alumni.findMany({
      where: { collegeId, isActive: true, isApproved: true, company: { not: null } },
      select: { company: true },
      distinct: ['company'],
      orderBy: { company: 'asc' },
    });
  },
};
