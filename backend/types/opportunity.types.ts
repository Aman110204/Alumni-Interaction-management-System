export interface Opportunity {
  id: number;
  collegeId: string;
  alumniId?: number | null;
  title: string;
  company?: string | null;
  description?: string | null;
  jobType?: string | null;
  location?: string | null;
  skillsRequired?: string | null;
  salary?: string | null;
  applyLink?: string | null;
  deadline?: Date | null;
  status: string;
  openingsCount: number;
  isGlobal: boolean;
  targetColleges: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOpportunityInput {
  title: string;
  company?: string;
  location?: string;
  job_type?: string;
  description?: string;
  skills_required?: string;
  salary?: string;
  apply_link?: string;
  deadline?: string;
  openings_count?: number;
}

export interface UpdateOpportunityInput extends Partial<CreateOpportunityInput> {
  status?: string;
}
