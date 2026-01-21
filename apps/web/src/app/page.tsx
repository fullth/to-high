"use client";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import {
  startSession,
  startSessionWithText,
  selectOption,
  setResponseModeStream,
  sendMessageStream,
  endSession,
  SelectOptionResponse,
} from "@/lib/api";
import { ChatMessage, ChatPhase, ResponseModeOption } from "@/types/chat";
import { useCallback, useEffect, useRef, useState } from "react";

const categories = [
  { id: "self", icon: "🪞", label: "나 자신", description: "마음, 감정, 생각" },
  { id: "future", icon: "🌱", label: "미래", description: "진로, 목표, 선택" },
  { id: "work", icon: "💼", label: "일·회사", description: "업무, 직장생활" },
  { id: "relationship", icon: "👥", label: "관계", description: "가족, 친구, 지인" },
  { id: "love", icon: "💕", label: "연애", description: "썸, 연인, 이별" },
  { id: "daily", icon: "🌙", label: "일상", description: "그냥 이야기하고 싶어" },
];

type HistoryItem = {
  type: "user" | "assistant";
  content: string;
  isQuestion?: boolean;
};

export default function Home() {
  const { user, token, isLoading: authLoading, login, logout } = useAuth();

  // 세션 상태
  const [sessionId, setSessionId] = useState<string | null>(null);
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
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [directInput, setDirectInput] = useState("");

  // 선택 히스토리
  const [selectionHistory, setSelectionHistory] = useState<HistoryItem[]>([]);

  // 스크롤 ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectionHistory, messages, streamingContent]);

  // 카테고리 선택으로 세션 시작
  const handleCategorySelect = async (categoryId: string) => {
    setIsLoading(true);
    try {
      const res = await startSession(categoryId, token || undefined);
      setSessionId(res.sessionId);
      setQuestion(res.question);
      setOptions(res.options);
      setPhase("selecting");
      setSelectionHistory([{
        type: "assistant",
        content: res.question,
        isQuestion: true,
      }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 직접 입력으로 세션 시작
  const handleDirectInputSubmit = async () => {
    if (!directInput.trim()) return;
    setIsLoading(true);
    try {
      const res = await startSessionWithText(directInput.trim(), token || undefined);
      setSessionId(res.sessionId);
      setQuestion(res.question);
      setOptions(res.options);
      setPhase("selecting");
      setSelectionHistory([
        { type: "user", content: directInput.trim() },
        { type: "assistant", content: res.question, isQuestion: true },
      ]);
      setDirectInput("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 옵션 선택
  const handleSelectOption = useCallback(
    async (selected: string) => {
      if (!sessionId) return;
      setIsLoading(true);
      setSupplementInput("");

      setSelectionHistory(prev => [...prev, { type: "user", content: selected }]);

      try {
        const res: SelectOptionResponse = await selectOption(sessionId, selected, token || undefined);

        if (res.isCrisis && res.crisisMessage) {
          setCrisisMessage(res.crisisMessage);
        }

        const newHistoryItems: HistoryItem[] = [];

        if (res.empathyComment) {
          newHistoryItems.push({ type: "assistant", content: res.empathyComment });
        }

        if (res.contextSummary) {
          newHistoryItems.push({ type: "assistant", content: res.contextSummary });
        }

        if (res.canProceedToResponse && res.responseModes) {
          setPhase("mode");
          setResponseModes(res.responseModes);
        } else if (res.question && res.options) {
          newHistoryItems.push({
            type: "assistant",
            content: res.question,
            isQuestion: true,
          });
          setQuestion(res.question);
          setOptions(res.options);
        }

        if (newHistoryItems.length > 0) {
          setSelectionHistory(prev => [...prev, ...newHistoryItems]);
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

  // 모드 선택
  const handleSelectMode = useCallback(
    async (mode: string) => {
      if (!sessionId) return;
      setIsLoading(true);
      setPhase("chatting");
      setStreamingContent("");

      let content = "";
      try {
        await setResponseModeStream(sessionId, mode, token || undefined, (chunk) => {
          content += chunk;
          setStreamingContent(content);
        });
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

  // 메시지 전송
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !sessionId) return;

    setIsLoading(true);
    const userMsg = inputMessage;
    setInputMessage("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setStreamingContent("");

    let content = "";
    try {
      await sendMessageStream(sessionId, userMsg, token || undefined, (chunk) => {
        content += chunk;
        setStreamingContent(content);
      });
      setMessages(prev => [...prev, { role: "assistant", content }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  }, [sessionId, token, inputMessage]);

  // 세션 종료
  const handleEndSession = useCallback(async () => {
    if (!sessionId) return;
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

  // 새 상담 시작
  const handleNewSession = () => {
    setSessionId(null);
    setPhase("selecting");
    setQuestion("");
    setOptions([]);
    setResponseModes([]);
    setMessages([]);
    setSummary("");
    setSelectionHistory([]);
    setCrisisMessage(null);
    setStreamingContent("");
  };

  // 초기 화면 (카테고리 선택)
  if (!sessionId) {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/20">
        {/* 헤더 */}
        <header className="p-4 flex justify-between items-center">
          <Logo size="md" />
          {/* 우상단 로그인 */}
          <div>
            {authLoading ? (
              <Button variant="outline" size="sm" disabled>
                로딩 중...
              </Button>
            ) : user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
                <Button variant="outline" size="sm" onClick={logout}>
                  로그아웃
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">대화 저장 오픈 예정</span>
                <Button variant="outline" size="sm" onClick={login} className="border-primary/50 text-primary hover:bg-primary/10">
                  로그인
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-lg w-full space-y-8">
            <div className="text-center space-y-3">
              <p className="text-lg text-muted-foreground">
                오늘 하루 어땠어요?
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                요즘 마음에 걸리는 게 있다면 얘기해줄래요?
              </p>
              <div className="grid grid-cols-3 gap-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    className={`p-4 rounded-xl border bg-card text-center transition-all duration-200 hover:border-primary/40 hover:bg-secondary/30 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
                    onClick={() => handleCategorySelect(category.id)}
                    disabled={isLoading}
                  >
                    <div className="text-2xl mb-1">{category.icon}</div>
                    <div className="text-sm font-medium">{category.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{category.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex gap-3 items-stretch">
                <input
                  type="text"
                  value={directInput}
                  onChange={(e) => setDirectInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDirectInputSubmit()}
                  placeholder="직접 이야기하기..."
                  className="flex-1 px-4 h-12 text-base rounded-xl border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                  disabled={isLoading}
                />
                <Button
                  className="h-12 px-6"
                  onClick={handleDirectInputSubmit}
                  disabled={isLoading || !directInput.trim()}
                >
                  시작
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                하고 싶은 말이 있으면 편하게 적어주세요
              </p>
            </div>

            {isLoading && (
              <p className="text-center text-muted-foreground text-sm">귀 기울여 듣는 중...</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  // 선택 단계
  if (phase === "selecting") {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/20">
        <header className="p-4 flex justify-between items-center">
          <Logo size="md" />
          <div className="flex items-center gap-2">
            {user && (
              <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            )}
            <button
              onClick={handleNewSession}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              새 상담
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-lg w-full space-y-6">
            {/* 대화 히스토리 */}
            <div className="space-y-4 max-h-[40vh] overflow-auto">
              {selectionHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex ${item.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      item.type === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 text-foreground/90"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{item.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary/50 rounded-2xl px-4 py-3">
                    <p className="text-sm text-muted-foreground">귀 기울여 듣는 중...</p>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 옵션 */}
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

            {/* 직접 입력 */}
            <div className="space-y-2">
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
              <p className="text-xs text-muted-foreground text-center">
                말하기 어려우면 버튼만 눌러도 돼요
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 모드 선택
  if (phase === "mode") {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/20">
        <header className="p-4 flex justify-between items-center">
          <Logo size="md" />
          <button
            onClick={handleNewSession}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            새 상담
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
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
              <h2 className="text-xl font-medium text-foreground/90">어떻게 이야기할까요?</h2>
              <p className="text-muted-foreground text-sm">
                이야기 잘 들었어요. 어떤 방식이 좋을까요?
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
              <p className="text-center text-muted-foreground text-sm">귀 기울여 듣는 중...</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  // 채팅 중
  if (phase === "chatting") {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/10">
        <header className="border-b border-border/50 p-4 flex justify-between items-center bg-background/80 backdrop-blur-sm">
          <Logo size="sm" />
          <Button variant="outline" size="sm" onClick={handleEndSession} disabled={isLoading}>
            여기까지
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
          {isLoading && !streamingContent && (
            <div className="flex justify-start">
              <div className="bg-secondary/50 rounded-2xl px-4 py-3">
                <p className="text-sm text-muted-foreground">귀 기울여 듣는 중...</p>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t border-border/50 p-4 bg-background/80 backdrop-blur-sm">
          <div className="flex gap-2 max-w-2xl mx-auto">
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

  // 종료
  if (phase === "ended") {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/20">
        <header className="p-4 flex justify-between items-center">
          <Logo size="md" />
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-medium text-foreground/90">오늘 이야기는 여기까지</h2>
              <p className="text-muted-foreground text-sm">이야기 나눠줘서 고마워요. 언제든 다시 와요.</p>
            </div>

            <Card className="border-primary/20 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base font-medium">오늘 나눈 이야기</CardTitle>
                <CardDescription className="whitespace-pre-wrap text-foreground/80 leading-relaxed">
                  {summary}
                </CardDescription>
              </CardHeader>
            </Card>

            <Button className="w-full transition-all" onClick={handleNewSession}>
              다시 이야기하기
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
