"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Role = "user" | "assistant";

interface ChatBubbleProps {
  role: Role;
  content: string;
  variant?: "ai" | "ai glow";
  children?: React.ReactNode;
}

export function ChatBubble({ role, content, variant, children }: ChatBubbleProps) {
  const isUser = role === "user";
  const cls = isUser ? "user" : variant || "ai";

  return (
    <div className={`ch-row ${isUser ? "user" : ""}`}>
      <div className={`ch-bubble ${cls}`}>
        {isUser ? (
          content
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="ch-md-p">{children}</p>,
              strong: ({ children }) => <strong className="ch-md-strong">{children}</strong>,
              em: ({ children }) => <em>{children}</em>,
              ul: ({ children }) => <ul className="ch-md-ul">{children}</ul>,
              ol: ({ children }) => <ol className="ch-md-ol">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              code: ({ children }) => <code className="ch-md-code">{children}</code>,
              a: ({ children, href }) => (
                <a href={href} className="ch-md-a" target="_blank" rel="noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
        {children}
      </div>
    </div>
  );
}
