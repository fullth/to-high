"use client";

import Image from "next/image";
import { FullPageLink } from "@/components/full-page-link";
import { useAuth } from "@/contexts/auth-context";
import "./landing.css";

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

export function WirocareLanding() {
  const { token, login } = useAuth();
  return (
    <div className="wirocare-landing">
      <header className="nav">
        <div className="container nav-inner">
          <div className="nav-left">
            <FullPageLink className="logo" href="/" aria-label="위로">
              <span className="logo-mark" aria-hidden="true" />
              <span>
                위로 <span className="logo-sub">To High</span>
              </span>
            </FullPageLink>
          </div>
          <nav className="nav-actions">
            {!token && (
              <button className="btn btn-ghost btn-sm" onClick={login}>
                로그인
              </button>
            )}
            <FullPageLink className="btn btn-soft btn-sm" href="/talk">
              상담하기 <ArrowIcon size={12} />
            </FullPageLink>
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
          <div className="hero-levi-backdrop" aria-hidden="true">
            <Image
              src="/characters/levi.png"
              alt=""
              width={500}
              height={500}
              sizes="(max-width: 1399px) 280px, 500px"
              className="hero-levi-image"
            />
          </div>
          <div className="container">
            <div className="hero-grid">
              <div className="hero-copy fade-in">
                <h1>위로: AI심리상담 서비스</h1>
                <p className="lede">
                  위로는 AI 상담사 <strong className="levi-name">레비</strong>와
                  함께하는 AI 심리 상담 서비스예요.
                </p>
                <p className="lede">
                  어디서부터 말해야 할지 몰라도 괜찮아요, 클릭만 해주셔도 <strong className="levi-name">레비</strong>가
                  도와드릴게요.
                </p>
                <div className="hero-cta">
                  <FullPageLink className="btn btn-primary btn-lg" href="/talk">
                    <span><strong>레비</strong>와 이야기하기</span> <ArrowIcon size={18} />
                  </FullPageLink>
                </div>
                <div className="trust">
                  <span className="trust-mark" aria-hidden="true" />
                  <span className="trust-text">가입 없이 시작할 수 있어요</span>
                </div>
              </div>
              <div className="hero-preview" aria-hidden="true">
                <Image
                  src="/characters/levi-listening-pose.png"
                  alt=""
                  width={64}
                  height={64}
                  className="levi-preview-avatar"
                />
                <div className="row">
                  <div className="bubble b-ai">
                    <strong className="levi-name">레비</strong>: 오늘은 어떤 마음이었나요?
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
              <span className="eyebrow"><span><strong className="levi-name">레비</strong>를 소개할게요</span></span>
              <h2 className="section-title">말하기 어려운 날에도</h2>
              <p className="section-sub">
                <strong className="levi-name">레비</strong>는 AI 상담 캐릭터예요. 진단이나 치료나 사람 상담사를 대신하지
                않아요. 부담 없이 말을 건네보세요.
              </p>
            </div>
            <div className="features">
              <div className="feature">
                <Image
                  src="/characters/levi-waving-pose.png"
                  alt="레비 AI 캐릭터"
                  width={120}
                  height={120}
                  priority
                  className="levi-intro-image"
                />
                <h4>버튼을 클릭해서 시작하고, 간편하게 대화를 이어가요</h4>
                <p>
                  말하기 어려운 날은 선택지를 눌러요. 직접 입력해 이야기할 수도
                  있어요.
                </p>
              </div>
              <div className="feature">
                <Image
                  src="/characters/levi-listening-pose.png"
                  alt="편안히 이야기를 듣는 레비"
                  width={120}
                  height={120}
                  className="levi-intro-image"
                />
                <h4>대화는 저장하지 않아요</h4>
                <p>
                  대화는 이 화면에만 남아요. 새로고침하거나 화면을 떠나면
                  사라져요.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="final">
          <div className="container">
            <h2>고생했어요, <strong className="levi-name">레비</strong>에게 들려주세요</h2>
            <FullPageLink className="btn btn-primary btn-lg" href="/talk">
              <span><strong>레비</strong>에게 이야기하기</span> <ArrowIcon size={18} />
            </FullPageLink>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <div className="foot-top">
            <FullPageLink className="logo" href="/" aria-label="위로">
              <span className="logo-mark" />
              <span>위로</span>
            </FullPageLink>
            <div className="foot-links">
              <FullPageLink href="/privacy">개인정보 처리 안내</FullPageLink>
            </div>
          </div>
          <p className="privacy-note">
            답변을 위해 대화는 서버와 AI 제공자가 처리해요. 서비스
            데이터베이스에는 상담 원문을 저장하지 않으며 제공자 측 보관은 해당
            정책과 설정에 따라요.
          </p>
          <div className="crisis">
            <span className="crisis-mark" />
            <span>
              <b>자살예방상담전화 109</b> 24시간 무료
            </span>
          </div>
          <div style={{ marginTop: 24, fontSize: 12, color: "var(--ink-4)" }}>
            © 2026 위로. 이 서비스는 의료기기가 아니며, 정신건강 진단이나 치료를
            대체하지 않습니다.
          </div>
        </div>
      </footer>
    </div>
  );
}
