export type ChatPhase = "selecting" | "mode" | "chatting" | "ended";

export type ResponseMode =
  | "comfort"
  | "organize"
  | "validate"
  | "direction"
  | "listen"
  | "similar";

// CounselorType은 api.ts에서 import하세요
export type { CounselorType } from "@/lib/api";

export type Category = "self" | "future" | "work" | "relationship";

export interface ResponseModeOption {
  mode: ResponseMode;
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

export type TopLevelMode = "mbti" | "reaction" | "listening" | null;

export interface HistoryItem {
  type: "user" | "assistant" | "system";
  content: string;
  isQuestion?: boolean;
  timestamp?: Date;
  isStreaming?: boolean;
}
