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
  CounselorType,
} from "@/lib/api";
import { ChatMessage, ChatPhase, ResponseMode, ResponseModeOption } from "@/types/chat";

// 상담가 유형 정의
const counselorTypes = [
  {
    id: "F" as CounselorType,
    label: "따스한 F 상담가",
    description: "감정적 공감이 필요할 때",
    color: "#E8A0BF",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
    ),
  },
  {
    id: "T" as CounselorType,
    label: "냉철한 T 상담가",
    description: "객관적 조언이 필요할 때",
    color: "#5B8FB9",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
];
import { useCallback, useEffect, useRef, useState } from "react";

const categories = [
  {
    id: "self",
    color: "#7C9885",
    label: "나",
    description: "마음, 감정",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="8" r="4"/>
        <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      </svg>
    )
  },
  {
    id: "future",
    color: "#8BA4B4",
    label: "미래",
    description: "진로, 선택",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
      </svg>
    )
  },
  {
    id: "work",
    color: "#B4A48B",
    label: "일",
    description: "업무, 직장",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/>
      </svg>
    )
  },
  {
    id: "relationship",
    color: "#9B8AA4",
    label: "관계",
    description: "가족, 친구",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="9" cy="7" r="3"/>
        <circle cx="15" cy="7" r="3"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h2m6 0h2a4 4 0 0 1 4 4v2"/>
      </svg>
    )
  },
  {
    id: "love",
    color: "#C49B9B",
    label: "연애",
    description: "사랑, 이별",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
    )
  },
  {
    id: "daily",
    color: "#8B9BAA",
    label: "일상",
    description: "그냥 얘기",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    )
  },
];

type HistoryItem = {
  type: "user" | "assistant";
  content: string;
  isQuestion?: boolean;
};

// 비로그인 사용자 최대 대화 횟수
const MAX_ANONYMOUS_SELECTIONS = 5;

// 로그인 전 세션 상태 저장 키
const SESSION_STATE_KEY = "to-high-pending-session";

