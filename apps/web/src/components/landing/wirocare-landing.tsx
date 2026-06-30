"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { startSession } from "@/lib/api";
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
            <a className="logo" href="/">
              <span className="logo-mark" aria-hidden="true" />
              <span>
                위로 <span className="logo-sub">To High</span>
              </span>
            </a>
          </div>
          <nav className="nav-actions">
            {token && (
              <a className="btn btn-ghost btn-sm" href="/sessions">
                이전 이야기
              </a>
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
                  언제나 기다리고 있어요
                </span>
                <h1>
                  지치셨다면,
                  <br />
                  <span className="accent">잘 오셨어요</span>
                </h1>
                <p className="lede">
                  말할 힘도 없을 때는, 그저 클릭만 하시면 되도록 도와드릴게요
                </p>
                <div className="hero-cta">
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={handlePrimaryStart}
                    disabled={!!starting}
                  >
                    {starting
                      ? "마음을 적어나갈 공책을 생성하는 중이에요..."
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
                진료가 아니라, 옆자리에 앉아 듣는 마음으로요. 부담 없이
                시작하고, 안심하고 마무리해요.
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
                <p>
                  이름 없이도 시작할 수 있어요. 위기 순간엔 자살예방상담전화
                  1393으로 바로 안내해드려요.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section modes-section">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">어떤 대화 방식을 선호하세요??</span>
              <h2 className="section-title">최대한 맞춰 드리고 싶어요</h2>
              <p className="section-sub">
                일상 이야기를 어떻게 받을지, 모드만 바꾸면 응답이 달라져요.
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
              탭하시면 그 결에 맞춰 일상 이야기부터 시작해드려요.
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
              먼저 와주신 마음, 일상부터 천천히 들을게요. 가입은 나중에 하셔도
              돼요.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handlePrimaryStart}
              disabled={!!starting}
            >
              {starting
                ? "곁에 자리 만드는 중..."
                : "당신의 이야기를 들려주세요"}{" "}
              <ArrowIcon size={18} />
            </button>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <div className="foot-top">
            <a className="logo" href="/">
              <span className="logo-mark" />
              <span>위로</span>
            </a>
            <div className="foot-links">
              <a href="/privacy">개인정보처리방침</a>
              <a href="/privacy">이용약관</a>
              <a href="#contact">문의</a>
            </div>
          </div>
          <div className="crisis">
            <span className="crisis-mark" />
            <span>
              위기 상황이라면 즉시 전문 상담을 받으세요.{" "}
              <b>자살예방상담전화 1393</b> · 24시간 무료
            </span>
          </div>
          <div style={{ marginTop: 24, fontSize: 12, color: "var(--ink-4)" }}>
            © 2026 위로 (To High). 위로는 의료기기가 아니며, 정신건강
            진단·치료를 대체하지 않습니다.
          </div>
        </div>
      </footer>
    </div>
  );
}
