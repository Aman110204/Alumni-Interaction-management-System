import { referralRepository } from '../repositories/referral-repository';
import { connectionRepository } from '../repositories/connection-repository';
import { notificationRepository } from '../repositories/notification-repository';
import { tenantService } from './tenant-service';
import prisma from '../prisma/client';

export const referralService = {
  async requestReferral(studentId: number, collegeId: string, body: { alumni_id: number; company: string; job_title: string; resume_url?: string; message?: string; allow_cross_college?: boolean }) {
    const { alumni_id, company, job_title, resume_url, message, allow_cross_college } = body;
    if (!alumni_id || !company || !job_title) throw Object.assign(new Error('alumni_id, company, and job_title are required'), { status: 400 });

    const studentCollegeId = await tenantService.getUserCollegeId('student', studentId);
    if (studentCollegeId !== collegeId) throw Object.assign(new Error('Invalid tenant context for referral request'), { status: 403 });

    const target = await prisma.alumni.findFirst({ where: { id: alumni_id, isActive: true } });
    if (!target) throw Object.assign(new Error('Alumni not found'), { status: 404 });

    const isCrossCollege = target.collegeId !== collegeId;
    if (isCrossCollege && !allow_cross_college) throw Object.assign(new Error('Cross-college referral requires explicit opt-in'), { status: 403 });

    // Require accepted connection
    const connection = await connectionRepository.findBetween(studentId, 'student', alumni_id, 'alumni');
    if (!connection || connection.status !== 'accepted') throw Object.assign(new Error('You must be connected with this alumni before requesting a referral'), { status: 403 });

    // Verify alumni worked at company
    const careerCheck = await prisma.careerTimeline.findFirst({ where: { alumniId: alumni_id, company: { equals: company, mode: 'insensitive' } } });
    const currentCompany = target.company?.toLowerCase() === company.toLowerCase();
    if (!careerCheck && !currentCompany) throw Object.assign(new Error('Referral can only be requested for companies where this alumni has worked.'), { status: 422 });

    const dup = await referralRepository.findDuplicate(studentId, alumni_id, company, collegeId);
    if (dup) throw Object.assign(new Error('You already have a pending referral request for this company with this alumni'), { status: 409 });

    const request = await referralRepository.create({
      studentId, alumni: { connect: { id: alumni_id } }, collegeId, isCrossCollege, company, jobTitle: job_title, resumeUrl: resume_url, message,
    });

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { fullName: true } });
    notificationRepository.create({ userId: alumni_id, userType: 'alumni', title: 'New Referral Request', message: `${student?.fullName || 'A student'} is requesting a referral for ${company}.`, type: 'referral', collegeId }).catch(() => {});

    return request;
  },

  async getMyReferralRequests(studentId: number, collegeId: string) {
    return referralRepository.findForStudent(studentId, collegeId);
  },

  async getAlumniReferralRequests(alumniId: number, collegeId: string) {
    return referralRepository.findForAlumni(alumniId, collegeId);
  },

  async respondToReferral(requestId: number, alumniId: number, collegeId: string, body: { status: string; response?: string }) {
    const { status, response } = body;
    if (!['accepted', 'rejected'].includes(status)) throw Object.assign(new Error('Status must be accepted or rejected'), { status: 400 });

    const req = await referralRepository.findById(requestId);
    if (!req || req.alumniId !== alumniId) throw Object.assign(new Error('Request not found or you do not have permission'), { status: 404 });

    const updated = await referralRepository.update(requestId, { status, response });

    const alumni = await prisma.alumni.findUnique({ where: { id: alumniId }, select: { fullName: true } });
    notificationRepository.create({
      userId: req.studentId, userType: 'student', collegeId,
      title: `Referral Request ${status === 'accepted' ? 'Accepted' : 'Rejected'}`,
      message: `${alumni?.fullName || 'An alumni'} ${status === 'accepted' ? 'accepted' : 'declined'} your referral request for ${req.company}.`,
      type: 'referral',
    }).catch(() => {});

    return updated;
  },
};