export default function Home() {
  const { user, token, isLoading: authLoading, login, logout } = useAuth();

  // 세션 상태
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
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
  const [selectedCounselorType, setSelectedCounselorType] = useState<CounselorType | null>(null);
  const [canRequestFeedback, setCanRequestFeedback] = useState(false);
  const [contextCount, setContextCount] = useState(0);
  const [hasHistory, setHasHistory] = useState(false);
  const [previousSessionSummary, setPreviousSessionSummary] = useState<string | null>(null);
  const [showModeSelection, setShowModeSelection] = useState(false);

  // 한도 도달 에러 상태
  const [limitError, setLimitError] = useState<{
    message: string;
    lastInput: string;
  } | null>(null);

  // 선택 히스토리
  const [selectionHistory, setSelectionHistory] = useState<HistoryItem[]>([]);

  // 스크롤 ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 세션 상태 저장 함수 (로그인 전)
  const saveSessionState = useCallback(() => {
    const stateToSave = {
      sessionId,
      phase,
      question,
      options,
      responseModes,
      selectionHistory,
      selectedCounselorType,
      canRequestFeedback,
      contextCount,
      showModeSelection,
      hasHistory,
      previousSessionSummary,
    };
    localStorage.setItem(SESSION_STATE_KEY, JSON.stringify(stateToSave));
  }, [
    sessionId,
    phase,
    question,
    options,
    responseModes,
    selectionHistory,
    selectedCounselorType,
    canRequestFeedback,
    contextCount,
    showModeSelection,
    hasHistory,
    previousSessionSummary,
  ]);

  // 로그인 후 세션 상태 복원
  useEffect(() => {
    // 로그인 상태가 로딩 중이거나 사용자가 없으면 무시
    if (authLoading || !user) return;

    const savedState = localStorage.getItem(SESSION_STATE_KEY);
    if (!savedState) return;

    try {
      const parsed = JSON.parse(savedState);
      // 세션 ID가 있는 경우에만 복원
      if (parsed.sessionId) {
        setSessionId(parsed.sessionId);
        setPhase(parsed.phase || "selecting");
        setQuestion(parsed.question || "");
        setOptions(parsed.options || []);
        setResponseModes(parsed.responseModes || []);
        setSelectionHistory(parsed.selectionHistory || []);
        setSelectedCounselorType(parsed.selectedCounselorType || null);
        setCanRequestFeedback(parsed.canRequestFeedback || false);
        setContextCount(parsed.contextCount || 0);
        setShowModeSelection(parsed.showModeSelection || false);
        setHasHistory(parsed.hasHistory || false);
        setPreviousSessionSummary(parsed.previousSessionSummary || null);
      }
    } catch (e) {
      console.error("Failed to restore session state:", e);
    } finally {
      // 복원 후 저장된 상태 삭제
      localStorage.removeItem(SESSION_STATE_KEY);
    }
  }, [authLoading, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectionHistory, messages, streamingContent]);

  // 한도 에러 처리
  const handleLimitError = (error: unknown, lastInput: string) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // 한도 관련 에러인지 확인
    if (errorMessage.includes('한도') || errorMessage.includes('너무 깁니다')) {
      setLimitError({ message: errorMessage, lastInput });
      return true;
    }
    return false;
  };

  // 클립보드 복사
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('복사되었습니다. 새 상담에서 붙여넣기 해주세요.');
    } catch {
      alert('복사에 실패했습니다.');
    }
  };

  // 새 상담으로 이동 (에러 해제 포함)
  const handleNewSessionFromError = () => {
    setLimitError(null);
    handleNewSession();
  };

  // 카테고리 선택으로 세션 시작
  const handleCategorySelect = async (categoryId: string) => {
    setIsLoading(true);
    try {
      const res = await startSession(categoryId, token || undefined, selectedCounselorType || undefined);
      setSessionId(res.sessionId);
      setQuestion(res.question);
      setOptions(res.options);
      setCanRequestFeedback(res.canRequestFeedback || false);
      setContextCount(res.contextCount || 0);
      setHasHistory(res.hasHistory || false);
      setPreviousSessionSummary(res.previousSessionSummary || null);
      setPhase("selecting");

      const historyItems: HistoryItem[] = [];

      // 재방문자 환영 메시지
      if (res.hasHistory && res.previousSessionSummary) {
        historyItems.push({
          type: "assistant",
          content: `다시 와주셨네요. 지난번에 "${res.previousSessionSummary}" 이야기를 나눴었죠. 기억하고 있어요.`,
        });
      }

      historyItems.push({
        type: "assistant",
        content: res.question,
        isQuestion: true,
      });

      setSelectionHistory(historyItems);
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
      const res = await startSessionWithText(directInput.trim(), token || undefined, selectedCounselorType || undefined);
      setSessionId(res.sessionId);
      setQuestion(res.question);
      setOptions(res.options);
      setCanRequestFeedback(res.canRequestFeedback || false);
      setContextCount(res.contextCount || 0);
      setHasHistory(res.hasHistory || false);
      setPreviousSessionSummary(res.previousSessionSummary || null);
      setPhase("selecting");

      const historyItems: HistoryItem[] = [];

      // 재방문자 환영 메시지
      if (res.hasHistory && res.previousSessionSummary) {
        historyItems.push({
          type: "assistant",
          content: `다시 와주셨네요. 지난번에 "${res.previousSessionSummary}" 이야기를 나눴었죠. 기억하고 있어요.`,
        });
      }

      historyItems.push({ type: "user", content: directInput.trim() });
      historyItems.push({ type: "assistant", content: res.question, isQuestion: true });

      setSelectionHistory(historyItems);
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

      // 비로그인 사용자 대화 횟수 제한
      if (!user && selectionHistory.length >= MAX_ANONYMOUS_SELECTIONS) {
        setShowLoginPrompt(true);
        return;
      }

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
          // 상담가 유형이 선택된 경우 모드 선택 스킵하고 바로 채팅
          if (selectedCounselorType) {
            setPhase("chatting");
            setStreamingContent("");
            let content = "";
            try {
              await setResponseModeStream(sessionId, "comfort", token || undefined, (chunk) => {
                content += chunk;
                setStreamingContent(content);
              });
              setMessages([{ role: "assistant", content }]);
            } finally {
              setStreamingContent("");
            }
          } else {
            setPhase("mode");
            setResponseModes(res.responseModes);
          }
        } else if (res.question && res.options) {
          newHistoryItems.push({
            type: "assistant",
            content: res.question,
            isQuestion: true,
          });
          setQuestion(res.question);
          setOptions(res.options);
          setCanRequestFeedback(res.canRequestFeedback || false);
          setContextCount(res.contextCount || 0);
        }

        if (newHistoryItems.length > 0) {
          setSelectionHistory(prev => [...prev, ...newHistoryItems]);
        }
      } catch (err) {
        console.error(err);
        handleLimitError(err, selected);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, token, selectedCounselorType, user, selectionHistory.length]
  );

  // 피드백 요청 (지금까지 이야기에 대한 생각 듣기)
  const handleRequestFeedback = useCallback(async () => {
    if (!sessionId) return;

    // 상담가 유형이 선택된 경우 바로 채팅으로 이동
    if (selectedCounselorType) {
      setIsLoading(true);
      setStreamingContent("");
      let content = "";
      try {
        await setResponseModeStream(sessionId, "comfort", token || undefined, (chunk) => {
          content += chunk;
          setStreamingContent(content);
        });
        // 기존 대화 내역을 채팅 메시지로 변환하고 AI 응답 추가
        const previousMessages: ChatMessage[] = selectionHistory.map(item => ({
          role: item.type === "user" ? "user" : "assistant",
          content: item.content,
        }));
        // AI 응답 추가
        previousMessages.push({ role: "assistant", content });
        setMessages(previousMessages);
        setPhase("chatting");
      } finally {
        setStreamingContent("");
        setIsLoading(false);
      }
    } else {
      // 채팅창에서 모드 선택 UI 표시
      setSelectionHistory(prev => [...prev, {
        type: "assistant",
        content: "이야기 잘 들었어요. 어떤 방식이 좋을까요?",
        isQuestion: true,
      }]);
      setShowModeSelection(true);
      setResponseModes([
        { mode: "comfort", label: "그냥 위로해줘", description: "해결책 없이 공감과 위로만 받고 싶어요", emoji: "🤗" },
        { mode: "listen", label: "그냥 들어줘", description: "말없이 들어주기만 해도 돼요", emoji: "👂" },
        { mode: "organize", label: "상황 정리해줘", description: "복잡한 감정과 상황을 정리하고 싶어요", emoji: "📝" },
        { mode: "validate", label: "내가 이상한 건가?", description: "내 감정이 정상인지 확인받고 싶어요", emoji: "🤔" },
        { mode: "direction", label: "뭘 해야 할지 모르겠어", description: "작은 행동 하나만 제안해줘요", emoji: "🧭" },
        { mode: "similar", label: "나만 이런 건가?", description: "비슷한 경험을 한 사람들 이야기가 궁금해요", emoji: "👥" },
      ]);
    }
  }, [sessionId, token, selectedCounselorType, selectionHistory]);

  // 모드 선택 핸들러 (채팅창 내에서) - 같은 채팅창에서 응답 표시 후 채팅 모드로 전환
  const handleSelectModeInChat = useCallback(async (mode: ResponseMode) => {
    if (!sessionId) return;

    const modeLabel = responseModes.find(m => m.mode === mode)?.label || mode;
    setSelectionHistory(prev => [...prev, {
      type: "user",
      content: modeLabel,
      isQuestion: false,
    }]);
    setShowModeSelection(false);
    setIsLoading(true);
    setStreamingContent("");

    let content = "";
    try {
      await setResponseModeStream(sessionId, mode, token || undefined, (chunk) => {
        content += chunk;
        setStreamingContent(content);
      });
      // 기존 대화 내역을 채팅 메시지로 변환하고 AI 응답 추가
      const previousMessages: ChatMessage[] = selectionHistory.map(item => ({
        role: item.type === "user" ? "user" : "assistant",
        content: item.content,
      }));
      // 모드 선택도 추가
      previousMessages.push({ role: "user", content: modeLabel });
      // AI 응답 추가
      previousMessages.push({ role: "assistant", content });
      setMessages(previousMessages);
      setPhase("chatting");
    } finally {
      setStreamingContent("");
      setIsLoading(false);
    }
  }, [sessionId, token, responseModes, selectionHistory]);

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
      handleLimitError(err, userMsg);
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
    setLimitError(null);
    setSelectedCounselorType(null);
    setCanRequestFeedback(false);
    setContextCount(0);
    setHasHistory(false);
    setPreviousSessionSummary(null);
  };

  // 한도 도달 에러 모달 컴포넌트
  const LimitErrorModal = () => {
    if (!limitError) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="max-w-md w-full border-primary/30 bg-card">
          <CardHeader className="space-y-4">
            <CardTitle className="text-lg text-center">
              죄송해요, 잠깐 쉬어가요
            </CardTitle>
            <CardDescription className="text-center text-foreground/70">
              {limitError.message.includes('너무 깁니다')
                ? '입력이 조금 길었어요. 짧게 나눠서 이야기해주시면 좋겠어요.'
                : '대화가 길어졌네요. 새 상담을 시작해서 이어가면 어떨까요?'}
            </CardDescription>
            {limitError.lastInput && (
              <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground mb-2 text-xs">마지막 입력:</p>
                <p className="text-foreground/80 line-clamp-3">{limitError.lastInput}</p>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-2">
              {limitError.lastInput && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => copyToClipboard(limitError.lastInput)}
                >
                  입력 내용 복사하기
                </Button>
              )}
              <Button
                className="w-full"
                onClick={handleNewSessionFromError}
              >
                새 상담 시작하기
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setLimitError(null)}
              >
                계속 둘러보기
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  };

  // 로그인 유도 모달 컴포넌트
  const LoginPromptModal = () => {
    if (!showLoginPrompt) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="max-w-md w-full border-primary/30 bg-card">
          <CardHeader className="space-y-4">
            <CardTitle className="text-lg text-center">
              더 이야기 나눠볼까요?
            </CardTitle>
            <CardDescription className="text-center text-foreground/70">
              로그인하시면 대화 기록이 저장되고,<br />
              다음에 다시 찾아오셔도 기억하고 있을게요.
            </CardDescription>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                className="w-full"
                onClick={() => {
                  setShowLoginPrompt(false);
                  saveSessionState();
                  login();
                }}
              >
                Google로 로그인하기
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setShowLoginPrompt(false)}
              >
                나중에 할게요
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  };

  // 초기 화면 (카테고리 선택)
  if (!sessionId) {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/20">
        {/* 헤더 */}
        <header className="p-4 border-b border-border/30">
          <div className="flex justify-between items-center">
            <Logo size="md" />
            {/* 우상단 로그인 */}
            <div>
              {authLoading ? (
                <div className="h-9 w-20 bg-secondary/50 rounded-lg animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                      {(user.name || user.email)?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-foreground/80 hidden sm:inline">
                      {user.name || user.email.split('@')[0]}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground">
                    로그아웃
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={login} className="border-primary/50 text-primary hover:bg-primary/10">
                  로그인
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 pt-4">
          <div className="max-w-lg w-full space-y-4 sm:space-y-8">
            <div className="text-center space-y-2 sm:space-y-3">
              <p className="text-base sm:text-xl text-foreground/90 tracking-wide" style={{fontFamily: '"Pretendard Variable", Pretendard, sans-serif'}}>
                오늘 하루 어땠어요?
              </p>
              <p className="text-base sm:text-xl text-foreground/90 tracking-wide" style={{fontFamily: '"Pretendard Variable", Pretendard, sans-serif'}}>
                요즘 마음에 걸리는 게 있다면 얘기해줄래요?
              </p>
              {isLoading && (
                <p className="text-sm text-primary animate-pulse">귀 기울여 듣는 중...</p>
              )}
            </div>

            {/* 상담가 유형 선택 */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">원하시는 상담가 유형이 있다면 먼저 선택해보세요!</p>
              <p className="text-xs text-muted-foreground text-center">(선택하지 않아도 괜찮아요)</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {counselorTypes.map((type) => (
                  <button
                    key={type.id}
                    className={`px-3 py-2 rounded-full border text-sm transition-all duration-200 flex items-center gap-1.5 ${
                      selectedCounselorType === type.id
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border/50 hover:border-primary/40 hover:bg-secondary/30"
                    } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
                    onClick={() => setSelectedCounselorType(selectedCounselorType === type.id ? null : type.id)}
                    disabled={isLoading}
                  >
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: type.color }}>
                      {type.icon}
                    </span>
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
              {selectedCounselorType && (
                <p className="text-xs text-primary text-center">
                  {counselorTypes.find(t => t.id === selectedCounselorType)?.description}
                </p>
              )}
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    className={`p-3 sm:p-4 rounded-xl border bg-card text-center transition-all duration-200 hover:border-primary/40 hover:bg-secondary/30 hover:scale-[1.02] ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
                    onClick={() => handleCategorySelect(category.id)}
                    disabled={isLoading}
                  >
                    <div
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full mx-auto mb-1.5 sm:mb-2 flex items-center justify-center text-white"
                      style={{ backgroundColor: category.color }}
                    >
                      {category.icon}
                    </div>
                    <div className="text-xs sm:text-sm font-medium">{category.label}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{category.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2 sm:gap-3 items-stretch">
                <input
                  type="text"
                  value={directInput}
                  onChange={(e) => setDirectInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDirectInputSubmit()}
                  placeholder="마음이 괜찮다면, 직접 얘기해주셔도 좋아요"
                  className="flex-1 px-3 sm:px-4 h-11 sm:h-12 text-sm sm:text-base rounded-xl border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                  disabled={isLoading}
                />
                <Button
                  className="h-11 sm:h-12 px-4 sm:px-6"
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
          </div>
        </div>
      </main>
    );
  }

  // 선택 단계
  if (phase === "selecting") {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/20">
        <header className="p-4 border-b border-border/30">
          <div className="flex justify-between items-center">
            <Logo size="md" />
            <div className="flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                    {(user.name || user.email)?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-foreground/80 hidden sm:inline">
                    {user.name || user.email.split('@')[0]}
                  </span>
                </div>
              )}
              <button
                onClick={handleNewSession}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                새 상담
              </button>
            </div>
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
                  <div className="bg-secondary/50 rounded-2xl px-4 py-3 max-w-[85%]">
                    {streamingContent ? (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{streamingContent}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">귀 기울여 듣는 중...</p>
                    )}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 모드 선택 UI (채팅창 내에서) */}
            {showModeSelection ? (
              <div className="grid gap-3">
                {responseModes.map((modeOption) => {
                  const modeStyle = {
                    comfort: { bg: "bg-rose-100", text: "text-rose-600", label: "위로" },
                    listen: { bg: "bg-sky-100", text: "text-sky-600", label: "경청" },
                    organize: { bg: "bg-amber-100", text: "text-amber-600", label: "정리" },
                    validate: { bg: "bg-violet-100", text: "text-violet-600", label: "확인" },
                    direction: { bg: "bg-emerald-100", text: "text-emerald-600", label: "방향" },
                    similar: { bg: "bg-indigo-100", text: "text-indigo-600", label: "공감" },
                  }[modeOption.mode];
                  return (
                    <button
                      key={modeOption.mode}
                      onClick={() => handleSelectModeInChat(modeOption.mode)}
                      disabled={isLoading}
                      className="w-full p-4 rounded-xl border border-border/50 bg-background hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 text-left disabled:opacity-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full ${modeStyle.bg} ${modeStyle.text} flex items-center justify-center text-xs font-bold shrink-0`}>
                          {modeStyle.label}
                        </div>
                        <div>
                          <p className="font-medium">{modeOption.label}</p>
                          <p className="text-sm text-muted-foreground">{modeOption.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                {/* 피드백 요청 버튼 - 항상 표시, 2번 대화부터 활성화 */}
                <div className="pb-3">
                  <button
                    onClick={handleRequestFeedback}
                    disabled={isLoading || selectionHistory.length < 2}
                    className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-primary/30 text-primary/80 text-sm font-medium transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">💬</span>
                      <span>
                        {selectionHistory.length < 2
                          ? "조금 더 이야기를 나눠볼까요?"
                          : "여기까지 들은 이야기, 제 생각을 말씀드려도 될까요?"}
                      </span>
                    </span>
                  </button>
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
                      placeholder="마음이 괜찮다면, 직접 얘기해주셔도 좋아요"
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
              </>
            )}
          </div>
        </div>
        <LimitErrorModal />
        <LoginPromptModal />
      </main>
    );
  }

  // 모드 선택
  if (phase === "mode") {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/20">
        <header className="p-4 border-b border-border/30">
          <div className="flex justify-between items-center">
            <Logo size="md" />
            <div className="flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                    {(user.name || user.email)?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-foreground/80 hidden sm:inline">
                    {user.name || user.email.split('@')[0]}
                  </span>
                </div>
              )}
              <button
                onClick={handleNewSession}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                새 상담
              </button>
            </div>
          </div>
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
        <header className="border-b border-border/50 p-4 bg-background/80 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <Logo size="sm" />
            <div className="flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-secondary/50">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                    {(user.name || user.email)?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs text-foreground/80 hidden sm:inline">
                    {user.name || user.email.split('@')[0]}
                  </span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleEndSession} disabled={isLoading}>
                여기까지
              </Button>
            </div>
          </div>
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
        <LimitErrorModal />
        <LoginPromptModal />
      </main>
    );
  }

  // 종료
  if (phase === "ended") {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/20">
        <header className="p-4 border-b border-border/30">
          <div className="flex justify-between items-center">
            <Logo size="md" />
            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                  {(user.name || user.email)?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-foreground/80 hidden sm:inline">
                  {user.name || user.email.split('@')[0]}
                </span>
              </div>
            )}
          </div>
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
