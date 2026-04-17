import { Request } from 'express';
import { JwtPayload } from '../utils/jwt';

export type UserRole = 'student' | 'alumni' | 'admin';

export interface TenantContext {
  college_id: string | null;
  source: string | null;
  hostname_tenant: string | null;
  token_tenant: string | null;
  is_localhost: boolean;
}

export interface AuthenticatedUser extends JwtPayload {
  id: number;
  role: UserRole;
  email: string;
  college_id?: string;
  full_name?: string;
}

export interface AppRequest extends Request {
  user: AuthenticatedUser;
  college_id: string;
  tenant: TenantContext;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SearchParams extends PaginationParams {
  search?: string;
  sort?: string;
  sort_by?: string;
}
