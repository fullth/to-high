"use client";

import { ChatMessageContent } from "./chat-message-content";

type Role = "user" | "assistant";

interface ChatBubbleProps {
  role: Role;
  content: string;
  variant?: "ai" | "ai glow";
  animate?: boolean;
  children?: React.ReactNode;
}

export function ChatBubble({
  role,
  content,
  variant,
  animate = true,
  children,
}: ChatBubbleProps) {
  const isUser = role === "user";
  const cls = isUser ? "user" : variant || "ai";

  return (
    <div
      className={`ch-row ${isUser ? "user" : ""}${animate ? "" : " no-anim"}`}
    >
      <div className={`ch-bubble ${cls}`}>
        {isUser ? content : <ChatMessageContent content={content} />}
        {children}
      </div>
    </div>
  );
}
