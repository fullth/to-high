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

// 직접 입력으로 세션 시작
export function startSessionWithText(initialText: string, token?: string) {
  return fetchApi<StartSessionResponse>("/chat/start", {
    method: "POST",
    body: JSON.stringify({ initialText }),
    token,
  });
}

// 선택지 선택
export interface SelectOptionResponse {
  sessionId: string;
  question?: string;
  options?: string[];
  canProceedToResponse?: boolean;
  responseModes?: ResponseModeOption[];
  isCrisis?: boolean;
  crisisLevel?: string;
  crisisMessage?: string;
  contextSummary?: string;
  empathyComment?: string;
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
        } catch (e) {
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
        } catch (e) {
          // JSON parse error, skip
        }
      }
    }
  }

  return fullContent;
}
