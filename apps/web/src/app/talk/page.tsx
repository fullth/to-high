"use client";
import Image from "next/image";
import Link from "next/link";
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
  const { token, isLoading: authLoading, login } = useAuth();
  const params = useSearchParams();
  const characterId = params.get("characterId") || undefined;
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
  const restoreInputFocus = useRef(false);
  useEffect(() => {
    if (!arrival) return;
    const timer = window.setTimeout(() => setArrival(false), 1800);
    return () => window.clearTimeout(timer);
  }, [arrival]);
  useEffect(() => {
    if (!busy && restoreInputFocus.current) {
      restoreInputFocus.current = false;
      if (document.activeElement === document.body)
        inputElement.current?.focus();
    }
  }, [busy]);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState("");
  const [crisis, setCrisis] = useState("");
  const history = useRef<TalkMessage[]>([]);
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
    setOptions([]);
    setMessages([]);
    setInput("");
    setError("");
    setCrisis("");
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
      history.current.length + 1 > 19 ||
      history.current.reduce(
        (sum, message) => sum + message.content.length,
        0,
      ) +
        value.trim().length >
        12000
    ) {
      setError(
        "이번 대화의 맥락 한도에 도달했어요. 원문을 지우고 새 상담을 시작하거나 상담을 마쳐 주세요.",
      );
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
    history.current = next;
    setMessages(next);
    setInput("");
    setArrival(false);
    setBusy(true);
    setError("");
    try {
      const result = await respondEphemeral(
        next,
        characterId ? identity!.style : "F",
        token,
        controller.signal,
        characterId,
        "comfort",
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
      const updated: TalkMessage[] = [
        ...next,
        { role: "assistant", content: result.reply },
      ];
      setArrival(true);
      setOptions(result.options || ["더 이야기할게요", "정리해주세요"]);
      history.current = updated;
      setMessages(updated);
      if (result.isCrisis)
        setCrisis(
          result.crisisMessage ||
            "혼자 감당하지 않아도 괜찮아요. 자살예방 상담전화 109, 긴급한 위험에는 112 또는 119로 연락해 주세요.",
        );
    } catch {
      if (!controller.signal.aborted && current === version.current.value) {
        history.current = next.slice(0, -1);
        setMessages(history.current);
        setInput(value);
        setError(
          "답변을 받지 못했어요. 다시 말하고 싶은 내용을 입력해 주세요.",
        );
      }
    } finally {
      if (current === version.current.value) {
        request.current = null;
        restoreInputFocus.current = true;
        setBusy(false);
      }
    }
  };
  const presenceState: PresenceState = ended
    ? "ended"
    : error
      ? "error"
      : busy
        ? "thinking"
        : arrival
          ? "arrived"
          : input.length > 0
            ? "listening"
            : "idle";
  const atLimit =
    messages.length >= 20 ||
    messages.reduce((sum, message) => sum + message.content.length, 0) >= 11500;
  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <nav className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" onClick={clear}>
          위로
        </Link>
        <button className="min-h-11 px-3 border rounded-lg" onClick={clear}>
          상담 종료 · 원문 지우기
        </button>
      </nav>
      <CharacterPresence name={aiName} state={presenceState} />
      <h1 className="text-2xl font-semibold break-words">
        {characterId && !characterReady
          ? identityStatus === "error"
            ? "캐릭터를 다시 확인해 주세요"
            : "캐릭터를 확인하고 있어요"
          : `${aiName} · 지금 마음을 이야기해요`}
      </h1>
      <p className="text-sm text-muted-foreground break-words">
        {aiName} · AI 상담 캐릭터
      </p>
      <p className="text-sm text-muted-foreground break-words">
        AI와의 대화이며 전문적인 진단·치료를 대신하지 않아요. 대화 원문은 현재
        브라우저 화면의 메모리에서만 유지하고 서비스 데이터베이스에 저장하지
        않아요. 답변을 위해 서버와 AI 제공자가 처리하며, 제공자 측 보관은 해당
        정책·설정의 적용을 받아요. 종료하거나 페이지를 떠나면 이 화면의 원문이
        사라져요. 새로고침해도 원문을 다시 불러올 수 없어요.
      </p>
      {characterId && !token ? (
        <section className="p-4 border rounded-xl">
          <p>
            캐릭터와 상담하려면 먼저 로그인해 주세요. 입력한 초안은 로그인으로
            가져가지 않아요.
          </p>
          <button
            className="min-h-11 px-4 border rounded-lg"
            onClick={() => {
              clear();
              login();
            }}
          >
            원문 지우고 로그인
          </button>
        </section>
      ) : null}
      {characterId && token && !characterReady && (
        <section role="status" className="p-4 border rounded-xl">
          <p>
            {identityStatus === "error"
              ? "캐릭터를 확인하지 못했어요. 이름과 소유권을 확인한 뒤 상담을 시작할 수 있어요."
              : "레비를 확인하고 있어요..."}
          </p>
          {identityStatus === "error" && (
            <button
              className="min-h-11 underline"
              onClick={() => setIdentityRetry((count) => count + 1)}
            >
              캐릭터 다시 확인
            </button>
          )}
        </section>
      )}
      {ended ? (
        <section className="p-4 bg-card rounded-xl">
          <p>상담을 마쳤어요. 이 화면의 대화 원문과 입력을 지웠어요.</p>
          <button
            className="min-h-11 px-4 border rounded-lg"
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
          {crisis && (
            <aside
              role="alert"
              className="p-4 bg-muted border border-primary rounded-xl whitespace-pre-wrap"
            >
              <h2 className="font-semibold">지금 안전을 먼저 챙겨요</h2>
              <p>{crisis}</p>
              <a href="tel:109" className="underline">
                109 상담전화
              </a>{" "}
              ·{" "}
              <a href="tel:119" className="underline">
                119 긴급 도움
              </a>
            </aside>
          )}
          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-atomic="false"
            aria-label="현재 상담 대화"
            className="space-y-4"
          >
            {messages.map((message, index) => (
              <article
                key={index}
                className="p-4 rounded-xl bg-card whitespace-pre-wrap break-words"
              >
                <p className="text-sm text-muted-foreground break-words">
                  {message.role === "assistant" && (
                    <Image
                      src="/characters/levi.png"
                      alt=""
                      aria-hidden="true"
                      width={24}
                      height={24}
                      className="inline-block mr-2 object-contain"
                    />
                  )}
                  {message.role === "user" ? "나" : `${aiName} · AI`}
                </p>
                <p>{message.content}</p>
              </article>
            ))}
          </div>
          {error && <p role="alert">{error}</p>}
          {atLimit && (
            <section
              role="region"
              aria-label="대화 맥락 한도"
              className="p-4 border rounded-xl"
            >
              <p>
                이번 대화의 맥락 한도에 가까워졌어요. 나눈 원문을 지우고 새
                상담을 시작하거나 상담을 마칠 수 있어요.
              </p>
              <button
                className="min-h-11 px-4 border rounded-lg"
                onClick={clear}
              >
                원문 지우고 마치기
              </button>
            </section>
          )}
          {!atLimit && (
            <div aria-label="답변 선택지" className="flex flex-wrap gap-2">
              {options.map((option) => (
                <button
                  key={option}
                  className="min-h-11 p-3 border rounded-lg"
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
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendText(input);
            }}
            className="space-y-3"
          >
            <label htmlFor="talk-input">전하고 싶은 마음</label>
            <textarea
              id="talk-input"
              ref={inputElement}
              className="w-full p-3 bg-card border rounded-xl"
              maxLength={500}
              rows={4}
              value={input}
              disabled={
                busy ||
                atLimit ||
                authLoading ||
                !characterReady ||
                (!!characterId && !token)
              }
              onChange={(event) => setInput(event.target.value)}
            />
            <p className="text-sm text-muted-foreground break-words">
              {input.length}/500자 · 대화 맥락은 최대 20개 메시지·12,000자예요.
              한도에 도달하면 이전 내용을 자르지 않고 새 상담을 안내해요.
            </p>
            <button
              className="min-h-11 px-6 bg-primary text-primary-foreground rounded-lg"
              disabled={
                busy ||
                !characterReady ||
                atLimit ||
                !input.trim() ||
                authLoading ||
                (!!characterId && !token)
              }
            >
              보내기
            </button>
          </form>
        </>
      )}
      <p className="text-sm text-muted-foreground break-words">
        캐릭터가 기억할 내용은 설정 화면에서 직접 작성하고 확인해 저장할 수
        있어요. 설정으로 이동하면 현재 상담 원문은 사라져요.
      </p>
      {token ? (
        <Link className="underline" href="/characters" onClick={clear}>
          캐릭터 · 승인한 기억 설정
        </Link>
      ) : (
        <button
          className="min-h-11 px-4 border rounded-lg"
          onClick={() => {
            clear();
            login();
          }}
        >
          원문 지우고 로그인 · 레비의 승인한 기억 만들기
        </button>
      )}
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
