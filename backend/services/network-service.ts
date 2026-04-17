import { networkRepository } from '../repositories/network-repository';

export const networkService = {
  async getNetworkUsers(params: { userId: number; userRole: string; collegeId: string; page?: number; limit?: number; search?: string; department?: string; company?: string; scope?: string }) {
    const { collegeId, page = 1, limit = 20, search, department, company, scope } = params;
    if (params.userRole === 'student') {
      const { alumni, total } = await networkRepository.findAlumni({ collegeId, search, department, company, scope, page, limit });
      return { users: alumni, total, page, limit, pages: Math.ceil(total / limit) || 1 };
    }
    const [alumniResult, studentResult] = await Promise.all([
      networkRepository.findAlumni({ collegeId, search, department, company, scope, page, limit }),
      networkRepository.findStudents({ collegeId, search, department, page, limit }),
    ]);
    const users = [...alumniResult.alumni, ...studentResult.students];
    const total = alumniResult.total + studentResult.total;
    return { users, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  },

  async getNetworkGrouped(params: { userId: number; userRole: string; collegeId: string; groupBy?: string; scope?: string; search?: string; department?: string }) {
    const { collegeId, scope, search, department } = params;
    const { alumni } = await networkRepository.findAlumni({ collegeId, search, department, scope });
    const grouped: Record<string, typeof alumni> = {};
    for (const a of alumni) {
      const key = a.collegeId;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(a);
    }
    return Object.entries(grouped).map(([key, members]) => ({ group: key, count: members.length, members }));
  },

  async getNetworkGroups(params: { userId: number; userRole: string; collegeId: string; groupType?: string; scope?: string }) {
    const { collegeId, scope } = params;
    const { alumni } = await networkRepository.findAlumni({ collegeId, scope });
    const groups: Record<string, number> = {};
    for (const a of alumni) {
      const key = a.company || 'Unknown';
      groups[key] = (groups[key] || 0) + 1;
    }
    return Object.entries(groups).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  },

  async getGroupMembers(params: { userId: number; userRole: string; collegeId: string; groupType: string; groupKey: string; search?: string; department?: string; batch?: string; page?: number; scope?: string }) {
    const { collegeId, scope, search, department, page = 1, groupType, groupKey } = params;
    const company = groupType === 'company' ? groupKey : undefined;
    const { alumni, total } = await networkRepository.findAlumni({ collegeId, search, department, company, scope, page });
    return { members: alumni, total, page };
  },

  async searchNetwork(params: { q: string; userId: number; userRole: string; collegeId: string; scope?: string; groupType?: string; groupKey?: string }) {
    const { q, collegeId, scope } = params;
    const { alumni } = await networkRepository.findAlumni({ collegeId, search: q, scope });
    return alumni;
  },

  async getNetworkHierarchy(params: { userId: number; userRole: string; collegeId: string; scope?: string; searchField?: string; batch?: string; department?: string; company?: string; course?: string; sort?: string }) {
    const { collegeId, scope, department, company } = params;
    const { alumni } = await networkRepository.findAlumni({ collegeId, department, company, scope });
    return { hierarchy: alumni };
  },
};
