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
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// 세션 시작
export interface StartSessionResponse {
  sessionId: string;
  question: string;
  options: string[];
  canProceedToResponse: boolean;
}

export function startSession(category: string, token?: string) {
  return fetchApi<StartSessionResponse>("/chat/start", {
    method: "POST",
    body: JSON.stringify({ category }),
    token,
  });
}

// 선택지 선택
export interface SelectOptionResponse {
  sessionId: string;
  question?: string;
  options?: string[];
  canProceedToResponse?: boolean;
  responseModes?: { mode: string; label: string; description: string }[];
}

export function selectOption(sessionId: string, selectedOption: string, token?: string) {
  return fetchApi<SelectOptionResponse>("/chat/select", {
    method: "POST",
    body: JSON.stringify({ sessionId, selectedOption }),
    token,
  });
}

// 응답 모드 설정
export function setResponseMode(sessionId: string, mode: string, token?: string) {
  return fetchApi<{ success: boolean }>("/chat/mode", {
    method: "POST",
    body: JSON.stringify({ sessionId, mode }),
    token,
  });
}

// 메시지 전송 (AI 응답 받기)
export interface ChatResponse {
  response: string;
}

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
}

export function getMe(token: string) {
  return fetchApi<User>("/auth/me", { token });
}

// Google OAuth URL
export function getGoogleAuthUrl() {
  return `${API_BASE_URL}/auth/google`;
}
