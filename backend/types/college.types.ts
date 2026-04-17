export interface College {
  id: string;
  name: string;
  location?: string | null;
  code?: string | null;
  domain?: string | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCollegeInput {
  id: string;
  name: string;
  location?: string;
  code?: string;
  domain?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCollegeInput {
  name?: string;
  location?: string;
  code?: string;
  domain?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}
