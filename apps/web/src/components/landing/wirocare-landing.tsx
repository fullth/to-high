"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { startSession } from "@/lib/api";
import { SERVICE_DESCRIPTION } from "@/lib/site-content";
import "./landing.css";

const DAILY_CATEGORY = "daily";

const RESPONSE_MODES = [
  "그냥 위로받고 싶어요",
  "가만히 들어주세요",
  "상황을 정리하고 싶어요",
  "내가 이상한 걸까요",
  "뭘 해야 할지 모르겠어요",
  "나만 이런 걸까요",
];

const ArrowIcon = ({
  size = 16,
  className = "arrow",
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      d="M3 8h10M9 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface WirocareLandingProps {
  publicStatsToday?: number;
  onLoginClick?: () => void;
}

export function WirocareLanding({
  publicStatsToday,
  onLoginClick,
}: WirocareLandingProps) {
  const router = useRouter();
  const { token } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePrimaryStart = async () => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const res = await startSession(DAILY_CATEGORY, token || undefined);
      const params = new URLSearchParams({
        question: res.question,
        options: JSON.stringify(res.options),
      });
      router.push(`/chat/${res.sessionId}?${params.toString()}`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "지금은 시작할 수 없어요. 잠시 후 다시 시도해 주세요.";
      setError(message);
      setStarting(false);
    }
  };
  const hasTrustCount =
    typeof publicStatsToday === "number" && publicStatsToday > 0;

  return (
    <div className="wirocare-landing">
      <header className="nav">
        <div className="container nav-inner">
          <div className="nav-left">
            <Link className="logo" href="/">
              <span className="logo-mark" aria-hidden="true" />
              <span>
                위로 <span className="logo-sub">To High</span>
              </span>
            </Link>
          </div>
          <nav className="nav-actions">
            {token && (
              <Link className="btn btn-ghost btn-sm" href="/sessions">
                이전 이야기
              </Link>
            )}
            {!token && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onLoginClick}
              >
                로그인
              </button>
            )}
            <button
              type="button"
              className="btn btn-soft btn-sm"
              onClick={handlePrimaryStart}
              disabled={!!starting}
            >
              상담하기 <ArrowIcon size={12} />
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-bg" aria-hidden="true">
            <div className="dot-grid" />
            <div className="blob b1" />
            <div className="blob b2" />
            <div className="blob b3" />
            <div className="blob b4" />
          </div>
          <div className="container">
            <div className="hero-grid">
              <div className="fade-in">
                <span className="hero-eyebrow">
                  <span className="pulse" />
                  AI 심리상담: 위로
                </span>
                <h1>
                  항상 여기 있겠습니다.
                  <br />
                  <span className="accent">필요하실 때 찾아주세요.</span>
                </h1>
                <p className="lede">{SERVICE_DESCRIPTION}</p>
                <div className="hero-cta">
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={handlePrimaryStart}
                    disabled={!!starting}
                  >
                    {starting
                      ? "공책을 여는 중..."
                      : "당신의 이야기를 들려주세요"}{" "}
                    <ArrowIcon size={18} />
                  </button>
                </div>
                {error && (
                  <p
                    style={{
                      color: "var(--rose)",
                      marginTop: 12,
                      fontSize: 14,
                    }}
                  >
                    {error}
                  </p>
                )}
                <div className="trust">
                  <span className="trust-mark" aria-hidden="true" />
                  <span className="trust-text">
                    {hasTrustCount ? (
                      <>
                        오늘 <b>{publicStatsToday!.toLocaleString()}명</b>이
                        위로받았어요
                      </>
                    ) : (
                      <>가입 없이도 시작할 수 있어요</>
                    )}
                  </span>
                </div>
              </div>
              <div className="hero-preview" aria-hidden="true">
                <div className="row">
                  <div className="bubble b-ai">
                    오늘 하루는 어떤 마음으로 끝나셨어요?
                  </div>
                </div>
                <div className="row">
                  <div className="bubble b-user">
                    요즘 너무 지쳐서… 그냥 누가 들어줬으면 좋겠어요
                  </div>
                </div>
                <div className="row">
                  <div className="typing">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">위로의 약속</span>
              <h2 className="section-title">이런 날, 곁에 있을게요</h2>
              <p className="section-sub">
                편하게 이야기해 주세요. 천천히 듣겠습니다.
              </p>
            </div>
            <div className="features">
              <div className="feature">
                <div className="ficon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3v6M12 15v6M3 12h6M15 12h6"
                      stroke="var(--brand)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="2.4"
                      fill="var(--brand)"
                      opacity="0.85"
                    />
                  </svg>
                </div>
                <h4>말할 힘도 없는 날</h4>
                <p>
                  한마디 꺼낼 기운이 없어도, 선택지를 따라가다 보면 마음이
                  천천히 풀려요.
                </p>
              </div>
              <div className="feature">
                <div className="ficon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M8 9a4 4 0 018 0c0 2-1 2.5-2 4-.8 1.2-1 2.2-1 3a2 2 0 11-4 0"
                      stroke="var(--brand)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="9.5" r="1.3" fill="var(--brand)" />
                  </svg>
                </div>
                <h4>조언이 부담스러운 날</h4>
                <p>해결책 없이, 조용히 들어드릴게요.</p>
              </div>
              <div className="feature">
                <div className="ficon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"
                      fill="var(--brand-tint)"
                      stroke="var(--brand)"
                      strokeWidth="1.4"
                    />
                    <path
                      d="M9 12l2 2 4-4.2"
                      stroke="var(--brand)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h4>조용히 풀고 싶은 날</h4>
                <p>이름 없이도 시작할 수 있어요.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section modes-section">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">어떤 대화 방식을 선호하세요?</span>
              <h2 className="section-title">최대한 맞춰 드리고 싶어요</h2>
              <p className="section-sub">
                위로가 필요한지, 이야기를 들어주길 바라는지 골라 주세요.
              </p>
            </div>
            <div className="modes">
              {RESPONSE_MODES.map((mode) => (
                <span key={mode} className="mode-chip">
                  <span className="dot" />
                  {mode}
                </span>
              ))}
            </div>
            <p className="modes-hint">
              대화를 시작하면 마음에 맞는 방식을 고를 수 있어요.
            </p>
          </div>
        </section>

        <section className="final">
          <div className="container">
            <h2>
              오늘은 여기서
              <br />
              잠깐 쉬어가세요
            </h2>
            <p>
              오늘 있었던 일부터 편하게 이야기해 주세요. 가입은 나중에 하셔도 돼요.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handlePrimaryStart}
              disabled={!!starting}
            >
              {starting
                ? "공책을 여는 중..."
                : "당신의 이야기를 들려주세요"}{" "}
              <ArrowIcon size={18} />
            </button>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <div className="foot-top">
            <Link className="logo" href="/">
              <span className="logo-mark" />
              <span>위로</span>
            </Link>
            <div className="foot-links">
              <Link href="/privacy">개인정보처리방침</Link>
            </div>
          </div>
          <div style={{ marginTop: 24, fontSize: 12, color: "var(--ink-4)" }}>
            © 2026 위로 (To High). 위로는 의료기기가 아니며, 정신건강 진단이나
            치료를 대신하지 않습니다.
          </div>
        </div>
      </footer>
    </div>
  );
}
