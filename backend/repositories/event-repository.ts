import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export const eventRepository = {
  async findMany(params: {
    collegeId: string;
    status?: string;
    eventType?: string;
    organizer?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { collegeId, status, eventType, organizer, search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.EventWhereInput = {
      collegeId,
      ...(status ? { status } : {}),
      ...(eventType ? { eventType } : {}),
      ...(organizer ? { organizer: { contains: organizer, mode: 'insensitive' } } : {}),
      ...(search
        ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] }
        : {}),
    };
    const [events, total] = await Promise.all([
      prisma.event.findMany({ where, skip, take: limit, orderBy: { eventDate: 'asc' }, include: { _count: { select: { registrations: true } } } }),
      prisma.event.count({ where }),
    ]);
    return { events, total };
  },

  async findById(id: number, collegeId: string) {
    return prisma.event.findFirst({ where: { id, collegeId }, include: { _count: { select: { registrations: true } } } });
  },

  async create(data: Prisma.EventCreateInput) {
    return prisma.event.create({ data });
  },

  async update(id: number, collegeId: string, data: Prisma.EventUpdateInput) {
    return prisma.event.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
  },

  async delete(id: number, collegeId: string) {
    return prisma.event.delete({ where: { id } });
  },

  async registerParticipant(eventId: number, participantId: number, participantType: string, collegeId: string) {
    return prisma.eventRegistration.create({
      data: { eventId, participantId, participantType, studentId: participantType === 'student' ? participantId : null, collegeId },
    });
  },

  async cancelRegistration(eventId: number, participantId: number, participantType: string, collegeId: string) {
    return prisma.eventRegistration.deleteMany({
      where: { eventId, participantId, participantType, collegeId },
    });
  },

  async getRegistrationsForStudent(studentId: number, collegeId: string) {
    return prisma.eventRegistration.findMany({
      where: { participantId: studentId, participantType: 'student', collegeId },
      include: { event: true },
    });
  },
};
