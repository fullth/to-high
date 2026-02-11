"use client";

import { ContactSidebar } from "@/components/contact-sidebar";
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
    gradient: "from-indigo-500/20 to-purple-500/10",
    glowColor: "rgba(99, 102, 241, 0.4)",
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
    color: "#F87171",
    gradient: "from-rose-500/20 to-orange-500/10",
    glowColor: "rgba(248, 113, 113, 0.4)",
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
    color: "#34D399",
    gradient: "from-emerald-500/20 to-teal-500/10",
    glowColor: "rgba(52, 211, 153, 0.4)",
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
    color: "#F472B6",
    gradient: "from-pink-500/20 to-rose-500/10",
    glowColor: "rgba(244, 114, 182, 0.4)",
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
    color: "#60A5FA",
    gradient: "from-blue-500/20 to-indigo-500/10",
    glowColor: "rgba(96, 165, 250, 0.4)",
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
    color: "#A78BFA",
    gradient: "from-purple-400/30 to-indigo-400/20",
    glowColor: "rgba(167, 139, 250, 0.6)",
    label: "나",
    description: "마음, 감정",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M7 21v-2a5 5 0 0 1 10 0v2" />
        <circle cx="12" cy="11" r="1.5" fill="currentColor" />
      </svg>
    )
  },
  {
    id: "future",
    color: "#34D399",
    gradient: "from-emerald-400/30 to-teal-400/20",
    glowColor: "rgba(52, 211, 153, 0.6)",
    label: "미래",
    description: "진로, 선택",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2v20M2 12h20" />
        <path d="m16 8-8 8M16 16 8 8" />
        <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" />
      </svg>
    )
  },
  {
    id: "work",
    color: "#60A5FA",
    gradient: "from-blue-400/30 to-cyan-400/20",
    glowColor: "rgba(96, 165, 250, 0.6)",
    label: "일",
    description: "업무, 직장",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        <path d="M2 12h20" />
      </svg>
    )
  },
  {
    id: "relationship",
    color: "#FBBF24",
    gradient: "from-amber-400/30 to-orange-400/20",
    glowColor: "rgba(251, 191, 36, 0.6)",
    label: "관계",
    description: "가족, 친구",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        <path d="M9 13h1" />
      </svg>
    )
  },
  {
    id: "love",
    color: "#F87171",
    gradient: "from-rose-400/30 to-pink-400/20",
    glowColor: "rgba(248, 113, 113, 0.6)",
    label: "연애",
    description: "사랑, 이별",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        <path d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" fill="currentColor" fillOpacity="0.1" />
      </svg>
    )
  },
  {
    id: "daily",
    color: "#818CF8",
    gradient: "from-indigo-400/30 to-slate-400/20",
    glowColor: "rgba(129, 140, 248, 0.6)",
    label: "일상",
    description: "그냥 얘기",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M3 6h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
        <path d="M3 10h18" />
        <path d="M7 14h.01" />
        <path d="M11 14h.01" />
        <path d="M15 14h.01" />
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

  // 상담 대기/선택 단계 (기본 화면)
  if (!sessionId || phase === "selecting") {
    return (
      <main className="min-h-screen flex flex-col bg-background bg-[radial-gradient(circle_at_top_left,rgba(255,255,230,0.08)_0%,transparent_40%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.15)_0%,transparent_50%),radial-gradient(circle_at_bottom_left,rgba(5,150,105,0.1)_0%,transparent_70%)]">
        {/* 오른쪽 사이드바 - 문의 링크 */}
        <ContactSidebar />

        {/* 헤더 */}
        <header className="p-4 border-b border-white/5 backdrop-blur-md sticky top-0 z-50">
          <div className="flex justify-between items-center max-w-6xl mx-auto w-full">
            <Logo size="md" onClick={handleNewSession} />
            <div className="flex items-center gap-3">
              {authLoading ? (
                <div className="h-9 w-20 bg-white/5 rounded-full animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                      {(user.name || user.email)?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-white/80 hidden sm:inline">
                      {user.name || user.email.split('@')[0]}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={logout} className="text-white/40 hover:text-white hover:bg-white/5">
                    로그아웃
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setShowLoginPrompt(true)} className="border-primary/50 text-primary hover:bg-primary/10 rounded-full">
                  로그인
                </Button>
              )}
              {sessionId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewSession}
                  className="text-white/40 hover:text-white hover:bg-white/5 rounded-full"
                >
                  처음으로
                </Button>
              )}
            </div>
          </div>
        </header>

        {statusBadge}

        {/* 메인 콘텐츠 리스트 (스크롤 가능) */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
            {!sessionId ? (
              <div className="space-y-10 sm:space-y-14">

                {/* 1. 웰컴 히어로 섹션 */}
                <div className="text-center space-y-3 sm:space-y-5">
                  {publicStats && publicStats.todayConversations > 0 && !sessionId && (
                    <div className="flex justify-center animate-fade-in-up mb-4">
                      <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-sm text-white/60">오늘 <strong className="text-primary">{publicStats.todayConversations.toLocaleString()}</strong>명이 위로받았어요</span>
                      </div>
                    </div>
                  )}
                  <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white tracking-tight animate-fade-in-up stagger-1 leading-tight" style={{ fontFamily: '"Pretendard Variable", Pretendard, sans-serif' }}>
                    {user?.name ? (
                      <>
                        <span className="text-primary">{user.name}</span>님, <br className="hidden sm:block" />
                        오늘 하루도 정말 수고 많으셨어요.
                      </>
                    ) : (
                      "오늘 하루도 정말 수고 많으셨어요."
                    )}
                  </h1>
                  <p className="text-base sm:text-lg text-white/50 animate-fade-in-up stagger-2 leading-relaxed" style={{ fontFamily: '"Pretendard Variable", Pretendard, sans-serif' }}>
                    마음에 걸리는 게 있다면 편하게 말씀해 주세요.<br className="hidden sm:block" />
                    당신의 고요한 숲이 되어 드릴게요.
                  </p>
                </div>

                {/* 2. 로그인 유도 (비회원) */}
                {!authLoading && !user && !sessionId && (
                  <button
                    onClick={() => setShowLoginPrompt(true)}
                    className="group w-full max-w-xl mx-auto flex rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:p-5 text-left hover:border-primary/50 hover:bg-white/[0.08] transition-all duration-500 animate-fade-in-up stagger-3"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                        <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-white/90">나만의 상담사를 만들어보세요</p>
                        <p className="text-xs text-white/50 mt-0.5">로그인하시면 대화가 저장되고, 회원님을 기억합니다</p>
                      </div>
                    </div>
                  </button>
                )}

                {/* 3. 최근 상담 기록 (회원) */}
                {user && previousSessions.length > 0 && !sessionId && (
                  <div className="max-w-xl mx-auto w-full rounded-[2rem] border border-white/5 bg-white/[0.03] p-6 space-y-4 animate-fade-in-up stagger-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white/80">최근 상담 기록</p>
                      <span className="text-xs text-white/30">{previousSessions.length}개의 대화</span>
                    </div>
                    <div className="grid gap-3">
                      {previousSessions.slice(0, 2).map((session) => {
                        const categoryInfo = categories.find(c => c.id === session.category) || {
                          label: session.category === 'direct' ? '직접 입력' : session.category,
                          color: '#10B981',
                        };
                        return (
                          <button
                            key={session.sessionId}
                            onClick={() => handleResumeSession(session.sessionId)}
                            className="group w-full p-4 rounded-2xl border border-white/5 bg-white/5 hover:border-primary/40 hover:bg-white/[0.08] transition-all duration-300 text-left flex items-center gap-3"
                          >
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white/90 text-xs border border-white/10"
                              style={{ background: `linear-gradient(135deg, ${categoryInfo.color}40, ${categoryInfo.color}20)` }}
                            >
                              {categoryInfo.label[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white/90 truncate group-hover:text-primary">{session.alias || categoryInfo.label}</p>
                              <p className="text-[11px] text-white/40">{getTimeAgo(new Date(session.updatedAt))}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. 카테고리 선택 영역 (메인) */}
                <div className="space-y-4 animate-fade-in-up stagger-4">
                  <div className="text-center space-y-1">
                    <h2 className="text-lg sm:text-xl font-bold text-white">어떤 대화를 시작할까요?</h2>
                    <p className="text-xs text-white/40">당신의 이야기를 들을 준비가 되어 있습니다.</p>
                  </div>

                  <div className="rounded-[2rem] border border-white/20 p-4 sm:p-6 space-y-6 bg-white/10 backdrop-blur-2xl shadow-2xl">
                    {/* 모드 선택 */}
                    <div className="grid grid-cols-3 gap-2">
                      {topLevelModes.map((mode) => (
                        <button
                          key={mode.id}
                          className={`group relative flex flex-col items-center justify-center p-3 rounded-[1.5rem] border transition-all duration-500 bg-gradient-to-br ${mode.gradient} ${selectedTopMode === mode.id
                            ? "bg-white/20 shadow-[0_0_30px_" + mode.glowColor + "]"
                            : "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/15"
                            } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
                          style={{
                            borderColor: selectedTopMode === mode.id ? mode.color : undefined,
                            boxShadow: selectedTopMode === mode.id ? `0 0 30px ${mode.glowColor}` : undefined
                          }}
                          onClick={() => {
                            if (selectedTopMode === mode.id) {
                              setSelectedTopMode(null);
                              setSelectedCounselorType(null);
                            } else {
                              setSelectedTopMode(mode.id);
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
                            className={`mb-2 transition-all duration-500 group-hover:scale-110 ${selectedTopMode === mode.id ? "scale-110" : ""}`}
                            style={{ color: mode.color }}
                          >
                            <div className={`p-2 rounded-xl backdrop-blur-sm transition-all duration-500 ${selectedTopMode === mode.id ? "bg-white/20 border border-white/30" : "bg-white/5 border border-white/10"}`}>
                              {mode.icon}
                            </div>
                          </div>
                          <div className="text-[10px] sm:text-xs font-semibold text-white/90">{mode.label}</div>
                        </button>
                      ))}
                    </div>

                    {/* MBTI 하위 선택 */}
                    {selectedTopMode === "mbti" && (
                      <div className="bg-white/5 rounded-[1.25rem] border border-white/20 p-3 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2">
                        {mbtiSubTypes.map((subType) => (
                          <button
                            key={subType.id}
                            className={`group p-3 rounded-[1.25rem] border transition-all duration-300 bg-gradient-to-br ${subType.gradient} ${selectedCounselorType === subType.id ? "bg-white/20 shadow-[0_0_20px_" + subType.glowColor + "]" : "bg-white/5 border-white/10 hover:bg-white/15"}`}
                            style={{
                              borderColor: selectedCounselorType === subType.id ? subType.color : undefined,
                              boxShadow: selectedCounselorType === subType.id ? `0 0 20px ${subType.glowColor}` : undefined
                            }}
                            onClick={() => setSelectedCounselorType(selectedCounselorType === subType.id ? null : subType.id)}
                          >
                            <div
                              className="mb-1.5 flex justify-center transition-transform group-hover:scale-110"
                              style={{ color: subType.color }}
                            >
                              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                                {subType.icon}
                              </div>
                            </div>
                            <div className="text-[10px] sm:text-xs font-semibold text-white/90 text-center">{subType.label}</div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-[9px] font-medium text-white/30 uppercase tracking-widest">Topic</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          className={`group p-3.5 rounded-[1.25rem] bg-gradient-to-br ${category.gradient} bg-white/[0.08] border border-white/20 transition-all duration-500 hover:bg-white/[0.18] hover:border-white/50 shadow-sm`}
                          style={{
                            '--glow-color': category.glowColor,
                            '--accent-color': category.color
                          } as any}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = `0 6px 25px ${category.glowColor}`;
                            e.currentTarget.style.borderColor = `${category.color}80`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                          }}
                          onClick={() => handleCategorySelect(category.id)}
                          disabled={isLoading}
                        >
                          <div
                            className="mb-2 flex justify-center group-hover:scale-110 transition-transform duration-500 ease-out"
                            style={{ color: category.color }}
                          >
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/10 group-hover:border-white/30 transition-all duration-500">
                              {category.icon}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs font-bold text-white/95 leading-tight">{category.label}</div>
                            <div className="text-[10px] text-white/40 mt-0.5">{category.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5. 직접 입력 및 기타 도구 */}
                <div className="grid sm:grid-cols-2 gap-4 animate-fade-in-up stagger-5 pb-20">
                  <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 flex flex-col justify-between space-y-4">
                    <p className="text-sm text-white/40">마음에 담아둔 이야기를 바로 들려주세요</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={directInput}
                        onChange={(e) => setDirectInput(e.target.value)}
                        placeholder="무슨 일이 있었나요?..."
                        className="flex-1 px-4 h-12 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                      <Button onClick={handleDirectInputSubmit} disabled={!directInput.trim() || isLoading} className="h-12 px-4 rounded-xl bg-primary">시작</Button>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 text-left hover:bg-white/5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:border-primary/30 transition-colors">
                      <svg className="w-5 h-5 text-white/40 group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-white/80">다른 곳에서의 대화 불러오기</p>
                    <p className="text-xs text-white/30 mt-1">이전 상담의 맥락을 연결할 수 있습니다</p>
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-8 pb-32">
                {/* 진단 대화 히스토리 */}
                <div className="space-y-6">
                  {selectionHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex ${item.type === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className={`flex gap-3 max-w-[85%] ${item.type === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        {item.type !== "user" && (
                          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-1 backdrop-blur-xl">
                            <Logo size="sm" showText={false} />
                          </div>
                        )}
                        <div className={`p-4 rounded-[1.5rem] ${item.type === "user" ? "bg-primary/30 text-white border border-primary/40 rounded-tr-sm shadow-lg shadow-primary/10" : "bg-white/12 border border-white/20 text-white/95 rounded-tl-sm backdrop-blur-xl shadow-md"}`}>
                          <p className="text-sm leading-relaxed">{item.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && !isLoadingNewOptions && (
                    <div className="flex justify-start animate-pulse">
                      <div className="flex gap-3 max-w-[85%]">
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 shrink-0" />
                        <div className="p-4 rounded-[1.5rem] bg-white/5 border border-white/10 rounded-tl-sm w-32 h-12" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* 진단 옵션 버튼 그리드 */}
                {!isLoading && options.length > 0 && (
                  <div className="space-y-4 animate-fade-in stagger-1">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-white/5" />
                      <span className="text-[10px] font-medium text-white/20 uppercase tracking-widest">Select an Option</span>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>
                    <div className="grid gap-2.5">
                      {options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(option)}
                          className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left text-sm text-white/80 hover:bg-white/[0.08] hover:border-primary/40 hover:text-white transition-all duration-300 group"
                        >
                          <div className="flex items-center justify-between">
                            <span>{option}</span>
                            <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={handleRequestNewOptions}
                        className="w-full p-3 rounded-2xl border border-dashed border-white/10 text-white/30 text-xs hover:border-white/20 hover:text-white/50 transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isLoadingNewOptions ? "추천 답변을 찾는 중..." : "다른 답변 보기"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 진단 단계 하단 고정 입력창 */}
        {sessionId && phase === "selecting" && (
          <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 sm:pb-10 bg-gradient-to-t from-background via-background/95 to-transparent z-40">
            <div className="max-w-2xl mx-auto">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-40 transition-opacity" />
                <div className="relative flex gap-2 p-1.5 rounded-2xl bg-white/[0.08] border border-white/10 backdrop-blur-2xl focus-within:border-primary/40 transition-all">
                  <input
                    type="text"
                    value={supplementInput}
                    onChange={(e) => setSupplementInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSelectOption(supplementInput.trim())}
                    placeholder="직접 말씀해 주셔도 좋아요..."
                    className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => handleSelectOption(supplementInput.trim())}
                    disabled={isLoading || !supplementInput.trim()}
                    className="px-5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-50 hover:bg-primary/80 transition-all"
                  >
                    전송
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <LoginPromptModal />
        <NotebookLimitModal />
        <SessionSwitchingOverlay />

        {/* 로딩 팝업 (상담 시작 시에만 표시) */}
        {isLoading && !sessionId && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
            <div className="max-w-sm w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl backdrop-blur-2xl">
              <div className="relative w-24 h-24 mx-auto">
                <div className="relative w-full h-full rounded-3xl border-2 border-primary/30 flex items-center justify-center gap-2 overflow-hidden">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
              <p className="text-lg font-bold text-white">경청하려 자세를 고쳐앉는 중...</p>
            </div>
          </div>
        )}

        {/* 미니 모달 등 추가 UI */}
        {showImportModal && (
          <div className="fixed inset-0 bg-background/90 backdrop-blur-xl flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
            <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">
                  {importStep === "category" ? "어떤 주제의 상담이었나요?" :
                    importStep === "text" ? "상담 내용 불러오기" : "요약 확인"}
                </h3>
                <button onClick={() => setShowImportModal(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {importStep === "category" ? (
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setImportCategory(cat.id);
                        setImportStep("text");
                      }}
                      className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/50 hover:bg-white/10 transition-all text-left"
                    >
                      <div className="mb-3 transform group-hover:scale-110 transition-transform">
                        {cat.icon}
                      </div>
                      <p className="text-sm font-bold text-white/90">{cat.label}</p>
                    </button>
                  ))}
                </div>
              ) : importStep === "text" ? (
                <div className="space-y-4">
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="이전 상담 내용을 붙여넣어 주세요..."
                    className="w-full h-48 p-4 text-sm rounded-2xl border border-white/10 bg-white/5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                  <div className="flex gap-3">
                    <Button variant="ghost" className="flex-1 text-white/40 rounded-xl" onClick={() => setImportStep("category")}>이전</Button>
                    <Button className="flex-1 rounded-xl bg-primary hover:bg-primary-hover" onClick={handleSummarizeText} disabled={isImporting || !importText.trim()}>
                      {isImporting ? "분석 중..." : "분석 시작"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    value={importSummary}
                    onChange={(e) => setImportSummary(e.target.value)}
                    className="w-full h-48 p-4 text-sm rounded-2xl border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                  <div className="flex gap-3">
                    <Button variant="ghost" className="flex-1 text-white/40 rounded-xl" onClick={() => setImportStep("text")}>수정</Button>
                    <Button className="flex-1 rounded-xl bg-primary hover:bg-primary-hover" onClick={handleImportStart} disabled={isImporting || !importSummary.trim()}>
                      상담 시작
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    );
  }


  // 모드 선택
  if (phase === "mode") {
    return (
      <main className="min-h-screen flex flex-col bg-background bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.1)_0%,transparent_50%)]">
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
      <main className="min-h-screen flex flex-col bg-background bg-[radial-gradient(circle_at_bottom_left,rgba(5,150,105,0.05)_0%,transparent_50%)]">
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
          <div className="flex-1 max-w-2xl flex flex-col overflow-hidden relative bg-white/40 backdrop-blur-2xl rounded-[32px] border border-white/60 shadow-2xl z-0 ring-1 ring-white/70 order-1 lg:order-2">
            <div className="flex-1 overflow-y-auto px-4 pb-32 pt-4 scrollbar-hide space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start gap-3"}`}
                >
                  {msg.role !== "user" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 mt-1 shadow-sm border border-white/50">
                      <Logo size="sm" showText={false} />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-[24px] px-5 py-3.5 shadow-sm transition-all duration-300 hover:shadow-md ${msg.role === "user"
                      ? "bg-gradient-to-br from-primary to-emerald-400 text-white rounded-tr-sm shadow-primary/20"
                      : "bg-white/95 border border-white/40 text-foreground rounded-tl-sm backdrop-blur-sm shadow-gray-100"
                      }`}
                  >
                    <p className="text-[15px] whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && streamingContent && (
                <div className="flex justify-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 mt-1 shadow-sm border border-white/50">
                    <Logo size="sm" showText={false} />
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
                    <Logo size="sm" showText={false} />
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
