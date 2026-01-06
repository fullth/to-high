import { Types } from 'mongoose';

export type ResponseMode = 'comfort' | 'organize' | 'validate' | 'direction';
export type SessionStatus = 'active' | 'completed';

export interface Session {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  context: string[];
  status: SessionStatus;
  summary?: string;
  category: string;
  responseMode?: ResponseMode;
  createdAt: Date;
  updatedAt: Date;
}
