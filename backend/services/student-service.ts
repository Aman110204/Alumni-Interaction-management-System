/**
 * services/student-service.ts
 *
 * Student business logic.
 *
 * Tenant enforcement:
 *   loginStudent() uses assertSameTenant() from lib/tenant to reject any
 *   attempt to log in via a subdomain that does not match the student's
 *   own collegeId. This prevents cross-tenant credential replay attacks.
 */

import bcrypt from 'bcryptjs';
import { studentRepository } from '../repositories/student-repository';
import { signToken } from '../utils/jwt';
import { tenantService } from './tenant-service';
import { assertSameTenant } from '../lib/tenant';

export const studentService = {
  async registerStudent(input: {
    college_id?: string;
    fullName?: string;
    full_name?: string;
    usn?: string;
    email: string;
    password: string;
    department?: string;
    year?: string | number;
    phone?: string;
  }) {
    const collegeId = tenantService.requireCollegeId(input.college_id);
    const fullName = (input.fullName || input.full_name || '').trim();
    if (!fullName) throw Object.assign(new Error('Full name is required'), { status: 400 });

    const existing = await studentRepository.findByEmail(input.email.toLowerCase().trim(), collegeId);
    if (existing) throw Object.assign(new Error('Email already registered at this college'), { status: 409 });

    const passwordHash = await bcrypt.hash(input.password, 12);
    const student = await studentRepository.create({
      college: { connect: { id: collegeId } },
      email: input.email.toLowerCase().trim(),
      passwordHash,
      fullName,
      department: input.department,
      year: input.year ? parseInt(String(input.year), 10) : null,
      rollNumber: input.usn,
      phone: input.phone,
      isApproved: false,
    });

    const token = signToken({ id: student.id, role: 'student', email: student.email, college_id: collegeId });
    return { token, student: { id: student.id, email: student.email, full_name: student.fullName, college_id: collegeId } };
  },

  /**
   * Authenticate a student.
   *
   * Tenant enforcement: if `requestTenantId` (the college resolved from the
   * subdomain by the tenant middleware) is provided, the student's collegeId
   * MUST match it. Mismatches are rejected with HTTP 403 before any password
   * comparison — this is the single source of cross-tenant login rejection.
   */
  async loginStudent(input: {
    email: string;
    password: string;
    college_id?: string;
    /** The tenant collegeId resolved from the request subdomain, if any. */
    requestTenantId?: string | null;
  }) {
    const collegeId = tenantService.requireCollegeId(input.college_id);

    // ── Cross-tenant guard ───────────────────────────────────────────────────
    // Reject the login attempt if the subdomain tenant does not match the
    // collegeId the client is trying to authenticate against.
    assertSameTenant(collegeId, input.requestTenantId ?? undefined);

    const student = await studentRepository.findByEmail(input.email.toLowerCase().trim(), collegeId);
    if (!student || !student.isActive) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    if (!student.isApproved) throw Object.assign(new Error('Your account is pending admin approval'), { status: 403 });

    const valid = await bcrypt.compare(input.password, student.passwordHash);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const token = signToken({ id: student.id, role: 'student', email: student.email, college_id: collegeId, full_name: student.fullName });
    return { token, student: { id: student.id, email: student.email, full_name: student.fullName, college_id: collegeId, is_approved: student.isApproved } };
  },

  async getProfile(studentId: number, collegeId: string) {
    const student = await studentRepository.findById(studentId, collegeId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });
    const { passwordHash, ...safe } = student;
    return safe;
  },

  async getDashboard(studentId: number, collegeId: string) {
    const profile = await this.getProfile(studentId, collegeId);
    return { profile };
  },

  async updateProfile(studentId: number, collegeId: string, body: Record<string, unknown>) {
    const allowed = ['full_name', 'phone', 'bio', 'skills', 'headline', 'location', 'linkedin_url', 'github_url', 'resume_url', 'profile_photo'];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        const mapped: Record<string, string> = {
          full_name: 'fullName', linkedin_url: 'linkedinUrl', github_url: 'githubUrl',
          resume_url: 'resumeUrl', profile_photo: 'profilePhoto',
        };
        data[mapped[key] || key] = body[key];
      }
    }
    const updated = await studentRepository.update(studentId, collegeId, data);
    const { passwordHash, ...safe } = updated;
    return safe;
  },

  async changePassword(studentId: number, currentPassword: string, newPassword: string) {
    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('User not found'), { status: 404 });
    const valid = await bcrypt.compare(currentPassword, student.passwordHash);
    if (!valid) throw Object.assign(new Error('Current password is incorrect'), { status: 401 });
    if (newPassword.length < 8) throw Object.assign(new Error('New password must be at least 8 characters'), { status: 400 });
    const hash = await bcrypt.hash(newPassword, 12);
    await studentRepository.update(studentId, student.collegeId, { passwordHash: hash });
    return { message: 'Password changed successfully' };
  },
};
