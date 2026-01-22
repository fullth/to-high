import { Types } from 'mongoose';

export type ResponseMode =
  | 'comfort'
  | 'organize'
  | 'validate'
  | 'direction'
  | 'listen'
  | 'similar';

// 상담 모드: T(논리적), F(공감적), reaction(짧은 리액션), listening(경청)
export type CounselorType = 'T' | 'F' | 'reaction' | 'listening';

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
