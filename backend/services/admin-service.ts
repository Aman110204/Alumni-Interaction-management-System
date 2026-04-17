import bcrypt from 'bcryptjs';
import { adminRepository } from '../repositories/admin-repository';
import { studentRepository } from '../repositories/student-repository';
import { alumniRepository } from '../repositories/alumni-repository';
import { eventRepository } from '../repositories/event-repository';
import { opportunityRepository } from '../repositories/opportunity-repository';
import { announcementRepository } from '../repositories/announcement-repository';
import { mentorshipRepository } from '../repositories/mentorship-repository';
import { referralRepository } from '../repositories/referral-repository';
import { signToken } from '../utils/jwt';
import { tenantService } from './tenant-service';
import { alumniService } from './alumni-service';
import prisma from '../prisma/client';

export const adminService = {
  async loginAdmin(input: { login?: string; username?: string; email?: string; password: string; college_id?: string }) {
    const login = (input.login || input.username || input.email || '').trim();
    if (!login) throw Object.assign(new Error('Username or email is required'), { status: 400 });

    const admin = await adminRepository.findByUsernameOrEmail(login);
    if (!admin) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const valid = await bcrypt.compare(input.password, admin.passwordHash);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const token = signToken({ id: admin.id, role: 'admin', email: admin.email, college_id: admin.collegeId || undefined });
    return { token, admin: { id: admin.id, email: admin.email, full_name: admin.fullName, college_id: admin.collegeId } };
  },

  async getDashboardStats(collegeId: string) {
    const [totalStudents, pendingStudents, totalAlumni, pendingAlumni, totalEvents, totalOpportunities] = await Promise.all([
      studentRepository.count({ collegeId }),
      studentRepository.count({ collegeId, isApproved: false }),
      alumniRepository.count({ collegeId }),
      alumniRepository.count({ collegeId, isApproved: false }),
      prisma.event.count({ where: { collegeId } }),
      prisma.opportunity.count({ where: { collegeId } }),
    ]);
    return { totalStudents, pendingStudents, totalAlumni, pendingAlumni, totalEvents, totalOpportunities };
  },

  async getPendingUsers(collegeId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [pendingStudents, pendingAlumni] = await Promise.all([
      prisma.student.findMany({ where: { collegeId, isApproved: false, isActive: true }, skip, take: Math.ceil(limit / 2), orderBy: { createdAt: 'desc' } }),
      prisma.alumni.findMany({ where: { collegeId, isApproved: false, isActive: true }, skip, take: Math.ceil(limit / 2), orderBy: { createdAt: 'desc' } }),
    ]);
    return {
      pendingStudents: (pendingStudents as Array<{ passwordHash: string } & Record<string, unknown>>).map((student) => {
        const { passwordHash, ...safe } = student;
        return { ...safe, user_type: 'student' };
      }),
      pendingAlumni: (pendingAlumni as Array<{ passwordHash: string } & Record<string, unknown>>).map((alumni) => {
        const { passwordHash, ...safe } = alumni;
        return { ...safe, user_type: 'alumni' };
      }),
    };
  },

  async listStudents(collegeId: string, params: { page?: number; limit?: number; search?: string; department?: string }) {
    const { page = 1, limit = 20, search, department } = params;
    const { students, total } = await studentRepository.findMany({ collegeId, page, limit, search, department });
    const safe = (students as Array<{ passwordHash: string } & Record<string, unknown>>).map((student) => {
      const { passwordHash, ...safeStudent } = student;
      return safeStudent;
    });
    return { students: safe, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  },

  async listAlumni(collegeId: string, params: { page?: number; limit?: number; search?: string; department?: string }) {
    const { page = 1, limit = 20, search, department } = params;
    const { alumni, total } = await alumniRepository.findMany({ collegeId, page, limit, search, department });
    const safe = (alumni as Array<{ passwordHash: string } & Record<string, unknown>>).map((alumnus) => {
      const { passwordHash, ...safeAlumnus } = alumnus;
      return {
        ...safeAlumnus,
        full_name: safeAlumnus.fullName,
        college_id: safeAlumnus.collegeId,
        graduation_year: safeAlumnus.graduationYear,
        is_approved: safeAlumnus.isApproved,
      };
    });
    return { alumni: safe, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  },

  async approveUser(id: number, role: string, collegeId: string) {
    if (role === 'student') return studentRepository.approve(id, collegeId);
    if (role === 'alumni') return alumniRepository.approve(id);
    throw Object.assign(new Error('Invalid role'), { status: 400 });
  },

  async rejectUser(id: number, role: string, collegeId: string) {
    if (role === 'student') return studentRepository.reject(id, collegeId);
    if (role === 'alumni') return alumniRepository.reject(id);
    throw Object.assign(new Error('Invalid role'), { status: 400 });
  },

  async listEvents(collegeId: string, params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const { events, total } = await eventRepository.findMany({ collegeId, page, limit });
    return { events, total, page, limit };
  },

  async createEvent(adminId: number, collegeId: string, body: Record<string, unknown>) {
    return eventRepository.create({
      collegeId,
      adminId,
      title: body.title as string,
      description: body.description as string,
      eventType: body.event_type as string,
      organizer: body.organizer as string,
      location: body.location as string,
      eventDate: body.event_date ? new Date(body.event_date as string) : null,
      maxCapacity: body.max_capacity ? parseInt(String(body.max_capacity), 10) : undefined,
    });
  },

  async updateEvent(id: number, collegeId: string, body: Record<string, unknown>) {
    return eventRepository.update(id, collegeId, { title: body.title as string, description: body.description as string, status: body.status as string, location: body.location as string, eventDate: body.event_date ? new Date(body.event_date as string) : undefined });
  },

  async deleteEvent(id: number, collegeId: string) {
    return eventRepository.delete(id, collegeId);
  },

  async listOpportunities(collegeId: string, params: { page?: number; limit?: number; status?: string }) {
    const { page = 1, limit = 20, status } = params;
    return opportunityRepository.findMany({ collegeId, page, limit, status });
  },

  async updateOpportunityStatus(id: number, status: string, collegeId: string) {
    return opportunityRepository.updateStatus(id, status, collegeId);
  },

  async createAnnouncement(adminId: number, collegeId: string, body: Record<string, unknown>) {
    return announcementRepository.create({
      collegeId,
      adminId,
      title: body.title as string,
      description: body.description as string,
      postedBy: body.posted_by as string,
      targetRole: (body.target_role as string) || 'all',
    });
  },

  async listAnnouncements(collegeId: string, params: { page?: number; limit?: number }) {
    return announcementRepository.findMany({ collegeId, page: params.page, limit: params.limit });
  },

  async getMentorshipRequests(collegeId: string, params: { page?: number; limit?: number }) {
    return mentorshipRepository.findAll({ collegeId, ...params });
  },

  async getReferralRequests(collegeId: string, params: { page?: number; limit?: number }) {
    return referralRepository.findAll({ collegeId, ...params });
  },

  async listColleges() {
    return tenantService.listColleges();
  },

  async getReports(collegeId: string) {
    const [students, alumni, events, connections, mentorships, referrals, opportunities, messages] = await Promise.all([
      prisma.student.count({ where: { collegeId } }),
      prisma.alumni.count({ where: { collegeId } }),
      prisma.event.count({ where: { collegeId } }),
      prisma.connectionRequest.count({ where: { collegeId } }),
      prisma.mentorshipRequest.count({ where: { collegeId } }),
      prisma.referralRequest.count({ where: { collegeId } }),
      prisma.opportunity.count({ where: { collegeId } }),
      prisma.message.count({ where: { collegeId } }),
    ]);
    return { students, alumni, events, connections, mentorships, referrals, opportunities, messages };
  },

  async getStudentProfile(id: number, collegeId: string) {
    return prisma.student.findFirst({ where: { id, collegeId } });
  },

  async getAlumniProfile(id: number, collegeId: string) {
    return prisma.alumni.findFirst({ where: { id, collegeId } });
  },

  async deleteStudent(id: number, collegeId: string) {
    const student = await prisma.student.findFirst({ where: { id, collegeId } });
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });
    return prisma.student.delete({ where: { id } });
  },

  async deleteAlumni(id: number, collegeId: string) {
    const alumni = await prisma.alumni.findFirst({ where: { id, collegeId } });
    if (!alumni) throw Object.assign(new Error('Alumni not found'), { status: 404 });
    return prisma.alumni.delete({ where: { id } });
  },

  async addAlumniCareerEntry(alumniId: number, collegeId: string, body: Record<string, unknown>) {
    const alumni = await prisma.alumni.findFirst({ where: { id: alumniId, collegeId } });
    if (!alumni) throw Object.assign(new Error('Alumni not found'), { status: 404 });
    return alumniService.addCareerEntry({
      alumniId,
      collegeId,
      ...(body as {
        company: string;
        role?: string;
        start_date?: string;
        end_date?: string;
        is_current?: boolean;
      }),
    });
  },

  async deleteAnnouncement(id: number, collegeId: string) {
    const announcement = await prisma.announcement.findFirst({ where: { id, OR: [{ collegeId }, { isGlobal: true }] } });
    if (!announcement) throw Object.assign(new Error('Announcement not found'), { status: 404 });
    return prisma.announcement.delete({ where: { id } });
  },

  async deleteReferral(id: number, collegeId: string) {
    const referral = await prisma.referralRequest.findFirst({ where: { id, collegeId } });
    if (!referral) throw Object.assign(new Error('Referral not found'), { status: 404 });
    return prisma.referralRequest.delete({ where: { id } });
  },

  async deleteOpportunity(id: number, collegeId: string) {
    const opportunity = await prisma.opportunity.findFirst({ where: { id, collegeId } });
    if (!opportunity) throw Object.assign(new Error('Opportunity not found'), { status: 404 });
    return prisma.opportunity.delete({ where: { id } });
  },
};
