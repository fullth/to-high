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

/**
 * 세션 목록 항목
 */
export interface SessionListItem {
  sessionId: string;
  category: string;
  status: 'active' | 'completed';
  summary?: string;
  turnCount: number;
  counselorType?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 세션 목록 응답
 */
export interface SessionListResponse {
  sessions: SessionListItem[];
}

/**
 * 세션 상세 응답
 */
export interface SessionDetailResponse {
  sessionId: string;
  category: string;
  status: 'active' | 'completed';
  context: string[];  // 최근 대화
  fullContext: string[];  // 전체 대화
  rollingSummary?: string;
  summary?: string;
  counselorType?: string;
  responseMode?: string;
  turnCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 세션 재개 응답
 */
export interface ResumeSessionResponse {
  sessionId: string;
  question: string;
  options: string[];
  canProceedToResponse: boolean;
  canRequestFeedback?: boolean;
  // 이전 대화 정보
  previousContext: string[];
  rollingSummary?: string;
  counselorType?: string;
}
