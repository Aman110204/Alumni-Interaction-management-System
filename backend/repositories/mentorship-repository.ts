import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export const mentorshipRepository = {
  async create(data: Prisma.MentorshipRequestCreateInput) {
    return prisma.mentorshipRequest.create({ data });
  },

  async findById(id: number) {
    return prisma.mentorshipRequest.findUnique({ where: { id } });
  },

  async findDuplicate(studentId: number, alumniId: number, collegeId: string) {
    return prisma.mentorshipRequest.findFirst({
      where: { studentId, alumniId, status: 'pending', OR: [{ collegeId }, { isCrossCollege: true }] },
    });
  },

  async countActive(studentId: number, collegeId: string) {
    return prisma.mentorshipRequest.count({
      where: { studentId, status: { in: ['pending', 'accepted'] }, OR: [{ collegeId }, { isCrossCollege: true }] },
    });
  },

  async findForStudent(studentId: number, collegeId: string) {
    return prisma.mentorshipRequest.findMany({
      where: { studentId, OR: [{ collegeId }, { isCrossCollege: true }] },
      include: { alumni: { select: { fullName: true, company: true, designation: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findForAlumni(alumniId: number, collegeId: string) {
    return prisma.mentorshipRequest.findMany({
      where: { alumniId, OR: [{ collegeId }, { isCrossCollege: true }] },
      orderBy: { createdAt: 'desc' },
    });
  },

  async update(id: number, data: Prisma.MentorshipRequestUpdateInput) {
    return prisma.mentorshipRequest.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
  },

  async findAll(params: { collegeId: string; page?: number; limit?: number }) {
    const { collegeId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.MentorshipRequestWhereInput = { collegeId };
    const [requests, total] = await Promise.all([
      prisma.mentorshipRequest.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.mentorshipRequest.count({ where }),
    ]);
    return { requests, total };
  },

  async delete(id: number, collegeId: string) {
    return prisma.mentorshipRequest.delete({ where: { id } });
  },
};
