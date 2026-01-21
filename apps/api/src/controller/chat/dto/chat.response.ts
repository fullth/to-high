import { ResponseModeOption } from '../../../types/chat';
import { CounselorType } from '../../../types/session';

export interface StartSessionResponse {
  sessionId: string;
  question: string;
  options: string[];
  canProceedToResponse: boolean;
  canRequestFeedback?: boolean;
  counselorType?: CounselorType;
  // 대화 기억 관련
  contextCount?: number;
  hasHistory?: boolean; // 이전 상담 기록 있음
  previousSessionSummary?: string; // 이전 상담 요약 (재방문자용)
}

export interface SelectOptionResponse {
  sessionId: string;
  question?: string;
  options?: string[];
  canProceedToResponse?: boolean;
  canRequestFeedback?: boolean;
  responseModes?: ResponseModeOption[];
  contextCount?: number; // 현재까지 대화 수
}

export interface ChatResponse {
  response: string;
}

export interface EndSessionResponse {
  summary?: string;
}
