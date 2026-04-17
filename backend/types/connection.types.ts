export interface ConnectionRequest {
  id: number;
  requesterId: number;
  requesterType: string;
  recipientId: number;
  recipientType: string;
  collegeId?: string | null;
  isCrossCollege: boolean;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string | null;
  respondedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConnectionRequestInput {
  requesterId: number;
  requesterType: string;
  recipientId: number;
  recipientType: string;
  collegeId?: string;
  message?: string;
  allowCrossCollege?: boolean;
}

export interface RespondToConnectionInput {
  status: 'accepted' | 'rejected';
}
