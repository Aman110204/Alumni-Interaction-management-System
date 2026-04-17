import prisma from '../prisma/client';

export const profileRepository = {
  async getAlumniProfile(alumniId: number) {
    return prisma.alumni.findUnique({
      where: { id: alumniId },
      include: {
        careerTimeline: { orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }] },
      },
    });
  },

  async getStudentProfile(studentId: number) {
    return prisma.student.findUnique({ where: { id: studentId } });
  },

  async getEducationHistory(userId: number, userRole: string, collegeId: string) {
    return prisma.educationHistory.findMany({
      where: { userId, userRole, collegeId },
      orderBy: { startYear: 'desc' },
    });
  },

  async getAlumniCompanies(alumniId: number) {
    const [current, timeline] = await Promise.all([
      prisma.alumni.findUnique({ where: { id: alumniId }, select: { company: true } }),
      prisma.careerTimeline.findMany({ where: { alumniId }, select: { company: true }, distinct: ['company'] }),
    ]);
    const companies = new Set<string>();
    if (current?.company) companies.add(current.company);
    timeline.forEach((t: { company: string }) => companies.add(t.company));
    return Array.from(companies);
  },

  async getAlumniGrouped(type: string, collegeId: string) {
    if (type === 'batch') {
      return prisma.alumni.groupBy({
        by: ['graduationYear'],
        where: { collegeId, isActive: true, isApproved: true },
        _count: { id: true },
        orderBy: { graduationYear: 'desc' },
      });
    }
    if (type === 'company') {
      return prisma.alumni.groupBy({
        by: ['company'],
        where: { collegeId, isActive: true, isApproved: true, company: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });
    }
    return prisma.alumni.groupBy({
      by: ['collegeId'],
      where: { isActive: true, isApproved: true },
      _count: { id: true },
    });
  },
};
