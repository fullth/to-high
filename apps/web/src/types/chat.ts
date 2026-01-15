export type ChatPhase = "selecting" | "mode" | "chatting" | "ended";

export interface ResponseModeOption {
  mode: string;
  label: string;
  description: string;
}

export interface ChatState {
  phase: ChatPhase;
  sessionId: string;
  question?: string;
  options?: string[];
  responseModes?: ResponseModeOption[];
  messages: ChatMessage[];
  summary?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
