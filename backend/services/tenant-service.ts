import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export const tenantService = {
  normalizeCollegeId(value: string | null | undefined): string | null {
    if (value == null) return null;
    const normalized = String(value).trim().toLowerCase();
    return normalized || null;
  },

  getDefaultCollegeId(): string {
    return this.normalizeCollegeId(process.env.DEFAULT_COLLEGE_ID) || 'skit';
  },

  getDefaultCollegeName(): string {
    return process.env.DEFAULT_COLLEGE_NAME || 'SKIT College';
  },

  extractCollegeFromHostname(hostname: string | null | undefined): string | null {
    if (!hostname) return null;
    const cleanHost = String(hostname).split(':')[0].trim().toLowerCase();
    if (!cleanHost || cleanHost === 'localhost' || cleanHost === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(cleanHost)) {
      return null;
    }
    const parts = cleanHost.split('.');
    if (parts.length < 3) return null;
    return this.normalizeCollegeId(parts[0]);
  },

  async getCollegeById(collegeId: string | null | undefined) {
    const id = this.normalizeCollegeId(collegeId);
    if (!id) return null;
    return prisma.college.findUnique({ where: { id } });
  },

  async listColleges() {
    return prisma.college.findMany({ orderBy: { name: 'asc' } });
  },

  async ensureCollegeExists(collegeId: string, details: { name?: string; location?: string; code?: string; metadata?: Record<string, unknown> } = {}) {
    const id = this.normalizeCollegeId(collegeId) || this.getDefaultCollegeId();
    const name = (details.name || id).trim();
    return prisma.college.upsert({
      where: { id },
      create: {
        id,
        name,
        location: details.location,
        code: details.code,
        metadata: (details.metadata || {}) as Prisma.InputJsonObject,
      },
      update: { name },
    });
  },

  async assertCollegeExists(collegeId: string | null | undefined) {
    const college = await this.getCollegeById(collegeId);
    if (!college) {
      throw Object.assign(new Error('Invalid college_id'), { status: 400 });
    }
    return college;
  },

  async getUserCollegeId(role: string, userId: number): Promise<string> {
    let record: { collegeId: string | null } | null = null;

    if (role === 'student') {
      record = await prisma.student.findUnique({ where: { id: userId }, select: { collegeId: true } });
    } else if (role === 'alumni') {
      record = await prisma.alumni.findUnique({ where: { id: userId }, select: { collegeId: true } });
    } else if (role === 'admin') {
      record = await prisma.admin.findUnique({ where: { id: userId }, select: { collegeId: true } });
    }

    if (!record) {
      throw Object.assign(new Error(`${role} not found`), { status: 404 });
    }

    return this.normalizeCollegeId(record.collegeId) || this.getDefaultCollegeId();
  },

  requireCollegeId(collegeId: string | null | undefined): string {
    const normalized = this.normalizeCollegeId(collegeId);
    if (!normalized) {
      throw Object.assign(new Error('college_id is required'), { status: 400 });
    }
    return normalized;
  },
};

export default tenantService;
