import { eventRepository } from '../repositories/event-repository';

export const eventService = {
  async listEvents(params: { page?: number; limit?: number; status?: string; event_type?: string; organizer?: string; search?: string; collegeId: string }) {
    const { collegeId, page = 1, limit = 20, status, event_type, organizer, search } = params;
    const { events, total } = await eventRepository.findMany({ collegeId, page, limit, status, eventType: event_type, organizer, search });
    return { events, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  },

  async getEventById(id: number, collegeId: string) {
    const event = await eventRepository.findById(id, collegeId);
    if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });
    return event;
  },

  async registerForEvent(eventId: number, studentId: number, collegeId: string) {
    const event = await this.getEventById(eventId, collegeId);
    if (event.status === 'cancelled') throw Object.assign(new Error('This event has been cancelled'), { status: 400 });
    const registered = (event as unknown as { _count?: { registrations?: number } })._count?.registrations || 0;
    if (event.maxCapacity && registered >= event.maxCapacity) throw Object.assign(new Error('Event is at full capacity'), { status: 400 });

    try {
      await eventRepository.registerParticipant(eventId, studentId, 'student', collegeId);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') throw Object.assign(new Error('Already registered for this event'), { status: 409 });
      throw err;
    }
    return { event_id: eventId, student_id: studentId };
  },

  async cancelRegistration(eventId: number, studentId: number, collegeId: string) {
    const result = await eventRepository.cancelRegistration(eventId, studentId, 'student', collegeId);
    if (result.count === 0) throw Object.assign(new Error('Registration not found'), { status: 404 });
    return { event_id: eventId, student_id: studentId };
  },

  async getMyRegistrations(studentId: number, collegeId: string) {
    return eventRepository.getRegistrationsForStudent(studentId, collegeId);
  },
};
