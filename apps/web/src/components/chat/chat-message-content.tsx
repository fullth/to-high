"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ChatMessageContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="ch-md-p">{children}</p>,
        // Model-generated emphasis should read like the rest of the conversation.
        strong: ({ children }) => <>{children}</>,
        em: ({ children }) => <>{children}</>,
        ul: ({ children }) => <ul className="ch-md-ul">{children}</ul>,
        ol: ({ children }) => <ol className="ch-md-ol">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        code: ({ children }) => <>{children}</>,
        img: ({ alt }) => <>{alt}</>,
        a: ({ children, href }) => (
          <a href={href} className="ch-md-a" target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
