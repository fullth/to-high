const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "요청에 실패했습니다" }));
    // 세션 제한 초과 에러는 특별히 처리
    if (error.code === 'SESSION_LIMIT_EXCEEDED') {
      const limitError = new Error(error.message) as Error & { code: string; sessionCount: number; limit: number };
      limitError.code = error.code;
      limitError.sessionCount = error.sessionCount;
      limitError.limit = error.limit;
      throw limitError;
    }
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// 상담 모드: T(논리적), F(공감적), reaction(짧은 리액션), listening(경청)
export type CounselorType = "T" | "F" | "reaction" | "listening";

// 세션 시작
export interface StartSessionResponse {
  sessionId: string;
  question: string;
  options: string[];
  canProceedToResponse: boolean;
  canRequestFeedback?: boolean;
  counselorType?: CounselorType;
  // 대화 기억 관련
  contextCount?: number;
  hasHistory?: boolean;
  previousSessionSummary?: string;
}

export function startSession(category: string, token?: string, counselorType?: CounselorType) {
  return fetchApi<StartSessionResponse>("/chat/start", {
    method: "POST",
    body: JSON.stringify({ category, counselorType }),
    token,
  });
}

// 직접 입력으로 세션 시작
export function startSessionWithText(
  initialText: string,
  category?: string,
  token?: string,
  counselorType?: CounselorType
) {
  return fetchApi<StartSessionResponse>("/chat/start", {
    method: "POST",
    body: JSON.stringify({ initialText, category, counselorType }),
    token,
  });
}

// 텍스트 요약 (세션 생성 전 미리보기용)
export interface SummarizeTextResponse {
  summary: string;
}

export function summarizeText(text: string, token?: string) {
  return fetchApi<SummarizeTextResponse>("/chat/summarize", {
    method: "POST",
    body: JSON.stringify({ text }),
    token,
  });
}

// 불러오기 요약으로 세션 시작 (사용자가 확인/수정한 요약 사용)
export function startSessionWithImportSummary(
  importSummary: string,
  category?: string,
  token?: string,
  counselorType?: CounselorType
) {
  return fetchApi<StartSessionResponse>("/chat/start", {
    method: "POST",
    body: JSON.stringify({ importSummary, category, counselorType }),
    token,
  });
}

// 선택지 선택
export interface SelectOptionResponse {
  sessionId: string;
  question?: string;
  options?: string[];
  canProceedToResponse?: boolean;
  canRequestFeedback?: boolean;
  responseModes?: ResponseModeOption[];
  isCrisis?: boolean;
  crisisLevel?: string;
  crisisMessage?: string;
  contextSummary?: string;
  empathyComment?: string;
  counselorFeedback?: string;  // 상담가 피드백 (경청모드 제외)
  contextCount?: number;
}

interface ResponseModeOption {
  mode: "comfort" | "organize" | "validate" | "direction" | "listen" | "similar";
  label: string;
  description: string;
  emoji: string;
}

export function selectOption(sessionId: string, selectedOption: string, token?: string) {
  return fetchApi<SelectOptionResponse>("/chat/select", {
    method: "POST",
    body: JSON.stringify({ sessionId, selectedOption }),
    token,
  });
}

// 채팅 응답
export interface ChatResponse {
  response: string;
}

// 응답 모드 설정
export function setResponseMode(sessionId: string, mode: string, token?: string) {
  return fetchApi<ChatResponse>("/chat/mode", {
    method: "POST",
    body: JSON.stringify({ sessionId, mode }),
    token,
  });
}

// 메시지 전송 (AI 응답 받기)
export function sendMessage(sessionId: string, message?: string, token?: string) {
  return fetchApi<ChatResponse>("/chat/message", {
    method: "POST",
    body: JSON.stringify({ sessionId, message }),
    token,
  });
}

// 세션 종료
export interface EndSessionResponse {
  summary?: string;
}

export function endSession(sessionId: string, token?: string) {
  return fetchApi<EndSessionResponse>("/chat/end", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
    token,
  });
}

