"use client";

import "@/components/chat/chat.css";
import { useAuth } from "@/contexts/auth-context";
import { endSession, saveSession, selectOptionStream, setResponseModeStream, sendMessageStream } from "@/lib/api";
import { ChatMessage, ChatPhase, ResponseModeOption } from "@/types/chat";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

function ChatContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, login } = useAuth();

  const sessionId = params.sessionId as string;

  const [phase, setPhase] = useState<ChatPhase>("selecting");
  const [, setQuestion] = useState<string>("");
  const [options, setOptions] = useState<string[]>([]);
  const [responseModes, setResponseModes] = useState<ResponseModeOption[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [crisisMessage, setCrisisMessage] = useState<string | null>(null);
  const [supplementInput, setSupplementInput] = useState("");
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // 선택 히스토리를 저장 (대화 형태로 보여주기 위함)
  const [selectionHistory, setSelectionHistory] = useState<Array<{
    type: "user" | "assistant";
    content: string;
    isQuestion?: boolean;
    options?: string[];
  }>>([]);

  // 스크롤 자동 이동을 위한 ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 대화 내용이 변경되면 스크롤 이동
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectionHistory, messages, streamingContent]);

  useEffect(() => {
    const q = searchParams.get("question");
    const opts = searchParams.get("options");

    if (q && opts) {
      const parsedOptions = JSON.parse(opts);
      setQuestion(q);
      setOptions(parsedOptions);
      // 초기 질문을 히스토리에 추가
      setSelectionHistory([{
        type: "assistant",
        content: q,
        isQuestion: true,
        options: parsedOptions,
      }]);
    }
  }, [searchParams]);

  const handleSelectOption = useCallback(
    async (selected: string) => {
      setIsLoading(true);
      setSupplementInput("");

      // 사용자 선택을 히스토리에 추가
      setSelectionHistory(prev => [...prev, {
        type: "user",
        content: selected,
      }]);

      try {
        let metadata: any = null;
        let contextSummary = "";
        let streamedQuestion = "";
        let streamedQuestionAdded = false;

        await selectOptionStream(
          sessionId,
          selected,
          token || undefined,
          (chunk) => {
            if (chunk.type === "metadata") {
              metadata = chunk;
              if (chunk.isCrisis && chunk.crisisMessage) {
                setCrisisMessage(chunk.crisisMessage);
              }
            } else if (chunk.type === "contextSummary") {
              contextSummary = chunk.content;
              setSelectionHistory(prev => [...prev, {
                type: "assistant",
                content: contextSummary,
              }]);
            } else if (chunk.type === "question_chunk") {
              streamedQuestion += chunk.content;
              if (!streamedQuestionAdded) {
                streamedQuestionAdded = true;
                setSelectionHistory(prev => [...prev, {
                  type: "assistant",
                  content: streamedQuestion,
                  isQuestion: true,
                  options: [],
                }]);
              } else {
                setSelectionHistory(prev => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last && last.isQuestion) {
                    next[next.length - 1] = { ...last, content: streamedQuestion };
                  }
                  return next;
                });
              }
            } else if (chunk.type === "next") {
              setQuestion(chunk.question);
              setOptions(chunk.options);
              setSelectionHistory(prev => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.isQuestion) {
                  next[next.length - 1] = {
                    ...last,
                    content: chunk.question,
                    options: chunk.options,
                  };
                }
                return next;
              });
              const modes = chunk.responseModes || metadata?.responseModes;
              if (chunk.canProceedToResponse && modes) {
                setResponseModes(modes);
                setPhase(token ? "mode" : "loginWall");
              }
            }
          },
        );

        if (metadata?.isCrisis && metadata.canProceedToResponse && metadata.responseModes && !streamedQuestionAdded) {
          setResponseModes(metadata.responseModes);
          setPhase(token ? "mode" : "loginWall");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, token]
  );

  const handleSupplementSubmit = useCallback(async () => {
    if (!supplementInput.trim()) return;
    await handleSelectOption(supplementInput.trim());
  }, [supplementInput, handleSelectOption]);

  const handleSelectMode = useCallback(
    async (mode: string) => {
      setIsLoading(true);
      setPhase("chatting");
      setStreamingContent("");

      let content = "";
      try {
        await setResponseModeStream(
          sessionId,
          mode,
          token || undefined,
          (chunk) => {
            content += chunk;
            setStreamingContent(content);
          }
        );
        setMessages([{ role: "assistant", content }]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
        setStreamingContent("");
      }
    },
    [sessionId, token]
  );

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;

    setIsLoading(true);
    const userMsg = inputMessage;
    setInputMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setStreamingContent("");

    let content = "";
    try {
      await sendMessageStream(
        sessionId,
        userMsg,
        token || undefined,
        (chunk) => {
          content += chunk;
          setStreamingContent(content);
        }
      );
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  }, [sessionId, token, inputMessage]);

  const handleEndSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await endSession(sessionId, token || undefined);
      setPhase("ended");
      setSummary(res.summary || "상담이 종료되었습니다.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, token]);

  if (phase === "selecting" || phase === "mode" || phase === "loginWall") {
    const dockHidden = phase !== "selecting";
    return (
      <main className="ch-frame" style={{ height: "100vh" }}>
        <div className="ch-inner">
          <header className="ch-header">
            <span className="ch-logo">
              <span className="ch-logo-mark" aria-hidden="true" />
              위로 <span className="ch-logo-sub">To High</span>
            </span>
            <button type="button" className="ch-ghostbtn" onClick={() => router.push("/")}>홈으로</button>
          </header>

          <div className="ch-messages anchor-end">
            {selectionHistory.map((item, idx) => (
              <div key={idx} className={`ch-row ${item.type === "user" ? "user" : ""} no-anim`}>
                <div className={`ch-bubble ${item.type === "user" ? "user" : "ai"}`}>
                  {item.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="ch-row">
                <div className="ch-typing">
                  <i /><i /><i />
                  <span className="ch-typing-text">귀 기울여 듣는 중...</span>
                </div>
              </div>
            )}

            {phase === "mode" && (
              <>
                {crisisMessage && (
                  <div className="ch-inline-card" style={{ borderColor: "rgba(239,68,68,0.4)" }}>
                    <span className="ch-wall-eyebrow" style={{ color: "#ef4444" }}>도움이 필요하신가요?</span>
                    <p style={{ color: "#fca5a5", whiteSpace: "pre-wrap", margin: 0 }}>{crisisMessage}</p>
                  </div>
                )}
                <div className="ch-row">
                  <div className="ch-bubble ai">이야기 잘 들었어요. 어떤 방식이 좋을까요?</div>
                </div>
                <div className="ch-inline-card">
                  <span className="ch-wall-eyebrow">이야기 받는 방식</span>
                  <div className="ch-inline-modes">
                    {responseModes.map((rm) => (
                      <button
                        type="button"
                        key={rm.mode}
                        className="ch-inline-mode"
                        onClick={() => handleSelectMode(rm.mode)}
                        disabled={isLoading}
                      >
                        <div className="ch-mode-label">{rm.label}</div>
                        <div className="ch-mode-desc">{rm.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {phase === "loginWall" && (
              <>
                <div className="ch-row">
                  <div className="ch-bubble ai">
                    여기까지 나눈 마음, 잃어버리지 않게 잠깐 자리를 만들어볼게요.
                  </div>
                </div>
                <div className="ch-inline-card">
                  <span className="ch-wall-eyebrow">함께 이어가기</span>
                  <h2 className="ch-wall-h">조금 더 깊이 이야기 나눠볼까요?</h2>
                  <p className="ch-wall-sub">
                    로그인하시면 다음에도 이 흐름을 이어갈 수 있어요.
                  </p>
                  <div className="ch-wall-actions">
                    <button type="button" className="ch-primary" onClick={() => login()}>
                      로그인하고 이어가기
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="ch-secondary"
                      onClick={() => setPhase("mode")}
                    >
                      로그인 없이 이어가기
                    </button>
                  </div>
                </div>
              </>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className={`ch-dock${dockHidden ? " fade-out" : ""}`}>
            {options.length > 0 && (
              <>
                <div className="ch-dock-label">마음에 가까운 쪽으로</div>
                <div className="ch-options">
                  {options.map((option, idx) => (
                    <button
                      type="button"
                      key={idx}
                      className="ch-option"
                      onClick={() => handleSelectOption(option)}
                      disabled={isLoading}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="ch-input-row">
              <input
                type="text"
                className="ch-input"
                value={supplementInput}
                onChange={(e) => setSupplementInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSupplementSubmit()}
                placeholder="직접 말씀해 주셔도 좋아요..."
                disabled={isLoading || dockHidden}
              />
              <button
                type="button"
                className="ch-send"
                onClick={handleSupplementSubmit}
                disabled={isLoading || dockHidden || !supplementInput.trim()}
              >
                전송
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "chatting") {
    return (
      <main className="ch-frame" style={{ height: "100vh" }}>
        <div className="ch-inner">
          <header className="ch-header">
            <span className="ch-status">
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", animation: "chatPulse 2.2s ease infinite" }} />
              이야기 중
            </span>
            <button
              type="button"
              className="ch-ghostbtn"
              onClick={handleEndSession}
              disabled={isLoading}
            >
              여기까지
            </button>
          </header>

          <div className="ch-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`ch-row ${msg.role === "user" ? "user" : ""}`}>
                <div className={`ch-bubble ${msg.role === "user" ? "user" : "ai glow"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && streamingContent && (
              <div className="ch-row">
                <div className="ch-bubble ai glow">
                  {streamingContent}
                  <span className="ch-caret" />
                </div>
              </div>
            )}
            {isLoading && !streamingContent && (
              <div className="ch-row">
                <div className="ch-typing">
                  <i /><i /><i />
                  <span className="ch-typing-text">귀 기울여 듣는 중...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="ch-dock">
            <div className="ch-input-row">
              <input
                type="text"
                className="ch-input"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                placeholder="마음을 적어보세요..."
                disabled={isLoading}
              />
              <button
                type="button"
                className="ch-send"
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
              >
                전송
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "ended") {
    return (
      <main className="ch-frame" style={{ height: "100vh" }}>
        <div className="ch-inner">
          <header className="ch-header">
            <span className="ch-logo">
              <span className="ch-logo-mark" aria-hidden="true" />
              위로 <span className="ch-logo-sub">To High</span>
            </span>
          </header>

          <div className="ch-messages anchor-end">
            {messages.map((msg, idx) => (
              <div key={idx} className={`ch-row ${msg.role === "user" ? "user" : ""} no-anim`}>
                <div className={`ch-bubble ${msg.role === "user" ? "user" : "ai"}`}>
                  {msg.content}
                </div>
              </div>
            ))}

            <div className="ch-row">
              <div className="ch-bubble ai">오늘 이야기는 여기까지. 이야기 나눠주셔서 고마워요.</div>
            </div>

            <div className="ch-inline-end">
              {summary && (
                <>
                  <span className="ch-wall-eyebrow">오늘 나눈 이야기</span>
                  <div className="ch-summary-title" style={{ whiteSpace: "pre-wrap" }}>{summary}</div>
                </>
              )}
              {!token && (
                <p className="ch-wall-fineprint" style={{ textAlign: "left", marginTop: 4 }}>
                  로그인하면 다음에도 이 이야기를 다시 꺼내볼 수 있어요.
                </p>
              )}
              <div className="ch-wall-actions">
                <button type="button" className="ch-primary" onClick={() => router.push("/")}>
                  다시 이야기하기
                </button>
                {token ? (
                  <button
                    type="button"
                    className={`ch-secondary${saveState === "saved" ? " saved" : ""}`}
                    disabled={saveState === "saving" || saveState === "saved"}
                    onClick={async () => {
                      if (!token) return;
                      setSaveState("saving");
                      try {
                        await saveSession(sessionId, token);
                        setSaveState("saved");
                      } catch {
                        setSaveState("error");
                      }
                    }}
                  >
                    {saveState === "saved" ? (
                      <>
                        <span aria-hidden="true" style={{ marginRight: 6 }}>✓</span>
                        저장되었어요
                      </>
                    ) : saveState === "saving" ? (
                      "저장 중..."
                    ) : saveState === "error" ? (
                      "다시 시도"
                    ) : (
                      "대화 기록 저장하기"
                    )}
                  </button>
                ) : (
                  <button type="button" className="ch-secondary" onClick={() => login()}>
                    로그인하고 저장하기
                  </button>
                )}
              </div>
            </div>

            <div ref={chatEndRef} />
          </div>

          <div className="ch-dock fade-out" aria-hidden="true" />
        </div>
      </main>
    );
  }

  return null;
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
