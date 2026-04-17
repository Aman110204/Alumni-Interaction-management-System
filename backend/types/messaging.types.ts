export interface Conversation {
  id: number;
  collegeId?: string | null;
  isCrossCollege: boolean;
  isIntroOnly: boolean;
  user1Id?: number | null;
  user1Type?: string | null;
  user2Id?: number | null;
  user2Type?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderType: string;
  message: string;
  collegeId?: string | null;
  isCrossCollege: boolean;
  isRead: boolean;
  createdAt: Date;
}

export interface ConversationParticipant {
  id: number;
  conversationId: number;
  participantId: number;
  participantType: string;
  lastReadAt?: Date | null;
}

export interface SendMessageInput {
  message: string;
  other_id?: number;
  conversation_id?: number;
  allow_cross_college?: boolean;
}

export interface CreateConversationInput {
  other_id: number;
  other_type?: string;
  allow_cross_college?: boolean;
}
