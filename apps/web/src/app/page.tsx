"use client";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import {
  startSession,
  startSessionWithText,
  summarizeText,
  startSessionWithImportSummary,
  selectOption,
  setResponseModeStream,
  sendMessageStream,
  endSession,
  getSessions,
  resumeSession,
  saveSession,
  updateSessionAlias,
  deleteSession,
  trackVisitor,
  getPublicStats,
  SelectOptionResponse,
  SessionListItem,
  CounselorType,
  PublicStats,
} from "@/lib/api";
import { ChatMessage, ChatPhase, ResponseMode, ResponseModeOption } from "@/types/chat";

// 상위 상담 모드 정의
type TopLevelMode = "mbti" | "reaction" | "listening" | null;

const topLevelModes = [
  {
    id: "mbti" as TopLevelMode,
    label: "MBTI 성향 상담",
    description: "성향 맞춤 대화",
    color: "#6366F1",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a7 7 0 0 0 0 14 7 7 0 0 0 0-14" />
        <path d="M12 8v8" />
        <path d="M8 12h8" />
      </svg>
    ),
  },
  {
    id: "reaction" as TopLevelMode,
    label: "따뜻한 공감",
    description: "진심 어린 호응으로",
    color: "#9B8AA4",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "listening" as TopLevelMode,
    label: "깊은 경청",
    description: "당신의 모든 이야기를",
    color: "#7C9885",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
];

// MBTI 하위 선택 (T/F)
const mbtiSubTypes = [
  {
    id: "F" as CounselorType,
    label: "F 감정형",
    description: "따뜻한 위로가 필요해요",
    color: "#E8A0BF",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
  },
  {
    id: "T" as CounselorType,
    label: "T 사고형",
    description: "현실적인 조언이 필요해요",
    color: "#5B8FB9",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
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
        <circle cx="12" cy="8" r="4" />
        <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
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
        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
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
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
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
        <circle cx="9" cy="7" r="3" />
        <circle cx="15" cy="7" r="3" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h2m6 0h2a4 4 0 0 1 4 4v2" />
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
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
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
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    )
  },
];

type HistoryItem = {
  type: "user" | "assistant" | "system";
  content: string;
  isQuestion?: boolean;
  timestamp?: Date;
};

// 시간 경과 표시 함수
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

// 비로그인 사용자 최대 대화 횟수
const MAX_ANONYMOUS_SELECTIONS = 10;

// 마음 돌봄 콘텐츠 데이터
const mindfulnessContents = [
  {
    type: "quote",
    content: "당신은 지금 이 순간에도 충분히 잘하고 있어요.",
    author: "To High; 위로",
  },
  {
    type: "tip",
    title: "오늘의 마음 돌봄",
    content: "깊게 숨을 들이쉬고, 천천히 내쉬어 보세요. 지금 이 순간에 집중해보세요.",
  },
  {
    type: "quote",
    content: "완벽하지 않아도 괜찮아요. 그게 바로 당신이니까요.",
    author: "To High; 위로",
  },
  {
    type: "tip",
    title: "잠깐, 쉬어가세요",
    content: "지금 어깨에 힘이 들어가 있진 않나요? 한번 툭 내려놓아 보세요.",
  },
  {
    type: "quote",
    content: "힘든 감정도 당신의 일부예요. 느끼는 대로 느껴도 돼요.",
    author: "To High; 위로",
  },
  {
    type: "tip",
    title: "나를 위한 시간",
    content: "오늘 하루 중 잠깐이라도 나를 위한 시간을 가져보세요.",
  },
  {
    type: "quote",
    content: "비 온 뒤에 땅이 굳듯, 힘든 시간은 당신을 더 단단하게 해줄 거예요.",
    author: "To High; 위로",
  },
  {
    type: "tip",
    title: "작은 실천",
    content: "오늘 나에게 '수고했어'라고 말해주세요. 작은 위로가 큰 힘이 됩니다.",
  },
];

// 마음 돌봄 카드 컴포넌트
function MindfulnessCard() {
  const [contentIndex, setContentIndex] = useState(0);

  useEffect(() => {
    // 페이지 로드 시 랜덤 콘텐츠 선택
    setContentIndex(Math.floor(Math.random() * mindfulnessContents.length));
  }, []);

  const content = mindfulnessContents[contentIndex];
  const nextContent = () => {
    setContentIndex((prev) => (prev + 1) % mindfulnessContents.length);
  };

  return (
    <div className="rounded-2xl border border-accent/50 bg-accent/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground/90 flex items-center gap-2">
          <span className="text-base">🌿</span>
          마음 한 스푼
        </p>
        <button
          onClick={nextContent}
          className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          title="다음 글"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {content.type === "quote" ? (
        <div className="space-y-2">
          <p className="text-sm leading-relaxed text-foreground/80 italic">
            "{content.content}"
          </p>
          <p className="text-xs text-muted-foreground text-right">
            — {content.author}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-xs font-medium text-primary">{content.title}</p>
          <p className="text-sm leading-relaxed text-foreground/80">
            {content.content}
          </p>
        </div>
      )}
    </div>
  );
}

// 로그인 전 세션 상태 저장 키
const SESSION_STATE_KEY = "to-high-pending-session";

