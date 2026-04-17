import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export const opportunityRepository = {
  async findMany(params: {
    collegeId: string;
    status?: string;
    search?: string;
    jobType?: string;
    page?: number;
    limit?: number;
  }) {
    const { collegeId, status, search, jobType, page = 1, limit = 12 } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.OpportunityWhereInput = {
      collegeId,
      ...(status ? { status } : {}),
      ...(jobType ? { jobType } : {}),
      ...(search
        ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { company: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] }
        : {}),
    };
    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.opportunity.count({ where }),
    ]);
    return { opportunities, total };
  },

  async findById(id: number, collegeId: string) {
    return prisma.opportunity.findFirst({ where: { id, collegeId } });
  },

  async create(data: Prisma.OpportunityCreateInput) {
    return prisma.opportunity.create({ data });
  },

  async update(id: number, alumniId: number, collegeId: string, data: Prisma.OpportunityUpdateInput) {
    return prisma.opportunity.updateMany({ where: { id, alumniId, collegeId }, data: { ...data, updatedAt: new Date() } });
  },

  async updateStatus(id: number, status: string, collegeId: string) {
    return prisma.opportunity.update({ where: { id }, data: { status, updatedAt: new Date() } });
  },

  async delete(id: number, alumniId: number, collegeId: string) {
    return prisma.opportunity.deleteMany({ where: { id, alumniId, collegeId } });
  },

  async findByAlumni(alumniId: number, collegeId: string) {
    return prisma.opportunity.findMany({
      where: { alumniId, collegeId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { applications: true } } },
    });
  },

  async createApplication(opportunityId: number, studentId: number, collegeId: string) {
    return prisma.jobApplication.create({ data: { opportunityId, studentId, collegeId } });
  },

  async getStudentApplications(studentId: number, collegeId: string) {
    return prisma.jobApplication.findMany({
      where: { studentId, collegeId },
      include: { opportunity: true },
      orderBy: { createdAt: 'desc' },
    });
  },
};
