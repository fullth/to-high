"use client";

import { getSessions, SessionListItem } from "@/lib/api";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const CATEGORY_LABEL: Record<string, string> = {
  daily: "일상",
  love: "연애",
  work: "일",
};

interface ChatSidebarProps {
  token: string;
  userName?: string;
  userEmail?: string;
  membership?: "free" | "pro";
  activeSessionId?: string;
  onLogout?: () => void;
  onClose?: () => void;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  const day = Math.floor(diffMs / 86400000);
  if (day === 1) return "어제";
  if (day < 7) return `${day}일 전`;
  if (day < 30) return "지난주";
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

function groupSessions(sessions: SessionListItem[]) {
  const today: SessionListItem[] = [];
  const week: SessionListItem[] = [];
  const before: SessionListItem[] = [];
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenAgo = startOfDay - 6 * 86400000;

  for (const s of sessions) {
    const t = new Date(s.updatedAt).getTime();
    if (t >= startOfDay) today.push(s);
    else if (t >= sevenAgo) week.push(s);
    else before.push(s);
  }
  return { today, week, before };
}

export function ChatSidebar({
  token,
  userName,
  userEmail,
  membership = "free",
  activeSessionId,
  onLogout,
  onClose,
}: ChatSidebarProps) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    getSessions(token)
      .then((res) => setSessions(res.sessions))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [token, activeSessionId]);

  useEffect(() => {
    if (!popoverOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [popoverOpen]);

  const groups = groupSessions(sessions);
  const display = userName || (userEmail ? userEmail.split("@")[0] : "위로 사용자");
  const initial = display.charAt(0).toUpperCase();

  return (
    <aside className="ch-sidebar">
      <div className="ch-sb-top">
        <Link className="ch-logo" href="/">
          <span className="ch-logo-mark" aria-hidden="true" />
          위로 <span className="ch-logo-sub">To High</span>
        </Link>
        {onClose && (
          <button type="button" className="ch-sb-close" onClick={onClose} aria-label="닫기">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <Link href="/" className="ch-sb-newchat">
        <span aria-hidden="true">+</span>
        새 이야기 시작
      </Link>

      <div className="ch-sb-list">
        {loading ? (
          <div className="ch-sb-empty muted">불러오는 중이에요...</div>
        ) : sessions.length === 0 ? (
          <div className="ch-sb-empty">
            <span className="ch-sb-empty-mark" aria-hidden="true" />
            <p>아직 시작된 이야기가 없어요</p>
            <span className="ch-sb-empty-sub">처음 한 마디부터 함께해요.</span>
          </div>
        ) : (
          <>
            {groups.today.length > 0 && <SessionGroup label="오늘" items={groups.today} activeId={activeSessionId} />}
            {groups.week.length > 0 && <SessionGroup label="이번 주" items={groups.week} activeId={activeSessionId} />}
            {groups.before.length > 0 && <SessionGroup label="지난주" items={groups.before} activeId={activeSessionId} />}
          </>
        )}
      </div>

      <div className="ch-sb-user" ref={popoverRef}>
        <button
          type="button"
          className="ch-sb-userbtn"
          onClick={() => setPopoverOpen((v) => !v)}
          aria-expanded={popoverOpen}
        >
          <span className="ch-sb-avatar" aria-hidden="true">{initial}</span>
          <span className="ch-sb-userinfo">
            <span className="ch-sb-username">{display} 님</span>
            <span className="ch-sb-membership">
              <span className={`ch-sb-dot ${membership}`} aria-hidden="true" />
              {membership === "pro" ? "Pro" : "Free"} · 오늘 1/3
            </span>
          </span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {popoverOpen && (
          <div className="ch-popover" role="menu">
            <div className="ch-pop-head">
              <span className="ch-sb-avatar" aria-hidden="true">{initial}</span>
              <span className="ch-pop-headinfo">
                <span className="ch-pop-name">{display} 님</span>
                {userEmail && <span className="ch-pop-email">{userEmail}</span>}
              </span>
            </div>
            <Link href="/me" className="ch-pop-item" role="menuitem" onClick={() => setPopoverOpen(false)}>
              내 정보
            </Link>
            <Link href="/membership" className="ch-pop-item" role="menuitem" onClick={() => setPopoverOpen(false)}>
              멤버십 관리
              {membership === "free" && <span className="ch-pop-badge">UPGRADE</span>}
              {membership === "pro" && <span className="ch-pop-badge pro">PRO</span>}
            </Link>
            <Link href="/settings" className="ch-pop-item" role="menuitem" onClick={() => setPopoverOpen(false)}>
              설정
            </Link>
            <div className="ch-pop-divider" />
            <button
              type="button"
              className="ch-pop-item danger"
              onClick={() => {
                setPopoverOpen(false);
                onLogout?.();
              }}
              role="menuitem"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function SessionGroup({
  label,
  items,
  activeId,
}: {
  label: string;
  items: SessionListItem[];
  activeId?: string;
}) {
  return (
    <div className="ch-sb-group">
      <div className="ch-sb-grouplabel">{label}</div>
      {items.map((s) => {
        const active = s.sessionId === activeId;
        return (
          <Link
            key={s.sessionId}
            href={`/chat/${s.sessionId}`}
            className={`ch-sb-card ${active ? "active" : ""}`}
          >
            <div className="ch-sb-card-summary">
              {s.summary || s.alias || "마음을 나눈 대화"}
            </div>
            <div className="ch-sb-card-meta">
              <span>{formatRelative(s.updatedAt)}</span>
              <span className="ch-sb-tag">{CATEGORY_LABEL[s.category] || s.category}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
