/**
 * services/alumni-service.ts
 *
 * Alumni business logic.
 *
 * Tenant enforcement:
 *   loginAlumni() uses assertSameTenant() from lib/tenant to reject any
 *   attempt to log in via a subdomain that does not match the alumni's
 *   own collegeId. This prevents cross-tenant credential replay attacks.
 */

import bcrypt from 'bcryptjs';
import { alumniRepository } from '../repositories/alumni-repository';
import { signToken } from '../utils/jwt';
import { tenantService } from './tenant-service';
import { assertSameTenant } from '../lib/tenant';

export const alumniService = {
  async registerAlumni(input: {
    college_id?: string;
    fullName?: string;
    full_name?: string;
    email: string;
    password: string;
    company?: string;
    designation?: string;
    location?: string;
    graduationYear?: number;
    graduation_year?: number;
    department?: string;
    phone?: string;
  }) {
    const collegeId = tenantService.requireCollegeId(input.college_id);
    const fullName = (input.fullName || input.full_name || '').trim();
    if (!fullName) throw Object.assign(new Error('Full name is required'), { status: 400 });

    const existing = await alumniRepository.findByEmail(input.email.toLowerCase().trim(), collegeId);
    if (existing) throw Object.assign(new Error('Email already registered at this college'), { status: 409 });

    const passwordHash = await bcrypt.hash(input.password, 12);
    const alumni = await alumniRepository.create({
      college: { connect: { id: collegeId } },
      email: input.email.toLowerCase().trim(),
      passwordHash,
      fullName,
      company: input.company,
      designation: input.designation,
      location: input.location,
      graduationYear: input.graduationYear || input.graduation_year,
      department: input.department,
      phone: input.phone,
      status: 'pending',
      isApproved: false,
    });

    return { alumni: { id: alumni.id, email: alumni.email, full_name: alumni.fullName, status: alumni.status, college_id: collegeId } };
  },

  /**
   * Authenticate an alumni member.
   *
   * Tenant enforcement: if `requestTenantId` (the college resolved from the
   * subdomain by the tenant middleware) is provided, the alumni's collegeId
   * MUST match it. Mismatches are rejected with HTTP 403 before any password
   * comparison — this is the single source of cross-tenant login rejection.
   */
  async loginAlumni(input: {
    email: string;
    password: string;
    college_id?: string;
    /** The tenant collegeId resolved from the request subdomain, if any. */
    requestTenantId?: string | null;
  }) {
    const collegeId = tenantService.requireCollegeId(input.college_id);

    // ── Cross-tenant guard ───────────────────────────────────────────────────
    assertSameTenant(collegeId, input.requestTenantId ?? undefined);

    const alumni = await alumniRepository.findByEmail(input.email.toLowerCase().trim(), collegeId);
    if (!alumni || !alumni.isActive) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    if (!alumni.isApproved) throw Object.assign(new Error('Your account is pending admin approval'), { status: 403 });

    const valid = await bcrypt.compare(input.password, alumni.passwordHash);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const token = signToken({ id: alumni.id, role: 'alumni', email: alumni.email, college_id: collegeId, full_name: alumni.fullName });
    return { token, alumni: { id: alumni.id, email: alumni.email, full_name: alumni.fullName, college_id: collegeId, status: alumni.status } };
  },

  async getProfile(alumniId: number, collegeId: string) {
    const alumni = await alumniRepository.findById(alumniId, collegeId);
    if (!alumni) throw Object.assign(new Error('Alumni not found'), { status: 404 });
    const { passwordHash, ...safe } = alumni;
    return safe;
  },

  async getDashboard(alumniId: number, collegeId: string) {
    const profile = await this.getProfile(alumniId, collegeId);
    return { profile };
  },

  async updateProfile(alumniId: number, collegeId: string, body: Record<string, unknown>) {
    const allowed = ['full_name', 'company', 'designation', 'location', 'phone', 'bio', 'linkedin_url', 'github_url',
      'skills', 'department', 'graduation_year', 'headline', 'available_mentorship', 'available_referral', 'profile_photo',
      'profile_links'];
    const data: Record<string, unknown> = {};
    const mapped: Record<string, string> = {
      full_name: 'fullName', linkedin_url: 'linkedinUrl', github_url: 'githubUrl',
      graduation_year: 'graduationYear', available_mentorship: 'availableMentorship',
      available_referral: 'availableReferral', profile_photo: 'profilePhoto',
      profile_links: 'profileLinks',
    };
    for (const key of allowed) {
      if (key in body) data[mapped[key] || key] = body[key];
    }
    const updated = await alumniRepository.update(alumniId, data);
    const { passwordHash, ...safe } = updated;
    return safe;
  },

  async listAlumni(params: {
    page?: number; limit?: number; search?: string; searchField?: string;
    department?: string; company?: string; batch?: string; skills?: string;
    sort_by?: string; scope?: string; collegeId: string;
  }) {
    const { collegeId, page = 1, limit = 12, search, department, company, batch, sort_by, scope } = params;
    const { alumni, total } = await alumniRepository.findMany({
      collegeId, page, limit, search, department, company,
      graduationYear: batch ? parseInt(batch, 10) : undefined,
      isApproved: true,
      scope,
      sortBy: sort_by,
    });
    const safe = alumni.map(({ passwordHash, ...a }: { passwordHash: string; [k: string]: unknown }) => a);
    return { alumni: safe, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  },

  async getAlumniById(id: number, collegeId: string) {
    const alumni = await alumniRepository.findById(id, collegeId);
    if (!alumni) throw Object.assign(new Error('Alumni not found'), { status: 404 });
    const { passwordHash, ...safe } = alumni;
    return safe;
  },

  async getFilterOptions(collegeId: string, scope?: string) {
    const [depts, companies] = await Promise.all([
      alumniRepository.getDistinctDepartments(collegeId),
      alumniRepository.getDistinctCompanies(collegeId),
    ]);
    return {
      departments: depts.map((d: { department: string | null }) => d.department).filter(Boolean),
      companies: companies.map((c: { company: string | null }) => c.company).filter(Boolean),
    };
  },

  async listStudents(params: { collegeId: string; page?: number; limit?: number; search?: string; department?: string; }) {
    const { collegeId, page = 1, limit = 12, search, department } = params;
    const { studentRepository } = await import('../repositories/student-repository');
    const result = await studentRepository.findMany({ collegeId, search, department, page, limit });
    const safe = result.students.map(({ passwordHash, ...s }: { passwordHash: string; [k: string]: unknown }) => s);
    return { students: safe, total: result.total, page, limit, pages: Math.ceil(result.total / limit) || 1 };
  },

  async getCareerTimeline(alumniId: number, collegeId: string) {
    return alumniRepository.getCareerTimeline(alumniId);
  },

  async addCareerEntry(input: { alumniId: number; collegeId: string; company: string; role?: string;
    start_date?: string; end_date?: string; is_current?: boolean; }) {
    const { alumniId, collegeId, company, role, start_date, end_date, is_current } = input;
    if (!company) throw Object.assign(new Error('Company is required'), { status: 400 });
    return alumniRepository.addCareerEntry({
      alumni: { connect: { id: alumniId } },
      collegeId,
      company,
      role: role || company,
      startDate: start_date ? new Date(start_date) : null,
      endDate: end_date ? new Date(end_date) : null,
      isCurrent: is_current || false,
    });
  },

  async getEducationHistory(userId: number, userRole: string, collegeId: string) {
    return alumniRepository.getEducationHistory(userId, userRole, collegeId);
  },

  async addEducationEntry(input: { userId: number; userRole: string; collegeId: string; institution: string;
    degree?: string; fieldOfStudy?: string; startYear?: number; endYear?: number; }) {
    const { userId, userRole, collegeId, institution, degree, fieldOfStudy, startYear, endYear } = input;
    if (!institution) throw Object.assign(new Error('Institution is required'), { status: 400 });
    return alumniRepository.addEducationEntry({ userId, userRole, collegeId, institution, degree, fieldOfStudy, startYear, endYear });
  },

  async updateEducationEntry(input: { entryId: number; userId: number; userRole: string; collegeId: string;
    institution?: string; degree?: string; fieldOfStudy?: string; startYear?: number; endYear?: number; }) {
    const { entryId, userId, userRole, collegeId, institution, degree, fieldOfStudy, startYear, endYear } = input;
    return alumniRepository.updateEducationEntry(entryId, userId, { institution, degree, fieldOfStudy, startYear, endYear });
  },

  async deleteEducationEntry(entryId: number, userId: number, userRole: string, collegeId: string) {
    return alumniRepository.deleteEducationEntry(entryId, userId);
  },
};
