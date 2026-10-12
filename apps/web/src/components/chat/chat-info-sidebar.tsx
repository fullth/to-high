import Image from "next/image";
import Link from "next/link";

type ChatStep = "start" | "sharing" | "closing";

interface ChatInfoSidebarProps {
  // 현재 대화 단계 — 진행 상황 표시에 사용.
  activeStep: ChatStep;
}

const STEPS: { key: ChatStep; title: string; hint: string }[] = [
  { key: "start", title: "이야기 시작", hint: "마음을 열어봐요" },
  { key: "sharing", title: "마음 나누기", hint: "지금 이야기하고 있어요" },
  { key: "closing", title: "함께 정리하기", hint: "잠시 후에" },
];

// 상담 화면 좌측 정보 사이드바(데스크톱 전용).
// 로고·상담사 상태·진행 단계·안심 문구를 담아 넓은 화면의 허전함을 채운다.
export function ChatInfoSidebar({ activeStep }: ChatInfoSidebarProps) {
  const activeIndex = STEPS.findIndex((s) => s.key === activeStep);

  return (
    <aside className="ch-info-sidebar" aria-label="상담 정보">
      <Link className="ch-info-brand" href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ch-info-logo"
          src="/logo.svg"
          alt="위로"
          width={40}
          height={40}
        />
        <span className="ch-info-brand-text">
          <b>위로</b>
          <em>TO HIGH</em>
        </span>
      </Link>

      <div className="ch-info-counselor">
        <Image
          src="/characters/levi.png"
          alt=""
          aria-hidden="true"
          width={56}
          height={56}
          className="ch-info-levi"
        />
        <span className="ch-info-counselor-text">
          <b>레비</b>
          <span className="ch-info-status">
            <span className="ch-info-status-dot" aria-hidden="true" />
            {activeStep === "closing"
              ? "상담을 마쳤어요"
              : activeStep === "start"
                ? "이야기를 기다려요"
                : "이야기 중"}
          </span>
        </span>
      </div>

      <div className="ch-info-steps">
        <span className="ch-info-steps-label">진행 상황</span>
        <ol>
          {STEPS.map((step, idx) => {
            const state =
              idx < activeIndex
                ? "done"
                : idx === activeIndex
                  ? "active"
                  : "todo";
            return (
              <li key={step.key} className={`ch-info-step ${state}`}>
                <span className="ch-info-step-mark" aria-hidden="true">
                  {state === "done" ? "✓" : ""}
                </span>
                <span className="ch-info-step-text">
                  <b>{step.title}</b>
                  <em>{step.hint}</em>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="ch-info-guest">
        <p className="ch-info-guest-note">
          <span className="ch-info-privacy-dot" aria-hidden="true" />
          대화는 이 화면에만 남아요.
        </p>
        <p className="ch-info-guest-sub">
          새로고침하거나 화면을 떠나면 사라져요. AI와의 대화이며 전문적인
          진단이나 치료를 대신하지 않아요.
        </p>
      </div>
    </aside>
  );
}
