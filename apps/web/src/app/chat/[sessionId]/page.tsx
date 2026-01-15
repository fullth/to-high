"use client";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { endSession, selectOption, sendMessage, setResponseMode } from "@/lib/api";
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
      try {
        const res = await selectOption(sessionId, selected, token || undefined);

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

  const handleSelectMode = useCallback(
    async (mode: string) => {
      setIsLoading(true);
      try {
        const res = await setResponseMode(sessionId, mode, token || undefined);
        setPhase("chatting");
        setMessages([{ role: "assistant", content: res.response }]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
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

    try {
      const res = await sendMessage(sessionId, userMsg, token || undefined);
      setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
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
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">{question}</p>
          </div>

          <div className="grid gap-3">
            {options.map((option, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="w-full h-auto py-4 text-left justify-start whitespace-normal"
                onClick={() => handleSelectOption(option)}
                disabled={isLoading}
              >
                {option}
              </Button>
            ))}
          </div>

          {isLoading && (
            <p className="text-center text-muted-foreground text-sm">생각 중...</p>
          )}
        </div>
      </main>
    );
  }

  if (phase === "mode") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">어떤 도움이 필요하세요?</h2>
            <p className="text-muted-foreground text-sm">
              상황을 충분히 파악했어요. 원하는 방식을 선택해주세요.
            </p>
          </div>

          <div className="grid gap-3">
            {responseModes.map((rm) => (
              <Card
                key={rm.mode}
                className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                onClick={() => handleSelectMode(rm.mode)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">{rm.label}</CardTitle>
                  <CardDescription>{rm.description}</CardDescription>
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
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
        <header className="border-b p-4 flex justify-between items-center">
          <h1 className="font-semibold">상담 중</h1>
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
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3">
                <p className="text-sm text-muted-foreground">입력 중...</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50"
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
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">상담이 종료되었습니다</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">요약</CardTitle>
              <CardDescription className="whitespace-pre-wrap">{summary}</CardDescription>
            </CardHeader>
          </Card>

          <Button className="w-full" onClick={() => router.push("/")}>
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
