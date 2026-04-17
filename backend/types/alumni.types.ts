export interface Alumni {
  id: number;
  collegeId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  department?: string | null;
  graduationYear?: number | null;
  company?: string | null;
  designation?: string | null;
  phone?: string | null;
  bio?: string | null;
  headline?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  profilePhoto?: string | null;
  skills?: string | null;
  profileLinks: unknown[];
  availableMentorship: boolean;
  availableReferral: boolean;
  status: string;
  isActive: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterAlumniInput {
  college_id?: string;
  fullName: string;
  email: string;
  password: string;
  company?: string;
  designation?: string;
  location?: string;
  graduationYear?: number;
  department?: string;
  phone?: string;
}

export interface LoginAlumniInput {
  email: string;
  password: string;
  college_id?: string;
}

export interface UpdateAlumniProfileInput {
  full_name?: string;
  company?: string;
  designation?: string;
  location?: string;
  phone?: string;
  bio?: string;
  linkedin_url?: string;
  github_url?: string;
  skills?: string;
  department?: string;
  graduation_year?: number;
  headline?: string;
  available_mentorship?: boolean;
  available_referral?: boolean;
  profile_photo?: string;
}

export interface CareerEntry {
  id: number;
  alumniId: number;
  collegeId: string;
  company: string;
  role: string;
  startDate?: Date | null;
  endDate?: Date | null;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCareerEntryInput {
  alumniId: number;
  collegeId: string;
  company: string;
  role: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  description?: string;
}
