"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { startSession } from "@/lib/api";
import "./landing.css";

type VerticalId = "daily" | "love" | "work";

interface VerticalConfig {
  id: VerticalId;
  className: string;
  badge: string;
  meta: string;
  title: string;
  subtitle: string;
  tags: string[];
  artGradientId: string;
  artColor: string;
  artShape: "circle" | "ellipse" | "rect";
}

const VERTICALS: VerticalConfig[] = [
  {
    id: "daily",
    className: "main",
    badge: "MAIN",
    meta: "Vertical 01",
    title: "일상",
    subtitle: "일상의 마음 정리",
    tags: ["#나", "#일상", "#관계", "#미래"],
    artGradientId: "m1",
    artColor: "#7C9885",
    artShape: "circle",
  },
  {
    id: "love",
    className: "love",
    badge: "LOVE",
    meta: "Vertical 02",
    title: "사랑",
    subtitle: "사랑이 무거울 때",
    tags: ["#이별", "#짝사랑", "#권태기", "#싸움"],
    artGradientId: "l1",
    artColor: "#C49B9B",
    artShape: "ellipse",
  },
  {
    id: "work",
    className: "work",
    badge: "WORK",
    meta: "Vertical 03",
    title: "커리어",
    subtitle: "직장이 버거울 때",
    tags: ["#이직", "#사수", "#번아웃", "#업무"],
    artGradientId: "w1",
    artColor: "#B4A48B",
    artShape: "rect",
  },
];

const RESPONSE_MODES = [
  "그냥 위로해줘",
  "그냥 들어줘",
  "상황 정리해줘",
  "내가 이상한 건가?",
  "뭘 해야 할지 모르겠어",
  "나만 이런 건가?",
];