// 사용자 정보 조회
export interface User {
  userId: string;
  email: string;
  name?: string;
}

export function getMe(token: string) {
  return fetchApi<User>("/auth/me", { token });
}

// Google OAuth URL
export function getGoogleAuthUrl() {
  return `${API_BASE_URL}/auth/google`;
}

// 스트리밍 방식 응답 모드 설정
export async function setResponseModeStream(
  sessionId: string,
  mode: string,
  token?: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/chat/mode/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ sessionId, mode }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";

  if (!reader) {
    throw new Error("Response body is not readable");
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.content) {
            fullContent += data.content;
            onChunk?.(data.content);
          }
          if (data.done) {
            return fullContent;
          }
          if (data.error) {
            throw new Error(data.error);
          }
        } catch {
          // JSON parse error, skip
        }
      }
    }
  }

  return fullContent;
}

// 스트리밍 방식 메시지 전송
export async function sendMessageStream(
  sessionId: string,
  message: string,
  token?: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/chat/message/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ sessionId, message }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";

  if (!reader) {
    throw new Error("Response body is not readable");
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.content) {
            fullContent += data.content;
            onChunk?.(data.content);
          }
          if (data.done) {
            return fullContent;
          }
          if (data.error) {
            throw new Error(data.error);
          }
        } catch {
          // JSON parse error, skip
        }
      }
    }
  }

  return fullContent;
}

// ============ 세션 이력 관련 API ============

// 세션 목록 항목
export interface SessionListItem {
  sessionId: string;
  category: string;
  status: "active" | "completed";
  summary?: string;
  turnCount: number;
  counselorType?: string;
  createdAt: string;
  updatedAt: string;
  alias?: string;
}

// 세션 목록 조회
export function getSessions(token: string) {
  return fetchApi<{ sessions: SessionListItem[] }>("/chat/sessions", { token });
}

// 세션 상세 조회
export interface SessionDetail {
  sessionId: string;
  category: string;
  status: "active" | "completed";
  context: string[];
  fullContext: string[];
  rollingSummary?: string;
  summary?: string;
  counselorType?: string;
  responseMode?: string;
  turnCount: number;
  createdAt: string;
  updatedAt: string;
}

export function getSessionDetail(sessionId: string, token: string) {
  return fetchApi<SessionDetail>(`/chat/sessions/${sessionId}`, { token });
}

// 세션 재개
export interface ResumeSessionResponse {
  sessionId: string;
  question: string;
  options: string[];
  canProceedToResponse: boolean;
  canRequestFeedback?: boolean;
  previousContext: string[];
  rollingSummary?: string;
  counselorType?: string;
  summary?: string;
  category?: string;
  turnCount?: number;
}

export function resumeSession(sessionId: string, token: string) {
  return fetchApi<ResumeSessionResponse>(`/chat/sessions/${sessionId}/resume`, {
    method: "POST",
    token,
  });
}

// ============ 세션 저장 관련 API ============

// 저장된 세션 항목
export interface SavedSessionItem {
  sessionId: string;
  category: string;
  savedName?: string;
  summary?: string;
  turnCount: number;
  counselorType?: string;
  savedAt: string;
  createdAt: string;
}

// 세션 저장
export interface SaveSessionResponse {
  sessionId: string;
  isSaved: boolean;
  savedName?: string;
  savedAt: string;
}

export function saveSession(sessionId: string, token: string, savedName?: string) {
  return fetchApi<SaveSessionResponse>(`/chat/sessions/${sessionId}/save`, {
    method: "POST",
    body: JSON.stringify({ savedName }),
    token,
  });
}

// 저장된 세션 목록 조회
export function getSavedSessions(token: string) {
  return fetchApi<{ sessions: SavedSessionItem[] }>("/chat/sessions/saved", { token });
}

// 세션 삭제
export function deleteSession(sessionId: string, token: string) {
  return fetchApi<{ success: boolean }>(`/chat/sessions/${sessionId}`, {
    method: "DELETE",
    token,
  });
}

