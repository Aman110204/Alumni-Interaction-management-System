import prisma from '../prisma/client';

export const networkRepository = {
  async findAlumni(params: {
    collegeId: string;
    search?: string;
    department?: string;
    company?: string;
    scope?: string;
    page?: number;
    limit?: number;
  }) {
    const { collegeId, search, department, company, scope, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where = {
      isActive: true,
      isApproved: true,
      ...(scope !== 'all_colleges' ? { collegeId } : {}),
      ...(department ? { department: { contains: department, mode: 'insensitive' as const } } : {}),
      ...(company ? { company: { contains: company, mode: 'insensitive' as const } } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' as const } },
              { company: { contains: search, mode: 'insensitive' as const } },
              { department: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [alumni, total] = await Promise.all([
      prisma.alumni.findMany({ where, skip, take: limit, orderBy: { fullName: 'asc' } }),
      prisma.alumni.count({ where }),
    ]);
    return { alumni, total };
  },

  async findStudents(params: {
    collegeId: string;
    search?: string;
    department?: string;
    page?: number;
    limit?: number;
  }) {
    const { collegeId, search, department, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where = {
      collegeId,
      isActive: true,
      ...(department ? { department: { contains: department, mode: 'insensitive' as const } } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' as const } },
              { department: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [students, total] = await Promise.all([
      prisma.student.findMany({ where, skip, take: limit, orderBy: { fullName: 'asc' } }),
      prisma.student.count({ where }),
    ]);
    return { students, total };
  },
};
