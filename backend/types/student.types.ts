export interface Student {
  id: number;
  collegeId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  department?: string | null;
  year?: number | null;
  rollNumber?: string | null;
  phone?: string | null;
  bio?: string | null;
  headline?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  resumeUrl?: string | null;
  profilePhoto?: string | null;
  skills?: string | null;
  profileLinks: unknown[];
  isActive: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterStudentInput {
  college_id?: string;
  fullName: string;
  usn?: string;
  email: string;
  password: string;
  department?: string;
  year?: string | number;
  phone?: string;
}

export interface LoginStudentInput {
  email: string;
  password: string;
  college_id?: string;
}

export interface UpdateStudentProfileInput {
  full_name?: string;
  phone?: string;
  bio?: string;
  skills?: string;
  headline?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  resume_url?: string;
  profile_photo?: string;
}
