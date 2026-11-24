"use client";

import { recordJourney } from "@/lib/journey";
import { useJourney } from "@/hooks/use-journey";
import type { JourneyContext } from "@/lib/journey";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useStartOptions } from "@/hooks/use-start-options";
import { respondEphemeral, type TalkMessage } from "@/lib/product-api";
import { getChatErrorCopy, CHAT_ERROR_COPY, ChatRequestError } from "@/lib/chat-errors";
import {
  TICKETING_CHARACTERS,
  TICKETING_SCENARIO_TITLE,
  scenarioGreeting,
  validScenarioName,
  type TicketingScenario,
} from "@/lib/ticketing-scenario";
import { ChatMessageContent } from "@/components/chat/chat-message-content";
import { ProfessionalHelpNotice } from "@/components/professional-help-notice";
import { FullPageLink } from "@/components/full-page-link";
import { ChatDialog } from "./chat-dialog";
import { TurnLimitDialog } from "./turn-limit-dialog";
import type { ChatErrorCode } from "@/lib/chat-errors";
import styles from "./ticketing-scenario.module.css";

type Props = { source: TicketingScenario["source"]; onCounseling: () => void };

export function TicketingScenarioExperience({ source, onCounseling }: Props) {
  const journey = useJourney(source === "practicket" ? "ad_ticketing" : "lobby_ticketing");
  const [gender, setGender] = useState<TicketingScenario["gender"] | null>(
    null,
  );
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<TicketingScenario | null>(null);
  const [nameError, setNameError] = useState("");
  const stageHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const forget = () => {
      setProfile(null);
      setGender(null);
      setName("");
      setNameError("");
    };
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) forget();
    };
    window.addEventListener("pagehide", forget);
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("pagehide", forget);
      window.removeEventListener("pageshow", restore);
    };
  }, []);

  useEffect(() => {
    stageHeading.current?.focus();
  }, [gender, profile]);
  const reset = () => {
    journey.restart();
    setProfile(null);
    setGender(null);
    setName("");
    setNameError("");
  };
  return (
    <main className={`ch-theme ch-ephemeral ${styles.page}`}>
      <header className={styles.header}>
        <FullPageLink href="/" className={styles.brand}>
          <Image src="/characters/levi-waving-pose.png" alt="" width={34} height={34} />
          위로 <span className={styles.brandSub}>To High</span>
        </FullPageLink>
        <span className={styles.badge}>시나리오 모드</span>
      </header>
      <div className={`${styles.container} ${profile ? styles.activeContainer : ""}`}>
        <p className={styles.eyebrow}>{TICKETING_SCENARIO_TITLE}</p>
        {!profile ? (
          <>
            <nav aria-label="시나리오 준비 단계" className={styles.steps}>
              <span aria-current={!gender ? "step" : undefined}>
                1 캐릭터 선택
              </span>
              <span aria-current={gender ? "step" : undefined}>
                2 이름 정하기
              </span>
              <span>3 이야기 시작</span>
            </nav>
            <h1 ref={stageHeading} tabIndex={-1}>
              {gender
                ? "어떤 이름으로 만날까요?"
                : "누구의 메시지를 받아볼까요?"}
            </h1>
            <p className={styles.intro}>
              공연을 기다렸지만 표를 구하지 못한 날.
              <br />
              연습을 마친 가상의 뮤지션이 당신에게 말을 건넵니다.
            </p>
            {!gender ? (
              <div className={styles.cards}>
                {(["male", "female"] as const).map((key) => {
                  const character = TICKETING_CHARACTERS[key];
                  return (
                    <button
                      key={key}
                      className={styles.card}
                      onClick={() => {
                        setGender(key);
                        setName(character.defaultName);
                      }}
                    >
                      <div className={styles.portrait}>
                        <Image
                          src={character.image}
                          alt={`가상의 ${character.label} 뮤지션 ${character.defaultName}`}
                          fill
                          sizes="(max-width: 640px) 46vw, 340px"
                          priority
                        />
                      </div>
                      <span className={styles.cardBody}>
                        <strong>{character.label} 캐릭터</strong>
                        <span>{character.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <form
                className={styles.nameCard}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!validScenarioName(name)) {
                    setNameError(
                      "이름은 한글, 영문 등 글자와 숫자로 1~12자 입력해 주세요.",
                    );
                    return;
                  }
                  recordJourney(journey.current(), "character_selected");
                  setProfile({
                  source,
                    kind: "ticketing",
                    gender,
                    name: name.normalize("NFKC").trim(),
                  });
                }}
              >
                <div className={styles.namePortrait}>
                  <Image
                    src={TICKETING_CHARACTERS[gender].image}
                    alt="선택한 가상의 뮤지션"
                    fill
                    sizes="220px"
                  />
                </div>
                <div className={styles.nameFields}>
                  <label htmlFor="scenario-name">캐릭터 이름</label>
                  <input
                    id="scenario-name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setNameError("");
                    }}
                    maxLength={12}
                    autoComplete="off"
                    aria-describedby={nameError ? "scenario-name-help scenario-name-error" : "scenario-name-help"}
                    aria-invalid={!!nameError}
                  />
                  <p id="scenario-name-help">
                    기본 이름으로 시작해도 좋아요. 이름은 이 이야기 안에서만
                    사용해요.
                  </p>
                  {nameError && <p id="scenario-name-error" className="ch-talk-error" role="alert">{nameError}</p>}
                  <button className={styles.primary} type="submit">
                    이 이름으로 이야기 시작
                  </button>
                  <button
                    className={styles.textButton}
                    type="button"
                    onClick={reset}
                  >
                    캐릭터 다시 선택
                  </button>
                </div>
              </form>
            )}
            <p className={styles.disclosure}>
              등장인물과 공연은 가상의 설정이며, AI가 이야기를 이어갑니다.
            </p>
            <button className={styles.textButton} onClick={onCounseling}>
              실제 고민을 이야기하고 싶다면 레비와 상담하기
            </button>
          </>
        ) : (
          <ScenarioConversation
            key={`${profile.gender}:${profile.name}`}
            profile={profile}
            journey={journey.current}
            onReset={reset}
            onCounseling={onCounseling}
          />
        )}
      </div>
    </main>
  );
}

