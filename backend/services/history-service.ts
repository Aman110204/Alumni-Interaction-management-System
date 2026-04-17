import prisma from '../prisma/client';

export const historyService = {
  async getStudentHistory(studentId: number, collegeId: string) {
    const [apps, events, mentorship, referrals] = await Promise.all([
      prisma.jobApplication.findMany({
        where: { studentId, collegeId },
        include: { opportunity: { select: { title: true, company: true, jobType: true, location: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.eventRegistration.findMany({
        where: { participantId: studentId, participantType: 'student', collegeId },
        include: { event: { select: { title: true, eventDate: true, location: true, eventType: true, status: true } } },
        orderBy: { registeredAt: 'desc' },
        take: 50,
      }),
      prisma.mentorshipRequest.findMany({
        where: { studentId, OR: [{ collegeId }, { isCrossCollege: true }] },
        include: { alumni: { select: { fullName: true, company: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.referralRequest.findMany({
        where: { studentId, OR: [{ collegeId }, { isCrossCollege: true }] },
        include: { alumni: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const all = [
      ...apps.map((a) => ({ id: a.id, created_at: a.createdAt, status: a.status, type: 'application', title: a.opportunity.title, company: a.opportunity.company, job_type: a.opportunity.jobType, location: a.opportunity.location })),
      ...events.map((e) => ({ id: e.id, created_at: e.registeredAt, type: 'event_registration', title: e.event.title, event_date: e.event.eventDate, location: e.event.location, event_type: e.event.eventType, status: e.event.status })),
      ...mentorship.map((m) => ({ id: m.id, created_at: m.createdAt, status: m.status, type: 'mentorship', message: m.message, with_name: m.alumni.fullName, company: m.alumni.company })),
      ...referrals.map((r) => ({ id: r.id, created_at: r.createdAt, status: r.status, type: 'referral', company: r.company, job_title: r.jobTitle, with_name: r.alumni.fullName })),
    ];

    return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
};
