import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export const referralRepository = {
  async create(data: Prisma.ReferralRequestCreateInput) {
    return prisma.referralRequest.create({ data });
  },

  async findById(id: number) {
    return prisma.referralRequest.findUnique({ where: { id } });
  },

  async findDuplicate(studentId: number, alumniId: number, company: string, collegeId: string) {
    return prisma.referralRequest.findFirst({
      where: { studentId, alumniId, company, status: 'pending', OR: [{ collegeId }, { isCrossCollege: true }] },
    });
  },

  async findForStudent(studentId: number, collegeId: string) {
    return prisma.referralRequest.findMany({
      where: { studentId, OR: [{ collegeId }, { isCrossCollege: true }] },
      include: { alumni: { select: { fullName: true, company: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findForAlumni(alumniId: number, collegeId: string) {
    return prisma.referralRequest.findMany({
      where: { alumniId, OR: [{ collegeId }, { isCrossCollege: true }] },
      orderBy: { createdAt: 'desc' },
    });
  },

  async update(id: number, data: Prisma.ReferralRequestUpdateInput) {
    return prisma.referralRequest.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
  },

  async findAll(params: { collegeId: string; page?: number; limit?: number }) {
    const { collegeId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.ReferralRequestWhereInput = { collegeId };
    const [requests, total] = await Promise.all([
      prisma.referralRequest.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.referralRequest.count({ where }),
    ]);
    return { requests, total };
  },

  async delete(id: number, collegeId: string) {
    return prisma.referralRequest.delete({ where: { id } });
  },
};