function ScenarioConversation({
  profile,
  journey,
  onReset,
  onCounseling,
}: {
  profile: TicketingScenario;
  journey: () => JourneyContext;
  onReset: () => void;
  onCounseling: () => void;
}) {
  const { token, login, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<TalkMessage[]>([]);
  const [options, setOptions] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [inputOpen, setInputOpen] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<ChatErrorCode | null>(null);
  const [pendingAction, setPendingAction] = useState<"reset" | "counseling" | null>(null);
  const history = useRef<TalkMessage[]>([]);
  const summary = useRef("");
  const request = useRef<AbortController | null>(null);
  const identity = useRef(token);
  useEffect(() => {
    if (identity.current === token) return;
    identity.current = token;
    request.current?.abort();
    request.current = null;
    history.current = [];
    summary.current = "";
    queueMicrotask(onReset);
  }, [token, onReset]);

  const list = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const generated = useStartOptions(
    "ticketing",
    token,
    !authLoading && !messages.length && !busy,
    profile,
  );
  useEffect(() => {
    heading.current?.focus();
    const forget = () => {
      request.current?.abort();
      request.current = null;
      history.current = [];
      summary.current = "";
    };
    window.addEventListener("pagehide", forget);
    return () => {
      forget();
      window.removeEventListener("pagehide", forget);
    };
  }, []);
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, busy]);
  const send = async (value: string) => {
    const text = value.trim();
    if (!text || request.current || authLoading) return;
    if (text.length > 500) {
      setError(CHAT_ERROR_COPY.INVALID_INPUT);
      return;
    }
    const next: TalkMessage[] = [
      ...history.current,
      { role: "user", content: text },
    ];
    if (
      next.length > 20 ||
      next.reduce(
        (count, message) => count + message.content.length,
        summary.current.length,
      ) > 12000
    ) {
      setError(CHAT_ERROR_COPY.SUMMARY_FAILED);
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    const before = messages;
    const visible: TalkMessage[] = [...before, { role: "user", content: text }];
    setBusy(true);
    setError("");
    setErrorCode(null);
    setInput("");
    setMessages(visible);
    try {
      const result = await respondEphemeral(
        next,
        "F",
        token,
        controller.signal,
        undefined,
        undefined,
        summary.current || undefined,
        (reply) => {
          if (!controller.signal.aborted)
            setMessages([...visible, { role: "assistant", content: reply }]);
        },
        profile,
        journey(),
      );
      if (controller.signal.aborted) return;
      const reply: TalkMessage = { role: "assistant", content: result.reply };
      history.current = [
        ...(result.context
          ? next.slice(-result.context.retainedMessages)
          : next),
        reply,
      ];
      if (result.context) summary.current = result.context.summary;
      setMessages([...visible, reply]);
      setOptions(result.options || ["조금 더 이야기할게", "잠깐 쉬어갈게"]);
      setInputOpen(false);
    } catch (failure) {
      if (!controller.signal.aborted) {
        setMessages(before);
        setInput(text);
        setError(getChatErrorCopy(failure));
        setErrorCode(failure instanceof ChatRequestError ? failure.code : null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        request.current = null;
      }
    }
  };
  return (
    <section className={styles.conversation}>
      {pendingAction && <ChatDialog
        title={pendingAction === "reset" ? "캐릭터를 다시 선택할까요?" : "레비와 상담할까요?"}
        onClose={() => setPendingAction(null)}
        actions={<>
          <button className="ch-limit-dialog-primary" onClick={() => {
            request.current?.abort();
            if (pendingAction === "reset") onReset(); else onCounseling();
          }}>{pendingAction === "reset" ? "캐릭터 다시 선택" : "레비와 상담하기"}</button>
          <button className="ch-ghostbtn" onClick={() => setPendingAction(null)}>계속 이야기하기</button>
        </>}
      ><p>지금 이야기와 캐릭터 이름은 지워져요. 다른 이야기나 레비 상담으로 이어지지 않아요.</p></ChatDialog>}
      {(errorCode === "DAILY_GUEST_LIMIT" || errorCode === "DAILY_USER_LIMIT") && <TurnLimitDialog
        message={error}
        guest={errorCode === "DAILY_GUEST_LIMIT"}
        onClose={() => { setError(""); setErrorCode(null); }}
        onLogin={() => { request.current?.abort(); onReset(); login(); }}
      />}
      <aside className={styles.characterAside} aria-label="이야기 속 캐릭터">
        <Image src={TICKETING_CHARACTERS[profile.gender].image} alt="" width={230} height={295} />
        <div><p className={styles.eyebrow}>티켓팅 편</p><strong>{profile.name}</strong>
          <p>{TICKETING_CHARACTERS[profile.gender].description}</p>
          <p>공연을 놓친 밤,<br />연습을 마친 뮤지션과 나누는 이야기</p></div>
      </aside>
      <div className={styles.chatPanel}>
      <div className={styles.characterHeader}>
        <Image
          src={TICKETING_CHARACTERS[profile.gender].image}
          alt={`${profile.name}, 가상의 뮤지션`}
          width={64}
          height={64}
        />
        <div>
          <h1 tabIndex={-1} ref={heading}>
            {profile.name}
          </h1>
          <p>{TICKETING_SCENARIO_TITLE}</p>
        </div>
      </div>
      <div
        className={styles.messages}
        ref={list}
        role="log"
        aria-label="시나리오 대화"
        aria-live="polite"
        aria-busy={busy}
      >
        <ScenarioMessage profile={profile} message={{ role: "assistant", content: scenarioGreeting(profile.gender) }} />
        {messages.map((message, index) => <ScenarioMessage key={index} profile={profile} message={message} />)}
        {busy && <p role="status">이야기를 이어가고 있어요.</p>}
      </div>
      {error && (
        <p className="ch-talk-error" role="alert">
          {error}
        </p>
      )}
      {options === null && generated.loading && !messages.length && (
        <p role="status">첫 이야기를 준비하고 있어요.</p>
      )}
      {options === null && generated.fallback && !messages.length && (
        <p className={styles.hint}>
          기본 선택지로도 이야기를 시작할 수 있어요.
        </p>
      )}
      <div className={styles.options} aria-label="이야기 선택지">
        {(options ?? (generated.loading ? [] : generated.options)).map(
          (option) => (
            <button
              key={option}
              disabled={busy || authLoading}
              onClick={() => void send(option)}
            >
              {option}
            </button>
          ),
        )}
      </div>
      <button
        className={styles.textButton}
        aria-expanded={inputOpen}
        aria-controls="scenario-composer"
        onClick={() => setInputOpen(!inputOpen)}
        disabled={busy}
      >
        {inputOpen ? "선택지로 돌아가기" : "직접 입력할게요"}
      </button>
      <form
        id="scenario-composer"
        hidden={!inputOpen}
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <label className="sr-only" htmlFor="scenario-input">
          전하고 싶은 이야기
        </label>
        <textarea
          id="scenario-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={500}
          rows={2}
          disabled={busy}
          placeholder="편하게 이야기해 주세요"
        />
        <button
          className={styles.primary}
          disabled={busy || authLoading || !input.trim()}
        >
          보내기
        </button>
      </form>
      <div className={styles.actions}>
        <button className={styles.textButton} onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); setPendingAction("reset"); }}>
          이야기 지우고 캐릭터 다시 선택
        </button>
        <button className={styles.textButton} onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); setPendingAction("counseling"); }}>
          이야기 지우고 레비와 상담하기
        </button>
      </div>
      <p className={styles.disclosure}>
        가상의 인물과 나누는 AI 대화이며 진단이나 치료를 대신하지 않아요.
        이야기와 이름은 화면을 떠나면 사라져요.
      </p>
      <details className={styles.help}>
        <summary>24시간 전문가 상담 안내</summary>
        <ProfessionalHelpNotice />
      </details>
      </div>
    </section>
  );
}

function ScenarioMessage({ profile, message }: { profile: TicketingScenario; message: TalkMessage }) {
  if (message.role === "user") return <div className={styles.user}><p>{message.content}</p></div>;
  return <div className={styles.messageRow}>
    <div className={styles.speaker}>
      <Image src={TICKETING_CHARACTERS[profile.gender].image} alt="" width={44} height={44} />
      <span>{profile.name}</span>
    </div>
    <div className={styles.ai}><ChatMessageContent content={message.content} /></div>
  </div>;
}
