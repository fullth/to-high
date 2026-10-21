"use client";

import { ChatMessageContent } from "@/components/chat/chat-message-content";
import Image from "next/image";
import { FullPageLink } from "@/components/full-page-link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  respondEphemeral,
  getCharacter,
  type Character,
  type TalkMessage,
} from "@/lib/product-api";
import {
  CharacterPresence,
  type PresenceState,
} from "@/components/talk/character-presence";
import type { CounselorType } from "@/lib/api";
import { CHARACTER_MEMORY_AVAILABLE } from "@/lib/product-features";
import { ChatInfoSidebar } from "@/components/chat/chat-info-sidebar";
import "@/components/chat/chat.css";
import "@/components/talk/talk-chat.css";
import {
  CHAT_ERROR_COPY,
  ChatRequestError,
  getChatErrorCopy,
  type ChatErrorCode,
} from "@/lib/chat-errors";

const styles: Array<[CounselorType, string]> = [
  ["F", "따뜻한 공감"],
  ["T", "차분한 정리"],
  ["reaction", "짧은 반응"],
  ["listening", "경청"],
];
const initialOptions = [
  "일 때문에 힘들어요",
  "관계가 어려워요",
  "마음이 불안해요",
  "말로 표현하기 어려워요",
  "정리해주세요",
];
function TalkContent() {
  const { token, isLoading: authLoading, login, logout } = useAuth();
  const params = useSearchParams();
  const characterId = CHARACTER_MEMORY_AVAILABLE
    ? params.get("characterId") || undefined
    : undefined;
  const [identity, setIdentity] = useState<Pick<
    Character,
    "id" | "displayName" | "style"
  > | null>(null);
  const [identityStatus, setIdentityStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const identityRevision = useRef(0);
  const [identityRetry, setIdentityRetry] = useState(0);
  const [messages, setMessages] = useState<TalkMessage[]>([]);
  const [options, setOptions] = useState<string[]>(initialOptions);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [arrival, setArrival] = useState(false);
  const inputElement = useRef<HTMLTextAreaElement>(null);
  const messagesPane = useRef<HTMLDivElement>(null);
  const restoreInputFocus = useRef(false);
  useEffect(() => {
    if (!arrival) return;
    const timer = window.setTimeout(() => setArrival(false), 1800);
    return () => window.clearTimeout(timer);
  }, [arrival]);
  useEffect(() => {
    if (!busy && restoreInputFocus.current) {
      restoreInputFocus.current = false;
      // Touch devices should only open the keyboard when the user taps the input.
      if (
        window.matchMedia(
          "(min-width: 768px) and (hover: hover) and (pointer: fine)",
        ).matches &&
        document.activeElement === document.body
      )
        inputElement.current?.focus({ preventScroll: true });
    }
  }, [busy]);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [errorCode, setErrorCode] = useState<ChatErrorCode | null>(null);
  useEffect(() => {
    const pane = messagesPane.current;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [messages, busy, error, ended]);
  const history = useRef<TalkMessage[]>([]);
  const summary = useRef("");
  const transcript = useRef<TalkMessage[]>([]);
  const request = useRef<AbortController | null>(null);
  const version = useRef({ value: 0 });
  const target = useRef({ characterId, token });
  const clear = useCallback(() => {
    setArrival(false);
    restoreInputFocus.current = false;
    version.current.value++;
    request.current?.abort();
    request.current = null;
    history.current = [];
    summary.current = "";
    transcript.current = [];
    setOptions([]);
    setMessages([]);
    setInput("");
    setError("");
    setErrorCode(null);
    setStreaming(false);
    setBusy(false);
    setEnded(true);
  }, []);
  useEffect(() => {
    const lifecycle = version.current;
    const hide = () => clear();
    const show = (event: PageTransitionEvent) => {
      if (event.persisted) clear();
    };
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", show);
    return () => {
      lifecycle.value++;
      request.current?.abort();
      request.current = null;
      history.current = [];
      summary.current = "";
      transcript.current = [];
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
    };
  }, [clear]);
  useEffect(() => {
    if (
      target.current.characterId === characterId &&
      target.current.token === token
    )
      return;
    target.current = { characterId, token };
    const hadConversation = history.current.length > 0 || !!request.current;
    version.current.value++;
    request.current?.abort();
    request.current = null;
    history.current = [];
    summary.current = "";
    transcript.current = [];
    if (hadConversation) queueMicrotask(clear);
  }, [characterId, token, clear]);
  useEffect(() => {
    if (!characterId || !token) return;
    if (!/^[a-f\d]{24}$/i.test(characterId)) {
      queueMicrotask(() => setIdentityStatus("error"));
      return;
    }
    let active = true;
    let controller: AbortController | null = null;
    const refresh = async () => {
      controller?.abort();
      const pending = new AbortController();
      controller = pending;
      setIdentityStatus("loading");
      try {
        const item = await getCharacter(characterId, token, pending.signal);
        if (!active || pending.signal.aborted) return;
        if (
          item.id !== characterId ||
          !item.displayName?.trim() ||
          !styles.some(([value]) => value === item.style)
        )
          throw new Error("Invalid character identity");
        identityRevision.current++;
        setIdentity({
          id: item.id,
          displayName: item.displayName,
          style: item.style,
        });
        setIdentityStatus("ready");
      } catch {
        if (active && !pending.signal.aborted) setIdentityStatus("error");
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [characterId, token, identityRetry]);
  const characterReady =
    !characterId ||
    (identityStatus === "ready" && identity?.id === characterId);
  const aiName = characterId
    ? identity?.id === characterId
      ? identity.displayName
      : "캐릭터 확인 중"
    : "레비";
  const sendText = async (value: string) => {
    if (
      request.current ||
      !value.trim() ||
      ended ||
      !characterReady ||
      (characterId && !token)
    )
      return;
    if (
      history.current.length + 1 > 20 ||
      history.current.reduce(
        (sum, message) => sum + message.content.length,
        summary.current.length,
      ) +
        value.trim().length >
        12000
    ) {
      setError(CHAT_ERROR_COPY.SUMMARY_FAILED);
      setErrorCode("SUMMARY_FAILED");
      return;
    }
    if (value.trim().length > 500) {
      setError(CHAT_ERROR_COPY.INVALID_INPUT);
      setErrorCode("INVALID_INPUT");
      return;
    }
    const identityAtRequest = identityRevision.current;
    const current = version.current.value;
    const controller = new AbortController();
    request.current = controller;
    const next: TalkMessage[] = [
      ...history.current,
      { role: "user", content: value.trim() },
    ];
    const before = transcript.current;
    const visibleNext: TalkMessage[] = [
      ...before,
      { role: "user", content: value.trim() },
    ];
    history.current = next;
    setMessages(visibleNext);
    setStreaming(false);
    setInput("");
    setArrival(false);
    setBusy(true);
    setError("");
    setErrorCode(null);
    try {
      // Let the server select its default so staggered web/API releases stay compatible.
      const result = await respondEphemeral(
        next,
        characterId ? identity!.style : "F",
        token,
        controller.signal,
        characterId,
        undefined,
        summary.current || undefined,
        (text) => {
          if (controller.signal.aborted || current !== version.current.value)
            return;
          setStreaming(true);
          setArrival(true);
          setMessages([...visibleNext, { role: "assistant", content: text }]);
        },
      );
      if (controller.signal.aborted || current !== version.current.value)
        return;
      if (
        characterId &&
        identityRevision.current === identityAtRequest &&
        result.character?.id === characterId &&
        result.character.displayName?.trim() &&
        styles.some(([value]) => value === result.character!.style)
      ) {
        identityRevision.current++;
        setIdentity(result.character);
      }
      const reply: TalkMessage = { role: "assistant", content: result.reply };
      if (result.context) summary.current = result.context.summary;
      history.current = [
        ...(result.context
          ? next.slice(-result.context.retainedMessages)
          : next),
        reply,
      ];
      transcript.current = [...visibleNext, reply];
      setArrival(true);
      setOptions(result.options || ["더 이야기할게요", "정리해주세요"]);
      setMessages(transcript.current);
    } catch (error) {
      if (!controller.signal.aborted && current === version.current.value) {
        history.current = next.slice(0, -1);
        setMessages(before);
        setInput(value);
        setError(getChatErrorCopy(error));
        setErrorCode(
          error instanceof ChatRequestError ? error.code : "UNAVAILABLE",
        );
      }
    } finally {
      if (current === version.current.value) {
        request.current = null;
        restoreInputFocus.current = true;
        setBusy(false);
        setStreaming(false);
      }
    }
  };
  const presenceState: PresenceState = ended
    ? "ended"
    : error
      ? "error"
      : busy && !streaming
        ? "thinking"
        : arrival || streaming
          ? "arrived"
          : input.length > 0
            ? "listening"
            : "idle";
  return (
    <main className="ch-frame ch-frame-split ch-ephemeral">
      <ChatInfoSidebar
        activeStep={ended ? "closing" : messages.length ? "sharing" : "start"}
      />
      <div className="ch-inner">
        <header className="ch-header">
          <FullPageLink className="ch-logo" href="/" onClick={clear}>
            <span className="ch-logo-mark" aria-hidden="true" />
            위로
          </FullPageLink>
          <button className="ch-ghostbtn" onClick={clear}>
            상담 종료 후 원문 지우기
          </button>
        </header>
        <CharacterPresence
          name={aiName}
          state={presenceState}
          appearance="chat"
        />
        <div className="ch-messages anchor-end" ref={messagesPane}>
          <h1 className="ch-talk-title">
            {characterId && !characterReady
              ? identityStatus === "error"
                ? "캐릭터를 다시 확인해 주세요"
                : "캐릭터를 확인하고 있어요"
              : `${aiName}에게 지금 마음을 이야기해요`}
          </h1>
          {characterId && !token && (
            <section className="ch-inline-card">
              <p>
                캐릭터와 상담하려면 먼저 로그인해 주세요. 입력한 초안은
                로그인으로 가져가지 않아요.
              </p>
              <button
                className="ch-primary"
                onClick={() => {
                  clear();
                  login();
                }}
              >
                원문 지우고 로그인
              </button>
            </section>
          )}
          {characterId && token && !characterReady && (
            <section role="status" className="ch-inline-card">
              <p>
                {identityStatus === "error"
                  ? "캐릭터를 확인하지 못했어요. 이름과 소유권을 확인한 뒤 상담을 시작할 수 있어요."
                  : "레비를 확인하고 있어요..."}
              </p>
              {identityStatus === "error" && (
                <button
                  className="ch-ghostbtn"
                  onClick={() => setIdentityRetry((count) => count + 1)}
                >
                  캐릭터 다시 확인
                </button>
              )}
            </section>
          )}
          {ended ? (
            <section className="ch-inline-card">
              <p>상담을 마쳤어요. 이 화면의 대화 원문과 입력을 지웠어요.</p>
              <button
                className="ch-primary"
                onClick={() => {
                  setEnded(false);
                  setOptions(initialOptions);
                }}
              >
                새 상담 시작
              </button>
            </section>
          ) : (
            <>
              <div
                role="log"
                aria-live="polite"
                aria-relevant="additions"
                aria-atomic="false"
                aria-label="현재 상담 대화"
                className="ch-conversation"
              >
                {!messages.length && !busy && (
                  <div className="ch-row">
                    <div className="ch-bubble ai">
                      어디서부터 말해야 할지 몰라도 괜찮아요. 선택지를 누르거나
                      편하게 이야기해 주세요.
                    </div>
                  </div>
                )}
                {messages.map((message, index) => (
                  <article
                    key={index}
                    className={`ch-row ${message.role === "user" ? "user" : ""}`}
                  >
                    <div
                      className={`ch-bubble ${message.role === "user" ? "user" : "ai glow"}`}
                    >
                      <p className="ch-message-name">
                        {message.role === "assistant" && (
                          <Image
                            src="/characters/levi.png"
                            alt=""
                            aria-hidden="true"
                            width={24}
                            height={24}
                          />
                        )}
                        {message.role === "user" ? "나" : aiName}
                      </p>
                      {message.role === "user" ? (
                        <p>{message.content}</p>
                      ) : (
                        <ChatMessageContent content={message.content} />
                      )}
                    </div>
                  </article>
                ))}
                {busy && !streaming && (
                  <div className="ch-row">
                    <div className="ch-typing" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <span className="ch-typing-text">
                        귀 기울여 듣는 중...
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {error && (
                <section role="alert" className="ch-talk-error">
                  <p>{error}</p>
                  {(errorCode === "SUMMARY_FAILED" ||
                    errorCode === "AUTH_REQUIRED") && (
                    <button
                      className="ch-ghostbtn"
                      onClick={() => {
                        if (errorCode === "AUTH_REQUIRED") logout();
                        clear();
                        setEnded(false);
                        setOptions(initialOptions);
                      }}
                    >
                      {errorCode === "AUTH_REQUIRED"
                        ? "가입 없이 새 대화 시작"
                        : "새 상담 시작"}
                    </button>
                  )}
                  {errorCode === "AUTH_REQUIRED" && (
                    <button
                      className="ch-ghostbtn"
                      onClick={() => {
                        clear();
                        login();
                      }}
                    >
                      원문 지우고 로그인
                    </button>
                  )}
                </section>
              )}
            </>
          )}
        </div>
        <div className="ch-dock">
          {!ended && (
            <>
              <div aria-label="답변 선택지" className="ch-options">
                {options.map((option) => (
                  <button
                    key={option}
                    className="ch-option"
                    disabled={
                      busy ||
                      authLoading ||
                      !characterReady ||
                      (!!characterId && !token)
                    }
                    onClick={() => void sendText(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <form
                className="ch-input-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendText(input);
                }}
              >
                <label htmlFor="talk-input" className="sr-only">
                  전하고 싶은 마음
                </label>
                <textarea
                  id="talk-input"
                  ref={inputElement}
                  className="ch-input"
                  placeholder="편하게 이야기해 주세요"
                  maxLength={500}
                  rows={1}
                  value={input}
                  disabled={
                    busy ||
                    authLoading ||
                    !characterReady ||
                    (!!characterId && !token)
                  }
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      if (!busy) void sendText(input);
                    }
                  }}
                />
                <button
                  className="ch-send"
                  disabled={
                    busy ||
                    !characterReady ||
                    !input.trim() ||
                    authLoading ||
                    (!!characterId && !token)
                  }
                >
                  보내기
                </button>
              </form>
              <p className="ch-composer-hint">{input.length}/500자</p>
            </>
          )}
          <p className="ch-talk-disclaimer">
            AI와의 대화이며 전문적인 진단이나 치료를 대신하지 않아요.
          </p>
          <details className="ch-privacy-details">
            <summary>대화는 이 화면에만 남아요. 이용 안내</summary>
            <p>
              대화 원문과 대화를 이어가기 위한 요약은 현재 브라우저 화면의
              메모리에서만 유지하고 서비스 데이터베이스에 저장하지 않아요.
              답변을 위해 서버와 AI 제공자가 처리하며, 제공자 측 보관은 해당
              정책과 설정의 적용을 받아요. 종료하거나 페이지를 떠나면 이 화면의
              원문과 요약이 사라져요. 새로고침해도 원문을 다시 불러올 수 없어요.
            </p>
          </details>
        </div>
      </div>
    </main>
  );
}

export default function TalkPage() {
  return (
    <Suspense fallback={<p>불러오는 중...</p>}>
      <TalkContent />
    </Suspense>
  );
}
