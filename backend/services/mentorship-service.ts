import { mentorshipRepository } from '../repositories/mentorship-repository';
import { connectionRepository } from '../repositories/connection-repository';
import { notificationRepository } from '../repositories/notification-repository';
import { tenantService } from './tenant-service';
import prisma from '../prisma/client';

const MENTORSHIP_ACTIVE_LIMIT = 5;

export const mentorshipService = {
  async requestMentorship(studentId: number, collegeId: string, body: { alumni_id: number; message?: string; allow_cross_college?: boolean }) {
    const { alumni_id, message, allow_cross_college } = body;
    if (!alumni_id) throw Object.assign(new Error('alumni_id is required'), { status: 400 });

    const studentCollegeId = await tenantService.getUserCollegeId('student', studentId);
    if (studentCollegeId !== collegeId) throw Object.assign(new Error('Invalid tenant context for mentorship request'), { status: 403 });

    const target = await prisma.alumni.findFirst({ where: { id: alumni_id, isActive: true } });
    if (!target) throw Object.assign(new Error('Alumni not found'), { status: 404 });

    const isCrossCollege = target.collegeId !== collegeId;
    if (isCrossCollege && !allow_cross_college) throw Object.assign(new Error('Cross-college mentorship requires explicit opt-in'), { status: 403 });

    const dup = await mentorshipRepository.findDuplicate(studentId, alumni_id, collegeId);
    if (dup) throw Object.assign(new Error('You already have a pending mentorship request with this alumni'), { status: 409 });

    const activeCount = await mentorshipRepository.countActive(studentId, collegeId);
    if (activeCount >= MENTORSHIP_ACTIVE_LIMIT) throw Object.assign(new Error(`You have reached the maximum of ${MENTORSHIP_ACTIVE_LIMIT} active mentorship requests`), { status: 429 });

    const request = await mentorshipRepository.create({
      studentId,
      alumni: { connect: { id: alumni_id } },
      collegeId,
      isCrossCollege,
      message,
    });

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { fullName: true } });
    const studentName = student?.fullName || 'A student';
    notificationRepository.create({ userId: alumni_id, userType: 'alumni', title: 'New Mentorship Request', message: `${studentName} sent you a mentorship request.`, type: 'mentorship', collegeId }).catch(() => {});

    return request;
  },

  async getMyMentorshipRequests(studentId: number, collegeId: string) {
    return mentorshipRepository.findForStudent(studentId, collegeId);
  },

  async getAlumniMentorshipRequests(alumniId: number, collegeId: string) {
    return mentorshipRepository.findForAlumni(alumniId, collegeId);
  },

  async respondToMentorship(requestId: number, alumniId: number, collegeId: string, body: { status: string; response?: string }) {
    const { status, response } = body;
    if (!['accepted', 'rejected'].includes(status)) throw Object.assign(new Error('Status must be accepted or rejected'), { status: 400 });

    const req = await mentorshipRepository.findById(requestId);
    if (!req || req.alumniId !== alumniId) throw Object.assign(new Error('Request not found or you do not have permission'), { status: 404 });

    const updated = await mentorshipRepository.update(requestId, { status, response, responseMessage: response });

    if (status === 'accepted') {
      const existing = await connectionRepository.findBetween(req.studentId, 'student', alumniId, 'alumni');
      if (!existing || existing.status !== 'accepted') {
        connectionRepository.create({
          requesterId: alumniId, requesterType: 'alumni',
          recipientId: req.studentId, recipientType: 'student',
          collegeId, message: 'Auto-connected via mentorship acceptance',
          status: 'accepted',
        }).catch(() => {});
      }
    }

    const alumni = await prisma.alumni.findUnique({ where: { id: alumniId }, select: { fullName: true } });
    const alumniName = alumni?.fullName || 'An alumni';
    notificationRepository.create({
      userId: req.studentId, userType: 'student', collegeId,
      title: `Mentorship Request ${status === 'accepted' ? 'Accepted' : 'Rejected'}`,
      message: `${alumniName} ${status === 'accepted' ? 'accepted' : 'declined'} your mentorship request.`,
      type: 'mentorship',
    }).catch(() => {});

    return updated;
  },
};
