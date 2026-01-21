import { Types } from 'mongoose';

export type ResponseMode =
  | 'comfort'
  | 'organize'
  | 'validate'
  | 'direction'
  | 'listen'
  | 'similar';

export type CounselorType = 'T' | 'F' | 'deep';

export type Category = 'self' | 'future' | 'work' | 'relationship' | 'love' | 'daily' | 'other' | 'direct';
export type SessionStatus = 'active' | 'completed';

export interface Session {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  context: string[];
  status: SessionStatus;
  summary?: string;
  category: Category;
  counselorType?: CounselorType;
  responseMode?: ResponseMode;
  createdAt: Date;
  updatedAt: Date;
}
