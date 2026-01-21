export type ChatPhase = "selecting" | "mode" | "chatting" | "ended";

export type ResponseMode =
  | "comfort"
  | "organize"
  | "validate"
  | "direction"
  | "listen"
  | "similar";

export type CounselorType = "T" | "F" | "deep";

export type Category = "self" | "future" | "work" | "relationship";

export interface ResponseModeOption {
  mode: ResponseMode;
  label: string;
  description: string;
  emoji: string;
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
