import { ResponseModeOption } from '../../../types/chat';

export interface StartSessionResponse {
  sessionId: string;
  question: string;
  options: string[];
  canProceedToResponse: boolean;
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
