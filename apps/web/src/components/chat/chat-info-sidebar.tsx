import Image from "next/image";
import { FullPageLink } from "@/components/full-page-link";
import type { SavedSession } from "@/lib/product-api";
import { SavedSessionList } from "@/components/talk/saved-session-list";

type ChatStep = "start" | "sharing" | "closing";

interface ChatInfoSidebarProps {
  // 현재 대화 단계 — 진행 상황 표시에 사용.
  activeStep: ChatStep;
  sessions?: SavedSession[];
  loggedIn?: boolean;
  error?: string;
  onOpenSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
}

// 상담 화면 좌측 정보 사이드바(데스크톱 전용).
// 로고, 상담사 상태, 저장된 상담과 안내 문구를 표시한다.
export function ChatInfoSidebar({ activeStep, sessions = [], loggedIn = false, error = "", onOpenSession, onDeleteSession }: ChatInfoSidebarProps) {

  return (
    <aside className="ch-info-sidebar" aria-label="상담 정보">
      <FullPageLink className="ch-info-brand" href="/">
        <Image
          className="ch-info-logo"
          src="/characters/levi.png"
          alt=""
          width={40}
          height={44}
        />
        <span className="ch-info-brand-text">
          <b>위로</b>
          <em>TO HIGH</em>
        </span>
      </FullPageLink>

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

      <section className="ch-saved-list" aria-label="저장된 상담">
        <h2>저장된 상담</h2>
        <SavedSessionList sessions={sessions} loggedIn={loggedIn} error={error} onOpen={(id) => onOpenSession?.(id)} onDelete={(id) => onDeleteSession?.(id)} />
      </section>

      <div className="ch-info-guest">
        <p className="ch-info-guest-note">
          <span className="ch-info-privacy-dot" aria-hidden="true" />
          대화는 선택할 때만 저장돼요.
        </p>
        <p className="ch-info-guest-sub">
          저장하지 않은 대화는 화면을 떠나면 사라져요. AI와의 대화이며 전문적인
          진단이나 치료를 대신하지 않아요.
        </p>
      </div>
    </aside>
  );
}