export default function Home() {
  const { user, token, isLoading: authLoading, login, loginWithKakao, logout } = useAuth();

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
  const [selectedTopMode, setSelectedTopMode] = useState<TopLevelMode>(null);
  const [canRequestFeedback, setCanRequestFeedback] = useState(false);
  const [contextCount, setContextCount] = useState(0);
  const [hasHistory, setHasHistory] = useState(false);
  const [previousSessionSummary, setPreviousSessionSummary] = useState<string | null>(null);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [isLoadingNewOptions, setIsLoadingNewOptions] = useState(false);

  // 상담 기록 목록 (진행 중 + 저장된 상담 통합)
  const [previousSessions, setPreviousSessions] = useState<SessionListItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isSwitchingSession, setIsSwitchingSession] = useState(false);

  // 세션 별칭 수정 상태
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingAlias, setEditingAlias] = useState("");

  // 저장 관련 상태
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveType, setSaveType] = useState<"category" | "custom" | null>(null);
  const [customSaveName, setCustomSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // 한도 도달 에러 상태
  const [limitError, setLimitError] = useState<{
    message: string;
    lastInput: string;
  } | null>(null);

  // 이전 상담 불러오기 상태
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<"category" | "text" | "summary">("category");
  const [importCategory, setImportCategory] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [importSummary, setImportSummary] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // 공책(세션) 제한 초과 상태
  const [notebookLimitError, setNotebookLimitError] = useState<{
    sessionCount: number;
    limit: number;
  } | null>(null);

  // 선택 히스토리
  const [selectionHistory, setSelectionHistory] = useState<HistoryItem[]>([]);

  // 공개 통계
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);

  // 스크롤 ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  const statusBadge = (
    <div className="fixed right-0 top-32 z-50 pointer-events-none hidden lg:flex">
      <div className="bg-white/60 backdrop-blur-md border border-white/50 border-r-0 rounded-l-full py-2.5 px-5 shadow-xl ring-1 ring-white/60 flex items-center gap-3 group hover:bg-white/80 transition-all duration-300 pointer-events-auto">
        <div className="flex items-center gap-1.5 px-0.5">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
          </div>
          {/* 초록색 점등 앞에 */}
          <span className="text-[10px] font-black text-emerald-600 tracking-tighter uppercase leading-none"></span>
        </div>
        <div className="w-px h-4 bg-border/20" />
        <p className="text-[12px] font-bold text-foreground/70 whitespace-nowrap group-hover:text-primary transition-colors duration-300">
          24시간 언제든 찾아주세요
        </p>
      </div>
    </div>
  );

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

  // 로그인 시 이전 세션 목록 및 저장된 세션 가져오기
  useEffect(() => {
    if (!authLoading && user && token) {
      setIsLoadingSessions(true);
      getSessions(token)
        .then((sessionsRes) => {
          setPreviousSessions(sessionsRes.sessions);
        })
        .catch((err) => {
          console.error("Failed to fetch sessions:", err);
        })
        .finally(() => {
          setIsLoadingSessions(false);
        });
    }
  }, [authLoading, user, token]);

  // 방문자 추적 (비로그인 사용자도 추적)
  useEffect(() => {
    // 브라우저에서만 실행
    if (typeof window === "undefined") return;

    // visitorId 생성 또는 가져오기
    let visitorId = localStorage.getItem("to-high-visitor-id");
    if (!visitorId) {
      visitorId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem("to-high-visitor-id", visitorId);
    }

    // 방문자 추적 API 호출
    trackVisitor(visitorId).catch((err) => {
      console.error("Failed to track visitor:", err);
    });

    // 공개 통계 불러오기
    getPublicStats()
      .then(setPublicStats)
      .catch((err) => {
        console.error("Failed to get public stats:", err);
      });
  }, []);

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
      setOptions(res.options || []);
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
          timestamp: new Date(),
        });
      }

      historyItems.push({
        type: "assistant",
        content: res.question,
        isQuestion: true,
        timestamp: new Date(),
      });

      setSelectionHistory(historyItems);
    } catch (err: any) {
      console.error(err);
      // 세션 제한 초과 에러 처리
      if (err.code === 'SESSION_LIMIT_EXCEEDED') {
        setNotebookLimitError({
          sessionCount: err.sessionCount,
          limit: err.limit,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 직접 입력으로 세션 시작
  const handleDirectInputSubmit = async () => {
    if (!directInput.trim()) return;
    setIsLoading(true);
    try {
      const res = await startSessionWithText(directInput.trim(), undefined, token || undefined, selectedCounselorType || undefined);
      setSessionId(res.sessionId);
      setQuestion(res.question);
      setOptions(res.options || []);
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
          timestamp: new Date(),
        });
      }

      historyItems.push({ type: "user", content: directInput.trim(), timestamp: new Date() });
      historyItems.push({ type: "assistant", content: res.question, isQuestion: true, timestamp: new Date() });

      setSelectionHistory(historyItems);
      setDirectInput("");
    } catch (err: any) {
      console.error(err);
      // 세션 제한 초과 에러 처리
      if (err.code === 'SESSION_LIMIT_EXCEEDED') {
        setNotebookLimitError({
          sessionCount: err.sessionCount,
          limit: err.limit,
        });
      }
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

      setSelectionHistory(prev => [...prev, { type: "user", content: selected, timestamp: new Date() }]);

      try {
        const res: SelectOptionResponse = await selectOption(sessionId, selected, token || undefined);

        if (res.isCrisis && res.crisisMessage) {
          setCrisisMessage(res.crisisMessage);
        }

        const newHistoryItems: HistoryItem[] = [];

        if (res.empathyComment) {
          newHistoryItems.push({ type: "assistant", content: res.empathyComment, timestamp: new Date() });
        }

        // 상담가 피드백 추가 (경청모드 제외, AI 의견)
        if (res.counselorFeedback) {
          newHistoryItems.push({ type: "assistant", content: res.counselorFeedback, timestamp: new Date() });
        }

        if (res.contextSummary) {
          newHistoryItems.push({ type: "assistant", content: res.contextSummary, timestamp: new Date() });
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
            timestamp: new Date(),
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

  // 다른 옵션 보기 (히스토리에 추가하지 않고 옵션만 교체)
  const handleRequestNewOptions = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setIsLoadingNewOptions(true);
    try {
      const res: SelectOptionResponse = await selectOption(sessionId, "다른 옵션 보기", token || undefined);

      // 새 옵션이 있으면 교체
      if (res.question && res.options) {
        setQuestion(res.question);
        setOptions(res.options);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsLoadingNewOptions(false);
    }
  }, [sessionId, token]);

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
        // 기존 대화 내역을 채팅 메시지로 변환하고 AI 응답 추가 (system 메시지 제외)
        const previousMessages: ChatMessage[] = selectionHistory
          .filter(item => item.type !== "system")
          .map(item => ({
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
        timestamp: new Date(),
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
      timestamp: new Date(),
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
      // 기존 대화 내역을 채팅 메시지로 변환하고 AI 응답 추가 (system 메시지 제외)
      const previousMessages: ChatMessage[] = selectionHistory
        .filter(item => item.type !== "system")
        .map(item => ({
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
  const handleNewSession = async () => {
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
    setSelectedTopMode(null);
    setCanRequestFeedback(false);
    setContextCount(0);
    setHasHistory(false);
    setPreviousSessionSummary(null);
    // 저장 관련 상태 리셋
    setShowSaveModal(false);
    setSaveType(null);
    setCustomSaveName("");
    setIsSaved(false);

    // 세션 목록 새로고침
    if (token) {
      try {
        const sessionsRes = await getSessions(token);
        setPreviousSessions(sessionsRes.sessions);
      } catch (err) {
        console.error("Failed to refresh sessions:", err);
      }
    }
  };

  // 상담 저장하기
  const handleSaveSession = async () => {
    if (!sessionId || !token) return;

    setIsSaving(true);
    try {
      const savedName = saveType === "custom" ? customSaveName.trim() : undefined;
      await saveSession(sessionId, token, savedName);
      setIsSaved(true);
      setShowSaveModal(false);

      // 상담 기록 목록 갱신
      const res = await getSessions(token);
      setPreviousSessions(res.sessions);
    } catch (err) {
      console.error("Failed to save session:", err);
      alert("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 이전 세션 재개
  const handleResumeSession = async (targetSessionId: string) => {
    if (!token) return;
    setIsSwitchingSession(true);
    try {
      const res = await resumeSession(targetSessionId, token);
      setSessionId(res.sessionId);
      setQuestion(res.question);
      setOptions(res.options);
      setCanRequestFeedback(res.canRequestFeedback || false);
      setSelectedCounselorType(res.counselorType as CounselorType || null);
      setPhase("selecting");

      const historyItems: HistoryItem[] = [];

      // 세션 요약 카드 표시 (summary 또는 rollingSummary)
      const summaryText = res.summary || res.rollingSummary;
      if (summaryText) {
        const categoryInfo = categories.find(c => c.id === res.category);
        const categoryLabel = categoryInfo?.label || (res.category === 'direct' ? '직접 입력' : res.category);

        historyItems.push({
          type: "system",
          content: `📋 이전 상담 요약\n\n💭 주제: ${categoryLabel}\n📝 ${summaryText}\n🔄 대화 ${res.turnCount || 0}회`,
          timestamp: new Date(),
        });
      }

      // 이전 대화 일부 표시
      if (res.previousContext && res.previousContext.length > 0) {
        // 최근 대화만 표시
        res.previousContext.slice(-6).forEach((ctx: string, idx: number) => {
          // 새 형식: "나: ", "상담사: " 접두사
          if (ctx.startsWith("나:") || ctx.startsWith("나: ")) {
            historyItems.push({ type: "user", content: ctx.replace(/^나:\s*/, ""), timestamp: new Date() });
          } else if (ctx.startsWith("상담사:") || ctx.startsWith("상담사: ")) {
            historyItems.push({ type: "assistant", content: ctx.replace(/^상담사:\s*/, ""), timestamp: new Date() });
          } else if (!ctx.startsWith("[")) {
            // 기존 형식: 접두사 없음 - 짝수는 사용자, 홀수는 AI로 추정
            // 단, 시스템 메시지([로 시작)는 제외
            historyItems.push({
              type: idx % 2 === 0 ? "user" : "assistant",
              content: ctx,
              timestamp: new Date()
            });
          }
        });
      }

      // 새 질문 추가 (이전 컨텍스트 마지막이 상담사 응답이 아닐 때만)
      const lastContext = res.previousContext?.[res.previousContext.length - 1];
      const lastWasAssistant = lastContext?.startsWith("상담사:") || lastContext?.startsWith("상담사: ");
      if (!lastWasAssistant) {
        historyItems.push({
          type: "assistant",
          content: res.question,
          isQuestion: true,
          timestamp: new Date(),
        });
      }

      setSelectionHistory(historyItems);
    } catch (err) {
      console.error("Failed to resume session:", err);
    } finally {
      setIsSwitchingSession(false);
    }
  };

  // 세션 별칭 수정
  const handleUpdateAlias = async (targetSessionId: string) => {
    if (!token || !editingAlias.trim()) {
      setEditingSessionId(null);
      return;
    }
    try {
      await updateSessionAlias(targetSessionId, editingAlias.trim(), token);
      // 로컬 상태 업데이트
      setPreviousSessions((prev) =>
        prev.map((s) =>
          s.sessionId === targetSessionId ? { ...s, alias: editingAlias.trim() } : s
        )
      );
    } catch (err) {
      console.error("Failed to update alias:", err);
    } finally {
      setEditingSessionId(null);
      setEditingAlias("");
    }
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
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <CardTitle className="text-lg text-center">
              나만의 상담사를 키워보세요
            </CardTitle>
            <CardDescription className="text-center text-foreground/70">
              로그인하면 대화가 저장되고,<br />
              대화할수록 당신을 더 잘 이해하게 돼요.
            </CardDescription>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
                onClick={() => {
                  setShowLoginPrompt(false);
                  saveSessionState();
                  login();
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google로 로그인하기
              </Button>
              <Button
                className="w-full flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#FDD800] text-[#191919]"
                onClick={() => {
                  setShowLoginPrompt(false);
                  saveSessionState();
                  loginWithKakao();
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#191919">
                  <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.84 5.18 4.6 6.54-.2.72-.74 2.62-.85 3.02-.13.5.18.49.39.36.16-.1 2.59-1.76 3.64-2.48.73.1 1.48.16 2.22.16 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" />
                </svg>
                카카오로 로그인하기
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

  // 펜 쓰는 애니메이션 (로딩 인디케이터)
  const WritingIndicator = () => (
    <div className="flex items-center gap-2 text-muted-foreground">
      <svg
        className="w-4 h-4 animate-[writing_1s_ease-in-out_infinite]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
      <span className="text-sm">
        <span className="inline-block animate-[dot_1.4s_infinite]">.</span>
        <span className="inline-block animate-[dot_1.4s_infinite_0.2s]">.</span>
        <span className="inline-block animate-[dot_1.4s_infinite_0.4s]">.</span>
      </span>
    </div>
  );

  // 세션 전환 오버레이
  const SessionSwitchingOverlay = () => {
    if (!isSwitchingSession) return null;
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">상담 불러오는 중...</p>
        </div>
      </div>
    );
  };

  // 공책(세션) 제한 초과 모달
  const NotebookLimitModal = () => {
    if (!notebookLimitError) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="max-w-md w-full border-amber-200 bg-card overflow-hidden">
          {/* 상단 일러스트 영역 */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-3 relative">
              {/* 공책 아이콘 */}
              <div className="absolute inset-0 bg-amber-100 rounded-lg transform rotate-3"></div>
              <div className="absolute inset-0 bg-amber-200 rounded-lg transform -rotate-3"></div>
              <div className="absolute inset-0 bg-white rounded-lg border-2 border-amber-300 flex items-center justify-center">
                <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-amber-900">
              공책이 가득 찼어요
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              매달 새 공책을 받아보시겠어요?
            </p>
          </div>

          <CardHeader className="space-y-4 pt-4">

            {/* 가격 표시 */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 text-center border border-amber-100">
              <div className="space-y-2">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-sm text-amber-700">3권</span>
                  <span className="text-xl font-bold text-amber-600">2,900</span>
                  <span className="text-amber-600 text-sm">원/월</span>
                </div>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-sm text-amber-700">10권</span>
                  <span className="text-xl font-bold text-amber-600">7,900</span>
                  <span className="text-amber-600 text-sm">원/월</span>
                </div>
              </div>
            </div>

            {/* 준비중 안내 */}
            <div className="bg-slate-100 rounded-lg p-3 text-center">
              <p className="text-sm text-slate-600 font-medium">서비스 준비중</p>
              <p className="text-xs text-slate-500 mt-0.5">결제 시스템을 준비하고 있어요</p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                disabled
                className="w-full bg-slate-400 text-slate-200 font-medium cursor-not-allowed"
              >
                구독 알아보기 (준비중)
              </Button>
              <Button
                variant="outline"
                className="w-full border-amber-200 hover:bg-amber-50"
                onClick={() => {
                  setNotebookLimitError(null);
                }}
              >
                기존 기록 정리하기
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground text-sm"
                onClick={() => setNotebookLimitError(null)}
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
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-secondary/10 to-accent/10">
        {/* 헤더 */}
        <header className="p-4 border-b border-border/30">
          <div className="flex justify-between items-center">
            <Logo size="md" onClick={handleNewSession} />
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
                <Button variant="outline" size="sm" onClick={() => setShowLoginPrompt(true)} className="border-primary/50 text-primary hover:bg-primary/10">
                  로그인
                </Button>
              )}
            </div>
          </div>
        </header>

        {statusBadge}

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 pt-4">
          <div className="max-w-lg w-full space-y-4 sm:space-y-8">
            {/* 익명 감정 통계 - 0명일 때는 숨김 */}
            {publicStats && publicStats.todayConversations > 0 && (
              <div className="flex justify-center gap-6 text-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>오늘 <strong className="text-foreground">{publicStats.todayConversations.toLocaleString()}</strong>명이 위로받았어요</span>
                </div>
              </div>
            )}

            <div className="text-center space-y-3 sm:space-y-4">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground/90 tracking-tight animate-fade-in-up stagger-1" style={{ fontFamily: '"Pretendard Variable", Pretendard, sans-serif' }}>
                {user?.name ? (
                  <>
                    <span className="text-primary">{user.name}</span>님, <br className="hidden sm:block" />
                    오늘 하루도 정말 수고 많으셨어요.
                  </>
                ) : (
                  "오늘 하루도 정말 수고 많으셨어요."
                )}
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground animate-fade-in-up stagger-2" style={{ fontFamily: '"Pretendard Variable", Pretendard, sans-serif' }}>
                마음에 걸리는 게 있다면 편하게 말씀해 주세요.
              </p>
            </div>

            {/* 비로그인 사용자 로그인 유도 배너 */}
            {!authLoading && !user && (
              <button
                onClick={() => setShowLoginPrompt(true)}
                className="w-full rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/5 via-primary/10 to-accent/10 p-5 text-left hover:border-primary/60 hover:shadow-lg transition-all duration-300 animate-fade-in-up stagger-3"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0 shadow-sm">
                    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-foreground/90">나만의 상담사를 만들어보세요</p>
                    <p className="text-sm text-muted-foreground mt-1">로그인하시면 대화가 저장되고, 회원님을 기억합니다</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            )}

            {/* 이전 상담 불러오기 버튼 */}
            <button
              onClick={() => {
                if (!user) {
                  alert('로그인하면 이전 상담 내용을 불러올 수 있어요.');
                  return;
                }
                setShowImportModal(true);
                setImportStep("category");
                setImportCategory(null);
                setImportText("");
                setImportSummary("");
                setImportError(null);
              }}
              className="w-full rounded-2xl border border-secondary/50 bg-secondary/10 p-4 text-left hover:border-secondary hover:bg-secondary/20 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground/90">다른 곳에서 상담하셨나요?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">이전 상담 내용을 입력하시면 맥락을 더 잘 이해할 수 있습니다</p>
                </div>
                <svg className="w-5 h-5 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* 상담 기록 - 로그인한 사용자에게만 표시 */}
            {user && previousSessions.length > 0 && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground/90">상담 기록</p>
                  <span className="text-xs text-muted-foreground">{previousSessions.length}개</span>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-auto">
                  {previousSessions.slice(0, 3).map((session) => {
                    const categoryInfo = categories.find(c => c.id === session.category) || {
                      label: session.category === 'direct' ? '직접 입력' : session.category,
                      color: '#8B9BAA',
                    };
                    const isActive = session.status === 'active';
                    const date = new Date(session.updatedAt);
                    const timeAgo = getTimeAgo(date);
                    const displayName = session.alias || categoryInfo.label;
                    const isEditing = editingSessionId === session.sessionId;

                    return (
                      <button
                        key={session.sessionId}
                        onClick={() => !isEditing && handleResumeSession(session.sessionId)}
                        disabled={isLoading || isEditing}
                        className="group relative w-full p-3 rounded-xl border border-border/50 bg-background hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all duration-200 text-left disabled:opacity-70"
                        style={{ cursor: 'pointer' }}
                      >
                        {/* 삭제 버튼 - 오른쪽 상단 */}
                        <span
                          role="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm('이 상담을 삭제할까요? 삭제된 상담은 복구할 수 없어요.')) return;
                            try {
                              await deleteSession(session.sessionId, token!);
                              setPreviousSessions(prev => prev.filter(s => s.sessionId !== session.sessionId));
                            } catch (error) {
                              console.error('Delete session failed:', error);
                              alert('삭제에 실패했어요. 다시 시도해주세요.');
                            }
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground/50 hover:text-red-500 transition-colors z-10"
                          title="삭제"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </span>

                        <div className="flex items-start gap-3 pr-6">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs transition-all"
                            style={{ backgroundColor: categoryInfo.color }}
                          >
                            {/* 호버 시 선택 아이콘, 기본은 카테고리 아이콘 */}
                            <span className="group-hover:hidden">{session.alias ? '📝' : categoryInfo.label.charAt(0)}</span>
                            <svg className="w-4 h-4 hidden group-hover:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingAlias}
                                  onChange={(e) => setEditingAlias(e.target.value)}
                                  onBlur={() => handleUpdateAlias(session.sessionId)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateAlias(session.sessionId);
                                    if (e.key === 'Escape') {
                                      setEditingSessionId(null);
                                      setEditingAlias("");
                                    }
                                  }}
                                  className="text-sm font-medium bg-secondary/50 border border-primary/30 rounded px-2 py-0.5 w-full focus:outline-none focus:border-primary"
                                  autoFocus
                                  maxLength={50}
                                  placeholder="별칭 입력"
                                />
                              ) : (
                                <>
                                  <span className="text-sm font-medium truncate group-hover:text-primary">
                                    {displayName}
                                  </span>
                                  <span
                                    role="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSessionId(session.sessionId);
                                      setEditingAlias(session.alias || "");
                                    }}
                                    className="p-1 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors z-10"
                                    title="별칭 수정"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </span>
                                  {isActive && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/20 text-primary">진행중</span>
                                  )}
                                </>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {session.summary || '대화를 이어가보세요'}
                            </p>
                          </div>
                          {/* 마지막 상담일 - 오른쪽 */}
                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-muted-foreground/70">{timeAgo}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 세션 로딩 중 */}
            {user && isLoadingSessions && (
              <div className="rounded-2xl border border-border/30 bg-secondary/20 p-4 animate-pulse">
                <div className="h-4 bg-secondary rounded w-1/3 mb-3" />
                <div className="space-y-2">
                  <div className="h-16 bg-secondary/50 rounded-xl" />
                  <div className="h-16 bg-secondary/50 rounded-xl" />
                </div>
              </div>
            )}

            {/* 선택 영역 */}
            <div className="rounded-3xl border border-border/30 p-5 sm:p-6 space-y-5 sm:space-y-6 bg-card/50 shadow-sm animate-fade-in-up stagger-4">
              {/* 상담 모드 선택 - 2단계 구조 */}
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground/90 mb-1">먼저, 어떤 방식으로 대화할까요?</p>
                  <p className="text-xs text-muted-foreground">(선택하지 않으셔도 괜찮습니다)</p>
                </div>

                {/* 상위 모드 선택 */}
                <div className="grid grid-cols-3 gap-2">
                  {topLevelModes.map((mode) => (
                    <button
                      key={mode.id}
                      className={`group relative flex flex-col items-center justify-center p-4 rounded-[24px] border transition-all duration-300 ${selectedTopMode === mode.id
                        ? "bg-primary/10 border-primary shadow-md"
                        : "bg-card border-border/50 hover:border-primary/30 hover:bg-secondary/30 hover:-translate-y-1 hover:shadow-lg"
                        } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
                      onClick={() => {
                        if (selectedTopMode === mode.id) {
                          setSelectedTopMode(null);
                          setSelectedCounselorType(null);
                        } else {
                          setSelectedTopMode(mode.id);
                          // reaction, listening은 바로 counselorType 설정
                          if (mode.id === "reaction" || mode.id === "listening") {
                            setSelectedCounselorType(mode.id as CounselorType);
                          } else {
                            setSelectedCounselorType(null);
                          }
                        }
                      }}
                      disabled={isLoading}
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-md ${selectedTopMode === mode.id ? "scale-110 rotate-3" : ""}`}
                        style={{
                          background: `linear-gradient(135deg, ${mode.color}20 0%, ${mode.color}10 100%)`,
                          color: mode.color,
                          boxShadow: `
                            inset 0 2px 4px 0 rgba(255, 255, 255, 0.7), 
                            inset 0 -2px 4px 0 rgba(0, 0, 0, 0.05),
                            0 4px 8px ${mode.color}15
                          `,
                          border: `1px solid ${mode.color}10`
                        }}
                      >
                        {mode.icon}
                      </div>
                      <div className="text-sm font-semibold mb-0.5">{mode.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{mode.description}</div>

                      {selectedTopMode === mode.id && (
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>

                {/* MBTI 선택 시 T/F 하위 선택 */}
                {selectedTopMode === "mbti" && (
                  <div className="bg-secondary/30 rounded-xl p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-center text-foreground/80 font-medium">어떤 상담 스타일이 좋으세요?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {mbtiSubTypes.map((subType) => (
                        <button
                          key={subType.id}
                          className={`group relative flex flex-col items-center justify-center p-5 rounded-[24px] border transition-all duration-300 ${selectedCounselorType === subType.id
                            ? "border-primary bg-background shadow-md"
                            : "border-border/30 bg-background/50 hover:border-primary/40 hover:-translate-y-1 hover:shadow-lg"
                            } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
                          onClick={() => setSelectedCounselorType(selectedCounselorType === subType.id ? null : subType.id)}
                          disabled={isLoading}
                        >
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-md ${selectedCounselorType === subType.id ? "scale-110 rotate-3" : ""}`}
                            style={{
                              background: `linear-gradient(135deg, ${subType.color}20 0%, ${subType.color}10 100%)`,
                              color: subType.color,
                              boxShadow: `
                                inset 0 2px 4px 0 rgba(255, 255, 255, 0.7), 
                                inset 0 -2px 4px 0 rgba(0, 0, 0, 0.05),
                                0 4px 8px ${subType.color}15
                              `,
                              border: `1px solid ${subType.color}10`
                            }}
                          >
                            {subType.icon}
                          </div>
                          <div className="text-sm font-semibold mb-1">{subType.label}</div>
                          <div className="text-xs text-muted-foreground">{subType.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 선택된 모드 표시 */}
                {selectedCounselorType && (
                  <div className="flex items-center justify-center gap-2 text-xs text-primary">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span>
                      {selectedCounselorType === "T" && "현실적인 조언 모드로 대화합니다"}
                      {selectedCounselorType === "F" && "따뜻한 위로 모드로 대화합니다"}
                      {selectedCounselorType === "reaction" && "가볍게 리액션하며 대화합니다"}
                      {selectedCounselorType === "listening" && "말없이 경청하겠습니다"}
                    </span>
                  </div>
                )}
              </div>

              {/* 카테고리 구분선 */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground">어떤 이야기인가요?</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {categories.map((category, idx) => (
                  <button
                    key={category.id}
                    className={`group relative flex flex-col items-center justify-center p-6 rounded-[32px] bg-card border-none transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] ${isLoading ? "opacity-50 pointer-events-none" : ""
                      } animate-fade-in-up stagger-${idx + 1}`}
                    style={{
                      boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)",
                    }}
                    onClick={() => handleCategorySelect(category.id)}
                    disabled={isLoading}
                  >
                    <div
                      className="w-16 h-16 rounded-[24px] mb-4 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${category.color}20 0%, ${category.color}10 100%)`,
                        color: category.color,
                        boxShadow: `
                          inset 0 2px 4px 0 rgba(255, 255, 255, 0.7), 
                          inset 0 -2px 4px 0 rgba(0, 0, 0, 0.05),
                          0 4px 12px ${category.color}20
                        `,
                        border: `1px solid ${category.color}10`
                      }}
                    >
                      {category.icon}
                    </div>
                    <div className="space-y-2 text-center">
                      <div className="font-bold text-lg text-foreground/90">{category.label}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2 px-2">{category.description}</div>
                    </div>

                    {/* Hover Effect - Border Glow */}
                    <div
                      className="absolute inset-0 rounded-[32px] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
                      style={{
                        boxShadow: `inset 0 0 0 2px ${category.color}40`
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* 직접 입력 영역 */}
            <div className="rounded-2xl border border-border/30 bg-card/50 p-4 sm:p-5 space-y-3 shadow-sm animate-fade-in-up stagger-5">
              <p className="text-sm text-muted-foreground text-center">또는 직접 말씀해 주세요</p>
              <div className="flex gap-3 items-stretch">
                <input
                  type="text"
                  value={directInput}
                  onChange={(e) => setDirectInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDirectInputSubmit()}
                  placeholder="무슨 일이 있었는지 말씀해 주세요..."
                  className="flex-1 px-4 sm:px-5 h-12 sm:h-14 text-sm sm:text-base rounded-xl border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all shadow-sm"
                  disabled={isLoading}
                />
                <Button
                  className="h-12 sm:h-14 px-5 sm:px-7 rounded-xl shadow-sm"
                  onClick={handleDirectInputSubmit}
                  disabled={isLoading || !directInput.trim()}
                >
                  상담 시작
                </Button>
              </div>
            </div>

            {/* 로딩 팝업 */}
            {isLoading && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <Card className="max-w-sm w-full border-primary/30 bg-card shadow-xl">
                  <CardHeader className="text-center space-y-4 py-8">
                    {/* 로딩 애니메이션 - 원형 안에 점 세 개 */}
                    <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center gap-2">
                      <span className="w-3 h-3 bg-primary rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: "0ms" }} />
                      <span className="w-3 h-3 bg-primary rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: "150ms" }} />
                      <span className="w-3 h-3 bg-primary rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: "300ms" }} />
                    </div>
                    <CardTitle className="text-lg font-medium text-foreground/90">
                      경청하려 자세를 고쳐앉는 중...
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      잠시만 기다려주세요
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            )}
          </div>
        </div>
        <NotebookLimitModal />
        <SessionSwitchingOverlay />

        {/* 이전 상담 불러오기 모달 */}
        {
          showImportModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <Card className="max-w-md w-full border-primary/30 bg-card shadow-xl max-h-[90vh] overflow-auto">
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium text-foreground/90">
                      {importStep === "category" ? "어떤 주제의 상담이었나요?" :
                        importStep === "text" ? "이전 상담 내용 붙여넣기" :
                          "요약 확인 및 수정"}
                    </CardTitle>
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="p-1 rounded-full hover:bg-secondary/50 transition-colors"
                    >
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {importStep === "category" ? (
                    <>
                      <CardDescription className="text-sm text-muted-foreground">
                        카테고리를 선택하면 맥락을 더 잘 이해할 수 있어요
                      </CardDescription>
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setImportCategory(cat.id);
                              setImportStep("text");
                            }}
                            className="p-3 rounded-xl border border-border/50 bg-background hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                                style={{ backgroundColor: cat.color }}
                              >
                                {cat.icon}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{cat.label}</p>
                                <p className="text-xs text-muted-foreground">{cat.description}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : importStep === "text" ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <button
                          onClick={() => setImportStep("category")}
                          className="hover:text-foreground transition-colors"
                        >
                          &larr; 카테고리 변경
                        </button>
                        <span>|</span>
                        <span>
                          {categories.find(c => c.id === importCategory)?.label || "선택됨"}
                        </span>
                      </div>
                      <CardDescription className="text-sm text-muted-foreground">
                        ChatGPT 등에서 나눈 상담 내용을 복사해서 붙여넣어 주세요. (최대 10만자)
                      </CardDescription>
                      <textarea
                        value={importText}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.length > 100000) {
                            setImportText(value.slice(0, 100000));
                            setImportError("10만자를 초과하여 뒷부분이 잘렸어요");
                          } else {
                            setImportText(value);
                            setImportError(null);
                          }
                        }}
                        placeholder="이전 상담 내용을 붙여넣어 주세요...

예시:
- ChatGPT와 나눈 대화
- 노트에 적어둔 고민
- 일기나 메모 등"
                        className="w-full h-48 p-3 text-sm rounded-xl border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all resize-none"
                        disabled={isImporting}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{importText.length.toLocaleString()} / 100,000자</span>
                        {importText.length > 90000 && (
                          <span className="text-amber-500">거의 다 찼어요</span>
                        )}
                      </div>
                      {/* 안심 문구 */}
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-secondary/50">
                        <svg className="w-4 h-4 text-primary/70 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <div className="text-xs text-muted-foreground">
                          <p className="font-medium text-foreground/80">안심하세요</p>
                          <p className="mt-0.5">입력하신 내용은 암호화되어 안전하게 전송되며, 핵심 내용만 요약되어 상담에 활용됩니다. 원본 텍스트는 저장되지 않아요.</p>
                        </div>
                      </div>
                      {importError && (
                        <p className="text-sm text-red-500">{importError}</p>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowImportModal(false)}
                          disabled={isImporting}
                        >
                          취소
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={async () => {
                            if (!importText.trim()) {
                              setImportError("내용을 입력해주세요");
                              return;
                            }
                            if (importText.length < 50) {
                              setImportError("최소 50자 이상 입력해주세요");
                              return;
                            }
                            setIsImporting(true);
                            setImportError(null);
                            try {
                              const result = await summarizeText(importText, token || undefined);
                              setImportSummary(result.summary);
                              setImportStep("summary");
                            } catch (error) {
                              console.error("Summarize failed:", error);
                              setImportError("상담 내용을 분석하는 중 오류가 발생했어요. 다시 시도해주세요.");
                            } finally {
                              setIsImporting(false);
                            }
                          }}
                          disabled={isImporting || !importText.trim()}
                        >
                          {isImporting ? (
                            <span className="flex items-center gap-2">
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              분석 중...
                            </span>
                          ) : (
                            "내용 분석하기"
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <button
                          onClick={() => setImportStep("text")}
                          className="hover:text-foreground transition-colors"
                        >
                          &larr; 원문으로 돌아가기
                        </button>
                        <span>|</span>
                        <span>
                          {categories.find(c => c.id === importCategory)?.label || "선택됨"}
                        </span>
                      </div>
                      <CardDescription className="text-sm text-muted-foreground">
                        AI가 핵심 내용을 요약했어요. 필요하면 수정해주세요.
                      </CardDescription>
                      <textarea
                        value={importSummary}
                        onChange={(e) => setImportSummary(e.target.value)}
                        className="w-full h-48 p-3 text-sm rounded-xl border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all resize-none"
                        disabled={isImporting}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{importSummary.length.toLocaleString()}자</span>
                      </div>
                      {importError && (
                        <p className="text-sm text-red-500">{importError}</p>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowImportModal(false)}
                          disabled={isImporting}
                        >
                          취소
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={async () => {
                            if (!importSummary.trim()) {
                              setImportError("요약 내용을 입력해주세요");
                              return;
                            }
                            setIsImporting(true);
                            setImportError(null);
                            try {
                              const result = await startSessionWithImportSummary(
                                importSummary,
                                importCategory || undefined,
                                token || undefined
                              );
                              setSessionId(result.sessionId);
                              setQuestion(result.question);
                              setOptions(result.options);
                              setPhase("selecting");
                              setSelectionHistory([
                                { type: "assistant", content: result.question, isQuestion: true },
                              ]);
                              setShowImportModal(false);
                              setImportText("");
                              setImportSummary("");
                              setImportCategory(null);
                              setImportStep("category");
                            } catch (error) {
                              console.error("Import failed:", error);
                              setImportError("상담을 시작하는 중 오류가 발생했어요. 다시 시도해주세요.");
                            } finally {
                              setIsImporting(false);
                            }
                          }}
                          disabled={isImporting || !importSummary.trim()}
                        >
                          {isImporting ? (
                            <span className="flex items-center gap-2">
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              시작 중...
                            </span>
                          ) : (
                            "상담 시작하기"
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardHeader>
              </Card>
            </div>
          )
        }
        <LoginPromptModal />
      </main >
    );
  }

  // 선택 단계
  if (phase === "selecting") {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/20">
        <header className="p-4 border-b border-border/30">
          <div className="flex justify-between items-center">
            <Logo size="md" onClick={handleNewSession} />
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
                처음으로
              </button>
            </div>
          </div>
        </header>

        {statusBadge}

        <div className="flex-1 flex flex-col lg:flex-row justify-center lg:gap-6 xl:gap-8 overflow-hidden relative p-4 lg:p-0">
          {/* 오른쪽 사이드바 - 상담 기록 (로그인한 사용자만) - 채팅 영역 근처 */}
          {user && previousSessions.length > 0 && (
            <aside className="w-full lg:w-80 shrink-0 space-y-4 overflow-auto p-4 lg:p-6 z-10 order-2 lg:order-3">
              {/* 상담 기록 */}
              <div className="rounded-2xl border border-border/40 bg-white/40 backdrop-blur-md p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    상담 기록
                  </p>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{previousSessions.length}</span>
                </div>
                <div className="space-y-2.5 h-[180px] overflow-auto pr-1 scrollbar-hide">
                  {previousSessions.map((session) => {
                    const categoryInfo = categories.find(c => c.id === session.category) || {
                      label: session.category === 'direct' ? '직접 입력' : session.category,
                      color: '#8B9BAA',
                    };
                    const isActive = session.status === 'active';
                    const displayName = session.alias || (session.category === 'direct' ? '직접 입력' : categoryInfo.label);
                    const date = new Date(session.updatedAt);
                    const timeAgo = getTimeAgo(date);

                    return (
                      <div
                        key={session.sessionId}
                        className="relative w-full p-3 rounded-2xl border border-border/40 bg-white/60 hover:bg-white hover:border-primary/30 hover:shadow-md transition-all duration-300 group cursor-pointer"
                      >
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm('정말 삭제하시겠습니까?')) return;
                              try {
                                await deleteSession(session.sessionId, token!);
                                setPreviousSessions(prev => prev.filter(s => s.sessionId !== session.sessionId));
                              } catch (error) {
                                console.error('Delete session failed:', error);
                                alert('삭제에 실패했습니다.');
                              }
                            }}
                            className="p-1.5 rounded-full hover:bg-red-50 text-muted-foreground/50 hover:text-red-500 transition-colors"
                            title="삭제"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <button
                          onClick={() => handleResumeSession(session.sessionId)}
                          disabled={isLoading}
                          className="w-full text-left"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm group-hover:scale-105 transition-transform duration-300"
                              style={{
                                background: `linear-gradient(135deg, ${categoryInfo.color}, ${categoryInfo.color}dd)`,
                                boxShadow: `0 2px 5px ${categoryInfo.color}40`
                              }}
                            >
                              {categoryInfo.label.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold truncate text-foreground/90 group-hover:text-primary transition-colors">{displayName}</span>
                                {isActive && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate opacity-80 mt-0.5">
                                {session.summary || '이어하기...'}
                              </p>
                            </div>
                            <div className="text-right shrink-0 pt-1">
                              <p className="text-[10px] text-muted-foreground/60">{timeAgo}</p>
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 다른 주제 상담하기 버튼 */}
              <button
                onClick={handleNewSession}
                className="w-full p-3 rounded-xl border-2 border-dashed border-primary/30 text-primary/80 text-sm font-medium transition-all duration-200 hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  다른 주제로 상담하기
                </span>
              </button>
            </aside>
          )}

          {/* 왼쪽 사이드바 - 마음 돌봄 콘텐츠 (데스크톱만/XL이상) */}
          <aside className="hidden xl:block w-80 shrink-0 p-6 z-10 overflow-y-auto order-1">
            <MindfulnessCard />
          </aside>

          {/* 메인 영역 - 대화 + 옵션 */}
          {/* 메인 영역 - 대화 + 옵션 */}
          <div className="flex-1 max-w-2xl flex flex-col relative overflow-hidden bg-white/30 backdrop-blur-xl rounded-[32px] border border-white/50 shadow-2xl my-4 lg:my-6 z-20 ring-1 ring-white/60 order-1 lg:order-2">
            {/* 스크롤 가능한 대화 및 선택지 영역 */}
            <div className="flex-1 overflow-y-auto px-4 pb-32 pt-4 scrollbar-hide">
              <div className="max-w-2xl mx-auto space-y-6">

                {/* 대화 히스토리 */}
                <div className="space-y-4">
                  {selectionHistory.length === 0 && !isLoading && (
                    <div className="py-12 flex flex-col items-center justify-center text-muted-foreground/60 text-sm gap-3">
                      <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center">
                        <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p>편안하게 이야기를 시작해보세요</p>
                    </div>
                  )}

                  {selectionHistory.map((item, idx) => (
                    item.type === "system" ? (
                      // 시스템 메시지 (이전 상담 요약 카드)
                      <div key={idx} className="flex justify-center py-4">
                        <div className="w-full max-w-lg rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 to-secondary/10 px-5 py-4 shadow-sm">
                          <p className="text-sm font-medium text-primary mb-1">지난 이야기 요약</p>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/80">{item.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={idx}
                        className={`flex ${item.type === "user" ? "flex-row-reverse" : "flex-row"} gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300`}
                      >
                        {item.type !== "user" && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 mt-1 shadow-sm border border-white/50">
                            <img src="/logo.png" alt="위로" className="w-full h-full object-cover rounded-full opacity-90" />
                          </div>
                        )}
                        <div className={`flex flex-col gap-1 max-w-[85%] ${item.type === "user" ? "items-end" : "items-start"}`}>
                          <div
                            className={`rounded-[24px] px-5 py-3.5 shadow-sm transition-all duration-300 hover:shadow-md ${item.type === "user"
                              ? "bg-gradient-to-br from-primary to-violet-500 text-white rounded-tr-sm shadow-primary/20"
                              : "bg-white/90 border border-border/40 text-foreground/90 rounded-tl-sm backdrop-blur-sm shadow-gray-100"
                              }`}
                          >
                            <p className="text-[15px] leading-relaxed font-medium">{item.content}</p>
                          </div>
                          {item.timestamp && (
                            <span className="text-[10px] text-muted-foreground/60 px-1">
                              {item.timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  ))}

                  {/* 로딩 인디케이터 */}
                  {isLoading && !isLoadingNewOptions && (
                    <div className="flex justify-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 mt-1 shadow-sm border border-white/50">
                        <img src="/logo.png" alt="위로" className="w-full h-full object-cover rounded-full opacity-90" />
                      </div>
                      <div className="bg-white/80 border border-border/40 rounded-[24px] rounded-tl-sm px-5 py-4 max-w-[85%] shadow-sm backdrop-blur-sm">
                        {streamingContent ? (
                          <p className="text-[15px] whitespace-pre-wrap leading-relaxed font-medium text-foreground/90">{streamingContent}</p>
                        ) : (
                          <WritingIndicator />
                        )}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* 선택지 영역 (대화 흐름에 이어짐) */}
                {!isLoading && (
                  <div className="pt-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                    {showModeSelection ? (
                      <div className="grid gap-3">
                        <div className="text-center pb-2">
                          <span className="inline-block px-3 py-1 rounded-full bg-secondary/50 text-xs text-muted-foreground">
                            어떻게 반응해드릴까요?
                          </span>
                        </div>
                        {responseModes.map((modeOption) => {
                          const modeStyle = {
                            comfort: { bg: "bg-rose-100", text: "text-rose-600", label: "따뜻하게 안아드릴게요" },
                            listen: { bg: "bg-sky-100", text: "text-sky-600", label: "모든 이야기를 들어드릴게요" },
                            organize: { bg: "bg-amber-100", text: "text-amber-600", label: "머릿속을 함께 비워요" },
                            validate: { bg: "bg-violet-100", text: "text-violet-600", label: "당신의 마음이 맞아요" },
                            direction: { bg: "bg-emerald-100", text: "text-emerald-600", label: "나아갈 길을 찾아봐요" },
                            similar: { bg: "bg-indigo-100", text: "text-indigo-600", label: "혼자가 아니에요" },
                          }[modeOption.mode];

                          return (
                            <button
                              key={modeOption.mode}
                              onClick={() => handleSelectModeInChat(modeOption.mode)}
                              disabled={isLoading}
                              className="w-full p-4 rounded-2xl border border-border/40 bg-white/60 hover:bg-white hover:border-primary/30 hover:shadow-md transition-all duration-300 text-left group relative overflow-hidden backdrop-blur-sm"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                              <div className="flex items-center gap-4 relative z-10">
                                <div className={`w-12 h-12 rounded-2xl ${modeStyle.bg} ${modeStyle.text} flex items-center justify-center text-lg font-bold shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                  {modeOption.emoji}
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground/90 group-hover:text-primary transition-colors">{modeOption.label}</p>
                                  <p className="text-sm text-muted-foreground group-hover:text-foreground/70 transition-colors">{modeOption.description}</p>
                                </div>
                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/80 py-2">
                          <span className="h-px w-8 bg-border/60"></span>
                          <span>답변을 선택하거나 직접 입력해주세요</span>
                          <span className="h-px w-8 bg-border/60"></span>
                        </div>

                        <div className="grid gap-2.5">
                          {options.map((option, idx) => (
                            <button
                              key={idx}
                              className="w-full py-4 px-6 text-left text-[15px] font-medium rounded-[20px] border border-primary/10 bg-white/70 shadow-sm hover:shadow-md hover:border-primary/40 hover:bg-white transition-all duration-200 active:scale-[0.99] group text-foreground/90"
                              onClick={() => handleSelectOption(option)}
                              disabled={isLoading}
                            >
                              <span className="group-hover:text-primary transition-colors">{option}</span>
                            </button>
                          ))}

                          <Button
                            variant="outline"
                            className="w-full h-auto py-3.5 border-dashed border-secondary bg-secondary/10 text-muted-foreground hover:bg-secondary/30 hover:text-foreground hover:border-secondary transition-all duration-200 rounded-[20px] mt-2"
                            onClick={handleRequestNewOptions}
                            disabled={isLoading}
                          >
                            <span className="flex items-center gap-2 text-sm">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              {isLoadingNewOptions ? "다른 표현을 찾는 중..." : "다른 답변 보기"}
                            </span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 하단 고정 입력창 (Glassmorphism) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pt-8 bg-gradient-to-t from-background via-background/95 to-transparent z-20 pointer-events-none">
              <div className="max-w-2xl mx-auto w-full pointer-events-auto">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/20 rounded-[28px] blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative bg-white/80 backdrop-blur-md rounded-[28px] border border-white/50 shadow-lg flex items-center p-1.5 gap-2 transition-all duration-300 group-hover:shadow-xl group-hover:border-primary/30">
                    <input
                      type="text"
                      value={supplementInput}
                      onChange={(e) => setSupplementInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSupplementSubmit()}
                      placeholder="직접 말씀해 주셔도 좋아요..."
                      className="flex-1 px-5 h-11 bg-transparent text-base focus:outline-none placeholder:text-muted-foreground/60 text-foreground/90"
                      disabled={isLoading}
                    />
                    <Button
                      className="h-10 px-5 rounded-[22px] bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
                      onClick={handleSupplementSubmit}
                      disabled={isLoading || !supplementInput.trim()}
                    >
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <LimitErrorModal />
        <LoginPromptModal />
        <NotebookLimitModal />
        <SessionSwitchingOverlay />
      </main>
    );
  }

  // 모드 선택
  if (phase === "mode") {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/20">
        <header className="p-4 border-b border-border/30">
          <div className="flex justify-between items-center">
            <Logo size="md" onClick={handleNewSession} />
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
                처음으로
              </button>
            </div>
          </div>
        </header>

        {statusBadge}

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
                이야기를 잘 들었습니다. 어떤 방식으로 진행할까요?
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
              <div className="flex justify-center">
                <WritingIndicator />
              </div>
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
            <Logo size="sm" onClick={handleNewSession} />
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
              {user && !isSaved && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSaveModal(true)}
                  className="text-primary"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  저장
                </Button>
              )}
              {isSaved && (
                <span className="text-xs text-primary flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  저장됨
                </span>
              )}
              {!user && (
                <button
                  onClick={() => {
                    saveSessionState();
                    login();
                  }}
                  className="text-xs text-primary/80 hover:text-primary flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  로그인 후 저장
                </button>
              )}
              <Button variant="outline" size="sm" onClick={handleEndSession} disabled={isLoading}>
                상담 종료
              </Button>
            </div>
          </div>
        </header>

        {statusBadge}

        <div className="flex-1 flex flex-col lg:flex-row justify-center lg:gap-6 xl:gap-8 overflow-hidden relative p-4 lg:p-0">
          {/* 왼쪽 사이드바 - 상담 기록 (로그인한 사용자만) */}
          {user && previousSessions.length > 0 && (
            <aside className="hidden lg:block w-72 shrink-0 border-r border-border/30 overflow-auto p-4 lg:p-6 lg:pr-0 space-y-4 order-2 lg:order-1">
              {/* 상담 기록 */}
              <div className="rounded-2xl border border-border/40 bg-white/40 backdrop-blur-md p-3 space-y-2 shadow-sm">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-semibold text-foreground/80 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-primary/50" />
                    상담 기록
                  </p>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{previousSessions.length}</span>
                </div>
                <div className="space-y-1.5 max-h-[180px] overflow-auto pr-1 scrollbar-hide">
                  {previousSessions.map((session) => {
                    const categoryInfo = categories.find(c => c.id === session.category) || {
                      label: session.category === 'direct' ? '직접 입력' : session.category,
                      color: '#8B9BAA',
                    };
                    const isActive = session.status === 'active';
                    const isCurrent = session.sessionId === sessionId;
                    const displayName = session.alias || (session.category === 'direct' ? '직접 입력' : categoryInfo.label);

                    return (
                      <button
                        key={session.sessionId}
                        onClick={() => !isCurrent && handleResumeSession(session.sessionId)}
                        disabled={isLoading || isCurrent}
                        className={`w-full p-2.5 rounded-2xl text-left transition-all duration-200 group relative overflow-hidden ${isCurrent
                          ? 'bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 shadow-inner'
                          : 'border border-border/40 bg-white/60 hover:bg-white hover:border-primary/30 hover:shadow-sm'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-[10px] font-bold shadow-sm transition-transform duration-300 ${!isCurrent && 'group-hover:scale-105'}`}
                            style={{
                              background: `linear-gradient(135deg, ${categoryInfo.color}, ${categoryInfo.color}dd)`,
                              boxShadow: `0 2px 5px ${categoryInfo.color}40`,
                              opacity: isCurrent ? 1 : 0.9
                            }}
                          >
                            {categoryInfo.label.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className={`text-xs font-semibold truncate transition-colors ${isCurrent ? 'text-primary' : 'text-foreground/90 group-hover:text-primary'}`}>{displayName}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded-full text-[8px] bg-primary text-primary-foreground font-medium shadow-sm">현재</span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate opacity-80 mt-0.5">
                              {session.summary || '이어하기...'}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 다른 주제 상담하기 */}
              <button
                onClick={handleNewSession}
                className="w-full p-2 rounded-xl border-2 border-dashed border-primary/30 text-primary/80 text-xs font-medium transition-all duration-200 hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="flex items-center justify-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  다른 주제로 상담
                </span>
              </button>
            </aside>
          )}

          {/* 오른쪽 메인 영역 - 채팅 */}
          <div className="flex-1 max-w-2xl flex flex-col overflow-hidden relative bg-white/30 backdrop-blur-xl rounded-[32px] border border-white/50 shadow-2xl z-0 ring-1 ring-white/60 order-1 lg:order-2">
            <div className="flex-1 overflow-y-auto px-4 pb-32 pt-4 scrollbar-hide space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start gap-3"}`}
                >
                  {msg.role !== "user" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 mt-1 shadow-sm border border-white/50">
                      <img src="/logo.png" alt="위로" className="w-full h-full object-cover rounded-full opacity-90" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-[24px] px-5 py-3.5 shadow-sm transition-all duration-300 hover:shadow-md ${msg.role === "user"
                      ? "bg-gradient-to-br from-primary to-violet-500 text-white rounded-tr-sm shadow-primary/20"
                      : "bg-white/90 border border-border/40 text-foreground/90 rounded-tl-sm backdrop-blur-sm shadow-gray-100"
                      }`}
                  >
                    <p className="text-[15px] whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && streamingContent && (
                <div className="flex justify-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 mt-1 shadow-sm border border-white/50">
                    <img src="/logo.png" alt="위로" className="w-full h-full object-cover rounded-full opacity-90" />
                  </div>
                  <div className="bg-white/80 border border-border/40 rounded-[24px] rounded-tl-sm px-5 py-4 max-w-[85%] shadow-sm backdrop-blur-sm">
                    <p className="text-[15px] whitespace-pre-wrap leading-relaxed font-medium text-foreground/90">
                      {streamingContent}
                      <span className="animate-pulse text-primary">▋</span>
                    </p>
                  </div>
                </div>
              )}
              {isLoading && !streamingContent && (
                <div className="flex justify-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 mt-1 shadow-sm border border-white/50">
                    <img src="/logo.png" alt="위로" className="w-full h-full object-cover rounded-full opacity-90" />
                  </div>
                  <div className="bg-white/80 border border-border/40 rounded-[24px] rounded-tl-sm px-5 py-4 shadow-sm backdrop-blur-sm">
                    <WritingIndicator />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 하단 고정 입력창 (Glassmorphism) - 채팅 중 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pt-8 bg-gradient-to-t from-background via-background/95 to-transparent z-20 pointer-events-none">
              <div className="max-w-3xl mx-auto w-full pointer-events-auto">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/20 rounded-[28px] blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative bg-white/80 backdrop-blur-md rounded-[28px] border border-white/50 shadow-lg flex items-center p-1.5 gap-2 transition-all duration-300 group-hover:shadow-xl group-hover:border-primary/30">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      placeholder="메시지를 입력하세요..."
                      className="flex-1 px-5 h-11 bg-transparent text-base focus:outline-none placeholder:text-muted-foreground/60 text-foreground/90"
                      disabled={isLoading}
                    />
                    <Button
                      className="h-10 px-5 rounded-[22px] bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
                      onClick={handleSendMessage}
                      disabled={isLoading || !inputMessage.trim()}
                    >
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <LimitErrorModal />
        <LoginPromptModal />
        <NotebookLimitModal />
        <SessionSwitchingOverlay />

        {/* 저장 모달 */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full border-primary/30 bg-card">
              <CardHeader className="space-y-4">
                <CardTitle className="text-lg text-center">상담 저장하기</CardTitle>
                <CardDescription className="text-center">
                  저장 방식을 선택해주세요
                </CardDescription>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => setSaveType("category")}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${saveType === "category"
                      ? "border-primary bg-primary/10"
                      : "border-border/50 hover:border-primary/40"
                      }`}
                  >
                    <div className="font-medium">카테고리별 저장</div>
                    <div className="text-sm text-muted-foreground">자동으로 카테고리에 분류됩니다</div>
                  </button>

                  <button
                    onClick={() => setSaveType("custom")}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${saveType === "custom"
                      ? "border-primary bg-primary/10"
                      : "border-border/50 hover:border-primary/40"
                      }`}
                  >
                    <div className="font-medium">나만의 상담</div>
                    <div className="text-sm text-muted-foreground">직접 이름을 지정해서 저장합니다</div>
                  </button>

                  {saveType === "custom" && (
                    <input
                      type="text"
                      value={customSaveName}
                      onChange={(e) => setCustomSaveName(e.target.value)}
                      placeholder="상담 이름을 입력하세요"
                      className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      autoFocus
                    />
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setShowSaveModal(false);
                      setSaveType(null);
                      setCustomSaveName("");
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSaveSession}
                    disabled={isSaving || !saveType || (saveType === "custom" && !customSaveName.trim())}
                  >
                    {isSaving ? "저장 중..." : "저장하기"}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </div>
        )}
      </main>
    );
  }

  // 종료
  if (phase === "ended") {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/20">
        <header className="p-4 border-b border-border/30">
          <div className="flex justify-between items-center">
            <Logo size="md" onClick={handleNewSession} />
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

        {statusBadge}

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-medium text-foreground/90">오늘 이야기는 여기까지</h2>
              <p className="text-muted-foreground text-sm">이야기 나눠주셔서 감사합니다. 언제든 다시 찾아주세요.</p>
            </div>

            <Card className="border-primary/20 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base font-medium">오늘 나눈 이야기</CardTitle>
                <CardDescription className="whitespace-pre-wrap text-foreground/80 leading-relaxed">
                  {summary}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 저장하기 버튼 */}
            {!isSaved ? (
              <div className="space-y-3">
                {user ? (
                  <Button
                    variant="outline"
                    className="w-full border-primary/50 text-primary hover:bg-primary/10"
                    onClick={() => setShowSaveModal(true)}
                  >
                    이번 상담 저장하기
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-primary/50 text-primary hover:bg-primary/10"
                    onClick={() => {
                      setShowLoginPrompt(true);
                    }}
                  >
                    로그인 후 상담 저장하기
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center text-sm text-primary flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                저장되었습니다
              </div>
            )}

            <Button className="w-full transition-all" onClick={handleNewSession}>
              처음으로 돌아가기
            </Button>

            {/* 저장 모달 */}
            {showSaveModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <Card className="max-w-md w-full border-primary/30 bg-card">
                  <CardHeader className="space-y-4">
                    <CardTitle className="text-lg text-center">상담 저장하기</CardTitle>
                    <CardDescription className="text-center">
                      저장 방식을 선택해주세요
                    </CardDescription>

                    <div className="space-y-3 pt-2">
                      {/* 카테고리별 저장 */}
                      <button
                        onClick={() => setSaveType("category")}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${saveType === "category"
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/40"
                          }`}
                      >
                        <div className="font-medium">카테고리별 저장</div>
                        <div className="text-sm text-muted-foreground">자동으로 카테고리에 분류됩니다</div>
                      </button>

                      {/* 나만의 상담 */}
                      <button
                        onClick={() => setSaveType("custom")}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${saveType === "custom"
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/40"
                          }`}
                      >
                        <div className="font-medium">나만의 상담</div>
                        <div className="text-sm text-muted-foreground">직접 이름을 지정해서 저장합니다</div>
                      </button>

                      {/* 나만의 상담 이름 입력 */}
                      {saveType === "custom" && (
                        <input
                          type="text"
                          value={customSaveName}
                          onChange={(e) => setCustomSaveName(e.target.value)}
                          placeholder="상담 이름을 입력하세요"
                          className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                          autoFocus
                        />
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="ghost"
                        className="flex-1"
                        onClick={() => {
                          setShowSaveModal(false);
                          setSaveType(null);
                          setCustomSaveName("");
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleSaveSession}
                        disabled={isSaving || !saveType || (saveType === "custom" && !customSaveName.trim())}
                      >
                        {isSaving ? "저장 중..." : "저장하기"}
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return null;
}
