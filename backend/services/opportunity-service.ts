import { opportunityRepository } from '../repositories/opportunity-repository';
import { tenantService } from './tenant-service';

export const opportunityService = {
  async listOpportunities(params: { page?: number; limit?: number; search?: string; job_type?: string; status?: string; collegeId: string }) {
    const { collegeId, page = 1, limit = 12, search, job_type, status = 'active' } = params;
    const { opportunities, total } = await opportunityRepository.findMany({ collegeId, page, limit, search, jobType: job_type, status });
    return { opportunities, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  },

  async getOpportunityById(id: number, collegeId: string) {
    const opp = await opportunityRepository.findById(id, collegeId);
    if (!opp) throw Object.assign(new Error('Opportunity not found'), { status: 404 });
    return opp;
  },

  async applyForOpportunity(opportunityId: number, studentId: number, collegeId: string) {
    const opp = await this.getOpportunityById(opportunityId, collegeId);
    if (opp.status !== 'active') throw Object.assign(new Error('This opportunity is no longer active'), { status: 400 });
    try {
      return await opportunityRepository.createApplication(opportunityId, studentId, collegeId);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') throw Object.assign(new Error('You have already applied for this opportunity'), { status: 409 });
      throw err;
    }
  },

  async getMyApplications(studentId: number, collegeId: string) {
    return opportunityRepository.getStudentApplications(studentId, collegeId);
  },

  async createOpportunity(alumniId: number, collegeId: string, body: Record<string, unknown>) {
    const title = body.title as string;
    if (!title) throw Object.assign(new Error('Title is required'), { status: 400 });
    await tenantService.assertCollegeExists(collegeId);
    return opportunityRepository.create({
      collegeId,
      alumniId,
      title,
      company: body.company as string,
      location: body.location as string,
      jobType: (body.job_type as string) || 'Full-time',
      description: body.description as string,
      skillsRequired: body.skills_required as string,
      salary: body.salary as string,
      applyLink: body.apply_link as string,
      deadline: body.deadline ? new Date(body.deadline as string) : undefined,
      openingsCount: parseInt(String(body.openings_count || 1), 10),
    });
  },

  async getAlumniOpportunities(alumniId: number, collegeId: string) {
    return opportunityRepository.findByAlumni(alumniId, collegeId);
  },

  async updateOpportunity(id: number, alumniId: number, collegeId: string, body: Record<string, unknown>) {
    const result = await opportunityRepository.update(id, alumniId, collegeId, {
      title: body.title as string,
      company: body.company as string,
      location: body.location as string,
      jobType: body.job_type as string,
      description: body.description as string,
      skillsRequired: body.skills_required as string,
      salary: body.salary as string,
      applyLink: body.apply_link as string,
      deadline: body.deadline ? new Date(body.deadline as string) : undefined,
      status: body.status as string,
      openingsCount: body.openings_count ? parseInt(String(body.openings_count), 10) : undefined,
    });
    if (result.count === 0) throw Object.assign(new Error('Opportunity not found or you do not have permission'), { status: 404 });
    return opportunityRepository.findById(id, collegeId);
  },

  async deleteOpportunity(id: number, alumniId: number, collegeId: string) {
    const result = await opportunityRepository.delete(id, alumniId, collegeId);
    if (result.count === 0) throw Object.assign(new Error('Opportunity not found or you do not have permission'), { status: 404 });
  },
};
