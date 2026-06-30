"use client";

import "@/components/chat/chat.css";
import { useAuth } from "@/contexts/auth-context";
import { getSessions, SessionListItem } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/category-labels";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export default function SessionsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, login } = useAuth();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setLoading(false);
      return;
    }
    getSessions(token)
      .then((res) => setSessions(res.sessions))
      .catch((err) => setError(err instanceof Error ? err.message : "이력을 불러올 수 없어요"))
      .finally(() => setLoading(false));
  }, [token, authLoading]);

  if (authLoading || loading) {
    return (
      <main className="ch-frame" style={{ minHeight: "100vh" }}>
        <div className="ch-inner">
          <header className="ch-header thin">
            <Link className="ch-logo" href="/">
              <span className="ch-logo-mark" aria-hidden="true" />
              위로
            </Link>
          </header>
          <div className="ch-center">
            <div className="ch-center-stack">
              <p className="ch-sub">불러오는 중이에요...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="ch-frame" style={{ minHeight: "100vh" }}>
        <div className="ch-inner">
          <header className="ch-header thin">
            <Link className="ch-logo" href="/">
              <span className="ch-logo-mark" aria-hidden="true" />
              위로
            </Link>
          </header>
          <div className="ch-center">
            <div className="ch-center-stack">
              <h2 className="ch-h">이전 이야기 보기</h2>
              <p className="ch-sub">
                로그인하면 이전에 나눈 이야기들을 다시 꺼내볼 수 있어요.
              </p>
              <div className="ch-end-actions">
                <button type="button" className="ch-primary" onClick={() => login()}>
                  로그인하기
                </button>
                <button type="button" className="ch-secondary" onClick={() => router.push("/")}>
                  돌아가기
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ch-frame" style={{ minHeight: "100vh" }}>
      <div className="ch-inner">
        <header className="ch-header thin">
          <Link className="ch-logo" href="/">
            <span className="ch-logo-mark" aria-hidden="true" />
            위로
          </Link>
          <button
            type="button"
            className="ch-ghostbtn"
            onClick={() => router.push("/")}
          >
            홈으로
          </button>
        </header>

        <div style={{ padding: "32px 24px", flex: 1, overflowY: "auto" }}>
          <h2 className="ch-h" style={{ marginBottom: 8 }}>
            적어둔 이야기를 이어가볼까요?
          </h2>

          {error && (
            <p style={{ color: "#ef4444", fontSize: 14, marginBottom: 16 }}>{error}</p>
          )}

          {sessions.length === 0 ? (
            <div className="ch-summary compact">
              <p>아직 나눈 이야기가 없어요. 첫 이야기를 시작해 보세요.</p>
            </div>
          ) : (
            <ul className="sessions-list">
              {sessions.map((s) => {
                const title = s.alias ?? s.summary ?? "이름이 지어지지 않은 공책";
                const showPreview = s.preview && s.preview !== title;
                return (
                  <li key={s.sessionId}>
                    <Link href={`/chat/${s.sessionId}`} className="session-card">
                      <div className="session-card-top">
                        <span className="session-card-cat">
                          {CATEGORY_LABELS[s.category] ?? s.category}
                        </span>
                        <span className="session-card-date">{formatDate(s.updatedAt)}</span>
                      </div>
                      <div className="session-card-title">{title}</div>
                      {showPreview && (
                        <div className="session-card-meta">{s.preview}</div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