const ArrowIcon = ({ size = 16, className = "arrow" }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const VerticalArt = ({ config }: { config: VerticalConfig }) => {
  const { artGradientId, artColor, artShape } = config;
  return (
    <svg className="vart" viewBox="0 0 240 240" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={artGradientId} cx={artShape === "rect" ? "60%" : artShape === "ellipse" ? "40%" : "50%"} cy={artShape === "rect" ? "30%" : artShape === "ellipse" ? "40%" : "50%"} r={artShape === "rect" ? "70%" : artShape === "ellipse" ? "60%" : "50%"}>
          <stop offset="0%" stopColor={artColor} stopOpacity="0.55" />
          <stop offset="100%" stopColor={artColor} stopOpacity="0" />
        </radialGradient>
      </defs>
      {artShape === "circle" && (
        <>
          <circle cx="130" cy="100" r="78" fill={`url(#${artGradientId})`} />
          <circle cx="170" cy="140" r="40" fill={artColor} opacity="0.18" />
          <circle cx="100" cy="60" r="22" fill={artColor} opacity="0.12" />
        </>
      )}
      {artShape === "ellipse" && (
        <>
          <ellipse cx="130" cy="110" rx="86" ry="74" fill={`url(#${artGradientId})`} />
          <ellipse cx="80" cy="160" rx="40" ry="30" fill={artColor} opacity="0.16" />
          <circle cx="180" cy="70" r="18" fill={artColor} opacity="0.20" />
        </>
      )}
      {artShape === "rect" && (
        <>
          <rect x="50" y="40" width="160" height="160" rx="64" fill={`url(#${artGradientId})`} />
          <circle cx="80" cy="170" r="32" fill={artColor} opacity="0.16" />
          <circle cx="180" cy="80" r="14" fill={artColor} opacity="0.20" />
        </>
      )}
    </svg>
  );
};

export interface WirocareLandingProps {
  publicStatsToday?: number;
  onLoginClick?: () => void;
}

export function WirocareLanding({ publicStatsToday, onLoginClick }: WirocareLandingProps) {
  const router = useRouter();
  const { token } = useAuth();
  const [starting, setStarting] = useState<VerticalId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (categoryId: VerticalId) => {
    if (starting) return;
    setStarting(categoryId);
    setError(null);
    try {
      const res = await startSession(categoryId, token || undefined);
      router.push(`/chat/${res.sessionId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "세션을 시작할 수 없어요";
      setError(message);
      setStarting(null);
    }
  };

  const handlePrimaryStart = () => handleStart("daily");
  const trustCount = publicStatsToday ?? 1847;

  return (
    <div className="wirocare-landing">
      <header className="nav">
        <div className="container nav-inner">
          <a className="logo" href="/">
            <span className="logo-mark" aria-hidden="true" />
            <span>
              위로 <span className="logo-sub">To High</span>
            </span>
          </a>
          <nav className="nav-actions">
            <a className="btn btn-ghost" href="/subscribe">
              멤버십
            </a>
            <button type="button" className="btn btn-ghost" onClick={onLoginClick}>
              로그인
            </button>
            <button type="button" className="btn btn-primary" onClick={handlePrimaryStart} disabled={!!starting}>
              마음 들으러 가기 <ArrowIcon />
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
                  조용히 마음 두는 곳
                </span>
                <h1>
                  복잡한 마음,<br />
                  <span className="accent">버튼 하나로 풀어가요</span>
                </h1>
                <p className="lede">
                  처음부터 다 말하기 어려울 때,<br />
                  선택지를 따라 천천히 이야기를 풀어보세요.<br />
                  위로가 필요한 그 순간, 곁에 있을게요.
                </p>
                <div className="hero-cta">
                  <button type="button" className="btn btn-primary btn-lg" onClick={handlePrimaryStart} disabled={!!starting}>
                    {starting ? "마음 가는 길 열어두는 중..." : "오늘 마음, 들어볼게요"} <ArrowIcon size={18} />
                  </button>
                </div>
                {error && (
                  <p style={{ color: "#ef4444", marginTop: 12, fontSize: 14 }}>{error}</p>
                )}
                <div className="trust">
                  <span className="trust-avatars">
                    <span /><span /><span /><span />
                  </span>
                  <span className="trust-text">
                    이번 주 <b>{trustCount.toLocaleString()}분</b>이 위로받았어요
                  </span>
                </div>
              </div>
              <div className="hero-preview" aria-hidden="true">
                <div className="row">
                  <div className="bubble b-ai">오늘 어떤 이야기를 나눠볼까요?</div>
                </div>
                <div className="row">
                  <div className="bubble b-user">요즘 너무 지쳐서… 그냥 누가 들어줬으면 좋겠어요</div>
                </div>
                <div className="row">
                  <div className="typing">
                    <i /><i /><i />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section verticals-section">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">3 Verticals</span>
              <h2 className="section-title">오늘은 어떤 이야기인가요</h2>
              <p className="section-sub">상황에 맞춰 다르게 응답해요. 어디서부터 풀어도 괜찮아요.</p>
            </div>
            <div className="verticals">
              {VERTICALS.map((v) => (
                <article
                  key={v.id}
                  className={`vcard ${v.className}`}
                  tabIndex={0}
                  onClick={() => handleStart(v.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleStart(v.id);
                    }
                  }}
                  role="button"
                >
                  <div className="vbg" />
                  <VerticalArt config={v} />
                  <span className="vbadge">{v.badge}</span>
                  <div className="vmeta">
                    <span className="swatch" />
                    {v.meta}
                  </div>
                  <h3>{v.title}</h3>
                  <div className="vsub">{v.subtitle}</div>
                  <div className="vtags">
                    {v.tags.map((tag) => (
                      <span key={tag} className="vtag">{tag}</span>
                    ))}
                  </div>
                  <div className="vfoot vfoot-end">
                    <span className="vcta">
                      {starting === v.id ? "곁에 자리 만드는 중..." : "여기부터 들어볼게요"} <ArrowIcon size={14} />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Why 위로</span>
              <h2 className="section-title">왜 위로인가요?</h2>
              <p className="section-sub">진료가 아닌, 곁에 앉아 듣는 사람처럼. 편하게 시작해서 안전하게 마쳐요.</p>
            </div>
            <div className="features">
              <div className="feature">
                <div className="ficon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3v6M12 15v6M3 12h6M15 12h6" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="2.4" fill="#34d399" opacity="0.85" />
                  </svg>
                </div>
                <h4>버튼으로 천천히</h4>
                <p>말로 표현하기 어려운 마음도, 선택지를 따라가다 보면 자연스럽게 풀려요.</p>
              </div>
              <div className="feature">
                <div className="ficon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M5 6h10M5 12h6M5 18h12" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" />
                    <circle cx="17" cy="6" r="2.4" fill="#022c22" stroke="#34d399" strokeWidth="1.4" />
                    <circle cx="13" cy="12" r="2.4" fill="#022c22" stroke="#6ee7b7" strokeWidth="1.4" />
                    <circle cx="19" cy="18" r="2.4" fill="#022c22" stroke="#34d399" strokeWidth="1.4" />
                  </svg>
                </div>
                <h4>T · F 응답 스타일</h4>
                <p>논리적인 정리가 필요한 날, 그저 공감받고 싶은 날 — 원하는 톤으로 받아보세요.</p>
              </div>
              <div className="feature">
                <div className="ficon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" fill="#022c22" stroke="#34d399" strokeWidth="1.4" />
                    <path d="M9 12l2 2 4-4.2" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h4>익명, 그리고 안전하게</h4>
                <p>가입 없이도 시작할 수 있어요. 위기 순간에는 1393으로 즉시 연결돼요.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section modes-section">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Response modes</span>
              <h2 className="section-title">원하는 방식으로 받아요</h2>
              <p className="section-sub">조언이 필요한 날, 그저 들어주길 바라는 날 — 모드만 바꾸면 응답이 달라져요.</p>
            </div>
            <div className="modes">
              {RESPONSE_MODES.map((mode) => (
                <span key={mode} className="mode-chip">
                  <span className="dot" />
                  {mode}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="final">
          <div className="container">
            <h2>오늘은 여기서 잠깐 쉬어가세요</h2>
            <p>먼저 와주신 마음, 천천히 들을게요. 가입은 나중에 하셔도 돼요.</p>
            <button type="button" className="btn btn-primary btn-lg" onClick={handlePrimaryStart} disabled={!!starting}>
              {starting ? "곁에 자리 만드는 중..." : "지금 마음, 들어볼게요"} <ArrowIcon size={18} />
            </button>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <div className="foot-top">
            <a className="logo" href="/">
              <span className="logo-mark" />
              <span>
                위로 <span className="logo-sub">To High</span>
              </span>
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
              위기 상황이라면 즉시 전문 상담을 받으세요. <b>자살 예방 상담전화 1393</b> · 24시간 무료
            </span>
          </div>
          <div style={{ marginTop: 24, fontSize: 12, color: "var(--ink-400)" }}>
            © 2026 위로 (To High). 위로는 의료기기가 아니며, 정신건강 진단·치료를 대체하지 않습니다.
          </div>
        </div>
      </footer>
    </div>
  );
}
