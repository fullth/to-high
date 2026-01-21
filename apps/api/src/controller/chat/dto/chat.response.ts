import { ResponseModeOption } from '../../../types/chat';
import { CounselorType } from '../../../types/session';

export interface StartSessionResponse {
  sessionId: string;
  question: string;
  options: string[];
  canProceedToResponse: boolean;
  counselorType?: CounselorType;
}

export interface SelectOptionResponse {
  sessionId: string;
  question?: string;
  options?: string[];
  canProceedToResponse?: boolean;
  responseModes?: ResponseModeOption[];
}

export interface ChatResponse {
  response: string;
}

export interface EndSessionResponse {
  summary?: string;
}
