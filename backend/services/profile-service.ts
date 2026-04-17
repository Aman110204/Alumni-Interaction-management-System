import { profileRepository } from '../repositories/profile-repository';
import { connectionRepository } from '../repositories/connection-repository';

export const profileService = {
  async getFullProfile(userId: number, userType: string, collegeId: string) {
    if (userType === 'alumni') {
      const alumni = await profileRepository.getAlumniProfile(userId);
      if (!alumni) throw Object.assign(new Error('Alumni not found'), { status: 404 });
      const [education, companies] = await Promise.all([
        profileRepository.getEducationHistory(userId, 'alumni', collegeId),
        profileRepository.getAlumniCompanies(userId),
      ]);
      const { passwordHash, ...safe } = alumni;
      return { basic: safe, experience: alumni.careerTimeline, education, companies, user_type: 'alumni' };
    }
    const student = await profileRepository.getStudentProfile(userId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });
    const education = await profileRepository.getEducationHistory(userId, 'student', collegeId);
    const { passwordHash, ...safe } = student;
    return { basic: safe, education, user_type: 'student' };
  },

  async getAlumniCompanies(alumniId: number, collegeId: string) {
    return profileRepository.getAlumniCompanies(alumniId);
  },

  async getAlumniGrouped(type: string, collegeId: string) {
    return profileRepository.getAlumniGrouped(type, collegeId);
  },

  async getMutuals(userId: number, userRole: string, targetId: number) {
    const [myConnections, theirConnections] = await Promise.all([
      connectionRepository.findAllForUser(userId, userRole, ''),
      connectionRepository.findAllForUser(targetId, 'alumni', ''),
    ]);
    const myIds = new Set(myConnections.filter((c) => c.status === 'accepted').map((c) => `${c.recipientId}:${c.recipientType}`));
    const mutuals = theirConnections.filter((c) => c.status === 'accepted' && myIds.has(`${c.recipientId}:${c.recipientType}`));
    return { mutuals, count: mutuals.length };
  },
};
