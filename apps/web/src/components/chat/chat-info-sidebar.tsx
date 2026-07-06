type ChatStep = "start" | "sharing" | "closing";

interface ChatInfoSidebarProps {
  // 현재 대화 단계 — 진행 상황 표시에 사용.
  activeStep: ChatStep;
  // 비로그인 상태 — 저장/이어가기 안내 문구를 달리한다.
  isGuest?: boolean;
  // 게스트 → 로그인 유도. 지정되면 사이드바에서 로그인 안내를 보여준다.
  onLogin?: () => void;
}

const STEPS: { key: ChatStep; title: string; hint: string }[] = [
  { key: "start", title: "이야기 시작", hint: "마음을 열어봐요" },
  { key: "sharing", title: "마음 나누기", hint: "지금 이야기하고 있어요" },
  { key: "closing", title: "함께 정리하기", hint: "잠시 후에" },
];

// 상담 화면 좌측 정보 사이드바(데스크톱 전용).
// 로고·상담사 상태·진행 단계·안심 문구를 담아 넓은 화면의 허전함을 채운다.
export function ChatInfoSidebar({
  activeStep,
  isGuest,
  onLogin,
}: ChatInfoSidebarProps) {
  const activeIndex = STEPS.findIndex((s) => s.key === activeStep);

  return (
    <aside className="ch-info-sidebar" aria-label="상담 정보">
      <a className="ch-info-brand" href="/">
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
      </a>

      <div className="ch-info-counselor">
        <span className="ch-info-avatar" aria-hidden="true">
          <span className="ch-info-avatar-pulse" />
        </span>
        <span className="ch-info-counselor-text">
          <b>위로 상담사</b>
          <span className="ch-info-status">
            <span className="ch-info-status-dot" aria-hidden="true" />
            이야기 중
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

      {isGuest ? (
        <div className="ch-info-guest">
          <p className="ch-info-guest-note">
            <span className="ch-info-privacy-dot" aria-hidden="true" />
            지금 대화는 이 브라우저에 <b>30일간</b> 보관돼요.
          </p>
          <p className="ch-info-guest-sub">
            다른 기기에서도 이어가려면 로그인이 필요해요.
          </p>
          {onLogin && (
            <button type="button" className="ch-info-login" onClick={onLogin}>
              로그인하고 저장하기
            </button>
          )}
        </div>
      ) : (
        <p className="ch-info-privacy">
          <span className="ch-info-privacy-dot" aria-hidden="true" />
          이 대화는 안전하게 보호돼요
        </p>
      )}
    </aside>
  );
}