// 세션 별칭 수정
export function updateSessionAlias(sessionId: string, alias: string, token: string) {
  return fetchApi<{ sessionId: string; alias: string }>(`/chat/sessions/${sessionId}/alias`, {
    method: "PATCH",
    body: JSON.stringify({ alias }),
    token,
  });
}

// ============ Admin API ============

// 대시보드 통계
export interface DashboardStats {
  totalUsers: number;
  totalSessions: number;
  activeSessions: number;
  todayUsers: number;
  todaySessions: number;
  subscribers: number;
  totalVisitors: number;
  todayVisitors: number;
}

export function getAdminDashboard(token: string) {
  return fetchApi<DashboardStats>("/admin/dashboard", { token });
}

// 사용자 목록
export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  createdAt: string;
  isSubscribed: boolean;
  isGrandfathered: boolean;
  sessionCount: number;
  lastSessionAt?: string;
  lastCategory?: string;
}

export function getAdminUsers(token: string) {
  return fetchApi<{ users: AdminUser[] }>("/admin/users", { token });
}

// Admin 세션 관련 API
export interface AdminSession {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  category: string;
  status: "active" | "completed";
  summary?: string;
  turnCount: number;
  counselorType?: string;
  isSaved: boolean;
  savedName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSessionDetail extends AdminSession {
  rollingSummary?: string;
  responseMode?: string;
  alias?: string;
  context: string[];
  fullContext: string[];
}

export interface AdminSessionsResponse {
  sessions: AdminSession[];
  total: number;
  hasMore: boolean;
}

export function getAdminSessions(
  token: string,
  options?: { anonymous?: boolean; limit?: number; offset?: number }
) {
  const params = new URLSearchParams();
  if (options?.anonymous !== undefined) {
    params.set("anonymous", options.anonymous.toString());
  }
  if (options?.limit !== undefined) {
    params.set("limit", options.limit.toString());
  }
  if (options?.offset !== undefined) {
    params.set("offset", options.offset.toString());
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchApi<AdminSessionsResponse>(`/admin/sessions${query}`, { token });
}

export function getAdminSessionDetail(sessionId: string, token: string) {
  return fetchApi<AdminSessionDetail>(`/admin/sessions/${sessionId}`, { token });
}

export function deleteAdminSession(sessionId: string, token: string) {
  return fetchApi<{ success: boolean; sessionId: string }>(`/admin/sessions/${sessionId}`, {
    method: "DELETE",
    token,
  });
}

export function deleteAdminSessions(sessionIds: string[], token: string) {
  return fetchApi<{ success: boolean; deletedCount: number }>("/admin/sessions/delete-batch", {
    method: "POST",
    body: JSON.stringify({ sessionIds }),
    token,
  });
}

// 방문자 추적 (인증 불필요)
export function trackVisitor(visitorId: string) {
  return fetchApi<{ visitorId: string; visitCount: number; isNew: boolean }>("/health/track", {
    method: "POST",
    body: JSON.stringify({ visitorId }),
  });
}

// 공개 통계 (인증 불필요)
export interface PublicStats {
  totalConversations: number;
  todayConversations: number;
}

export function getPublicStats() {
  return fetchApi<PublicStats>("/health/stats", {
    method: "GET",
  });
}

// 방문자 목록 조회 (Admin)
export interface AdminVisitor {
  id: string;
  visitorId: string;
  ip?: string;
  userAgent?: string;
  visitCount: number;
  firstVisitAt: string;
  lastVisitAt: string;
}

export function getAdminVisitors(token: string, options?: { limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) {
    params.set("limit", options.limit.toString());
  }
  if (options?.offset !== undefined) {
    params.set("offset", options.offset.toString());
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchApi<{ visitors: AdminVisitor[]; total: number }>(`/admin/visitors${query}`, { token });
}

// ============ Payment API ============

export type SubscriptionTier = "basic" | "premium";

export interface SubscriptionPlan {
  tier: string;
  name: string;
  price: number;
  sessionLimit: number;
  description: string;
}

export interface SubscriptionInfo {
  isSubscribed: boolean;
  tier: string | null;
  plan: SubscriptionPlan | null;
  startDate: string | null;
  endDate: string | null;
  isGrandfathered: boolean;
}

export interface PaymentHistory {
  orderId: string;
  amount: number;
  tier: string;
  status: string;
  method: string;
  cardCompany: string;
  cardNumber: string;
  receiptUrl: string;
  createdAt: string;
}

// 요금제 목록 조회
export function getPlans() {
  return fetchApi<{ plans: SubscriptionPlan[] }>("/payment/plans");
}

// 주문 생성
export function createOrder(tier: SubscriptionTier, token: string) {
  return fetchApi<{ orderId: string; tier: string }>("/payment/order", {
    method: "POST",
    body: JSON.stringify({ tier }),
    token,
  });
}

// 결제 승인
export function confirmPayment(
  paymentKey: string,
  orderId: string,
  amount: number,
  tier: SubscriptionTier,
  token: string
) {
  return fetchApi<{ success: boolean; payment: unknown }>("/payment/confirm", {
    method: "POST",
    body: JSON.stringify({ paymentKey, orderId, amount, tier }),
    token,
  });
}

// 구독 정보 조회
export function getSubscription(token: string) {
  return fetchApi<SubscriptionInfo>("/payment/subscription", { token });
}

// 구독 취소
export function cancelSubscription(token: string) {
  return fetchApi<{ success: boolean; message: string }>("/payment/cancel-subscription", {
    method: "POST",
    token,
  });
}

// 결제 환불
export function refundPayment(paymentKey: string, cancelReason: string, token: string) {
  return fetchApi<{ success: boolean; message: string }>("/payment/refund", {
    method: "POST",
    body: JSON.stringify({ paymentKey, cancelReason }),
    token,
  });
}

// 결제 내역 조회
export function getPaymentHistory(token: string) {
  return fetchApi<{ payments: PaymentHistory[] }>("/payment/history", { token });
}

// ============ Inquiry API ============

export type InquiryType = "contact" | "feature" | "ad";

export interface InquiryMessage {
  role: "user" | "admin";
  content: string;
  createdAt: string;
}

export interface Inquiry {
  _id: string;
  userId: string;
  type: InquiryType;
  messages: InquiryMessage[];
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
}

// 문의 생성
export function createInquiry(type: InquiryType, message: string, token: string) {
  return fetchApi<{ inquiryId: string; messages: InquiryMessage[] }>("/inquiry", {
    method: "POST",
    body: JSON.stringify({ type, message }),
    token,
  });
}

// 문의에 메시지 추가
export function addInquiryMessage(inquiryId: string, message: string, token: string) {
  return fetchApi<{ messages: InquiryMessage[] }>(`/inquiry/${inquiryId}/message`, {
    method: "POST",
    body: JSON.stringify({ message }),
    token,
  });
}

// 내 문의 목록 조회
export function getInquiries(token: string) {
  return fetchApi<Inquiry[]>("/inquiry", { token });
}

// 문의 상세 조회
export function getInquiry(inquiryId: string, token: string) {
  return fetchApi<Inquiry>(`/inquiry/${inquiryId}`, { token });
}

// ============ Admin Inquiry API ============

// 관리자 - 전체 문의 목록
export function getAdminInquiries(token: string) {
  return fetchApi<Inquiry[]>("/admin/inquiries", { token });
}

// 관리자 - 문의 답변
export function adminReplyInquiry(inquiryId: string, message: string, token: string) {
  return fetchApi<{ messages: InquiryMessage[] }>(`/admin/inquiries/${inquiryId}/reply`, {
    method: "POST",
    body: JSON.stringify({ message }),
    token,
  });
}

// 관리자 - 문의 종료
export function adminCloseInquiry(inquiryId: string, token: string) {
  return fetchApi<{ status: string }>(`/admin/inquiries/${inquiryId}/close`, {
    method: "PATCH",
    token,
  });
}
