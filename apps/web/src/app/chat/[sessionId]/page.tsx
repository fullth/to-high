"use client";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { endSession, selectOption, setResponseModeStream, sendMessageStream } from "@/lib/api";
import { ChatMessage, ChatPhase, ResponseModeOption } from "@/types/chat";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

function ChatContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();

  const sessionId = params.sessionId as string;

  const [phase, setPhase] = useState<ChatPhase>("selecting");
  const [question, setQuestion] = useState<string>("");
  const [options, setOptions] = useState<string[]>([]);
  const [responseModes, setResponseModes] = useState<ResponseModeOption[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [crisisMessage, setCrisisMessage] = useState<string | null>(null);
  const [supplementInput, setSupplementInput] = useState("");
  const [contextSummary, setContextSummary] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>("");

  useEffect(() => {
    const q = searchParams.get("question");
    const opts = searchParams.get("options");

    if (q && opts) {
      setQuestion(q);
      setOptions(JSON.parse(opts));
    }
  }, [searchParams]);

  const handleSelectOption = useCallback(
    async (selected: string) => {
      setIsLoading(true);
      setSupplementInput("");
      setContextSummary(null);
      try {
        const res = await selectOption(sessionId, selected, token || undefined);

        if (res.isCrisis && res.crisisMessage) {
          setCrisisMessage(res.crisisMessage);
        }

        if (res.contextSummary) {
          setContextSummary(res.contextSummary);
        }

        if (res.canProceedToResponse && res.responseModes) {
          setPhase("mode");
          setResponseModes(res.responseModes);
        } else if (res.question && res.options) {
          setQuestion(res.question);
          setOptions(res.options);
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

  if (phase === "selecting") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-background to-secondary/20">
        <div className="max-w-lg w-full space-y-8">
          {/* 컨텍스트 요약 (말하기 어려워요 선택 시) */}
          {contextSummary && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="p-4">
                <CardDescription className="text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {contextSummary}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-foreground/90">{question}</p>
          </div>

          <div className="grid gap-3">
            {options.map((option, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="w-full h-auto py-4 text-left justify-start whitespace-normal transition-all duration-200 hover:border-primary/40 hover:bg-secondary/30"
                onClick={() => handleSelectOption(option)}
                disabled={isLoading}
              >
                {option}
              </Button>
            ))}
          </div>

          {/* 직접 입력 - 홈과 동일한 스타일 */}
          <div className="flex gap-3 items-stretch">
            <input
              type="text"
              value={supplementInput}
              onChange={(e) => setSupplementInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSupplementSubmit()}
              placeholder="직접 이야기하기..."
              className="flex-1 px-4 h-12 text-base rounded-xl border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
              disabled={isLoading}
            />
            <Button
              className="h-12 px-6"
              onClick={handleSupplementSubmit}
              disabled={isLoading || !supplementInput.trim()}
            >
              전송
            </Button>
          </div>

          {isLoading && (
            <p className="text-center text-muted-foreground text-sm">생각 중...</p>
          )}

          {/* 홈으로 돌아가기 */}
          <div className="pt-4">
            <button
              onClick={() => router.push("/")}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "mode") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-background to-secondary/20">
        <div className="max-w-md w-full space-y-6">
          {crisisMessage && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="p-4">
                <CardTitle className="text-lg text-destructive flex items-center gap-2">
                  <span>도움이 필요하신가요?</span>
                </CardTitle>
                <CardDescription className="text-destructive/80 whitespace-pre-wrap">
                  {crisisMessage}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <div className="text-center space-y-2">
            <h2 className="text-xl font-medium text-foreground/90">어떤 도움이 필요하세요?</h2>
            <p className="text-muted-foreground text-sm">
              상황을 충분히 파악했어요. 원하는 방식을 선택해주세요.
            </p>
          </div>

          <div className="grid gap-3">
            {responseModes.map((rm) => (
              <Card
                key={rm.mode}
                className="cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-sm hover:bg-card/80"
                onClick={() => handleSelectMode(rm.mode)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <span>{rm.emoji}</span>
                    <span>{rm.label}</span>
                  </CardTitle>
                  <CardDescription className="text-sm">{rm.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {isLoading && (
            <p className="text-center text-muted-foreground text-sm">준비 중...</p>
          )}
        </div>
      </main>
    );
  }

  if (phase === "chatting") {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/10">
        <header className="border-b border-border/50 p-4 flex justify-between items-center bg-background/80 backdrop-blur-sm">
          <h1 className="font-medium text-foreground/90">상담 중</h1>
          <Button variant="outline" size="sm" onClick={handleEndSession} disabled={isLoading}>
            상담 종료
          </Button>
        </header>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-foreground/90"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {/* 스트리밍 중인 응답 표시 */}
          {isLoading && streamingContent && (
            <div className="flex justify-start">
              <div className="bg-secondary/50 rounded-2xl px-4 py-3 max-w-[80%]">
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {streamingContent}
                  <span className="animate-pulse">▋</span>
                </p>
              </div>
            </div>
          )}
          {/* 로딩 중이지만 아직 스트리밍 시작 전 */}
          {isLoading && !streamingContent && (
            <div className="flex justify-start">
              <div className="bg-secondary/50 rounded-2xl px-4 py-3">
                <p className="text-sm text-muted-foreground">입력 중...</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/50 p-4 bg-background/80 backdrop-blur-sm">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-4 py-2 border border-border/50 rounded-full bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={isLoading || !inputMessage.trim()}>
              전송
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "ended") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-background to-secondary/20">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-medium text-foreground/90">상담이 종료되었습니다</h2>
            <p className="text-muted-foreground text-sm">오늘 이야기 나눠주셔서 감사해요.</p>
          </div>

          <Card className="border-primary/20 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base font-medium">요약</CardTitle>
              <CardDescription className="whitespace-pre-wrap text-foreground/80 leading-relaxed">{summary}</CardDescription>
            </CardHeader>
          </Card>

          <Button className="w-full transition-all" onClick={() => router.push("/")}>
            홈으로 돌아가기
          </Button>
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
