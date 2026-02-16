"use client";

import { type ReactNode } from "react";

interface TopicButtonProps {
  icon: ReactNode;
  label: string;
  description: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}

export function TopicButton({
  icon,
  label,
  description,
  color,
  onClick,
  disabled = false,
}: TopicButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative flex items-center gap-3 p-3 sm:p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-sm transition-all duration-300 hover:shadow-lg active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none overflow-hidden text-left w-full"
    >
      {/* 왼쪽 액센트 바 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all duration-300 group-hover:w-1.5"
        style={{ backgroundColor: color }}
      />

      {/* 아이콘 */}
      <div
        className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 transition-all duration-300 group-hover:scale-110"
        style={{
          backgroundColor: '#0a0a0a',
          boxShadow: `0 0 0 1px ${color}40, 0 0 12px ${color}20`,
        }}
      >
        {icon}
      </div>

      {/* 텍스트 */}
      <div className="min-w-0">
        <span className="block text-sm font-bold text-foreground group-hover:text-white transition-colors">
          {label}
        </span>
        <span className="block text-xs text-muted-foreground transition-colors">
          {description}
        </span>
      </div>

      {/* hover 시 배경 글로우 */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 rounded-2xl"
        style={{
          background: `radial-gradient(ellipse at left center, ${color}12 0%, transparent 70%)`,
        }}
      />
    </button>
  );
}
