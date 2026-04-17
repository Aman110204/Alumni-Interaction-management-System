export interface Admin {
  id: number;
  collegeId?: string | null;
  fullName: string;
  username?: string | null;
  email: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
}

export interface LoginAdminInput {
  login: string;
  password: string;
  college_id?: string;
}

export interface CreateAdminInput {
  collegeId?: string;
  fullName: string;
  username?: string;
  email: string;
  password: string;
}
