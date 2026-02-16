"use client";

import { ContactSidebar } from "@/components/contact-sidebar";
import { Logo } from "@/components/logo";
import { TopicButton } from "@/components/topic-button";
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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage, ChatPhase, ResponseMode, ResponseModeOption } from "@/types/chat";

/**
 * 텍스트를 마크다운 형식으로 변환
 * - [제목] 형식을 ## 제목으로 변환
 * - 번호 리스트(1. 2. 3.) 앞에 줄바꿈 추가
 * - 대시 리스트(- 항목) 앞에 줄바꿈 추가
 */
function formatAsMarkdown(text: string): string {
  if (!text) return text;

  let result = text;

  // **제목** 패턴 제거 (예: **대안적 제안**, **상담사의 관점**)
  // 제목만 있는 줄은 완전히 제거
  result = result.replace(/^\s*\*\*[^*]+\*\*\s*$/gm, '');
  // 문장 중간에 있는 **제목** 형식도 일반 텍스트로 변환
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1');

  // [제목] 형식도 제거
  result = result.replace(/\[([^\]]+)\]/g, '\n\n$1\n');

  // 번호 리스트 앞에 줄바꿈 추가 (1. 2. 3. 등)
  result = result.replace(/(\s)(\d+)\.\s/g, '\n$2. ');

  // 대시 리스트 앞에 줄바꿈 추가
  result = result.replace(/(\s)-\s/g, '\n- ');

  // 연속된 줄바꿈 정리 (3개 이상 -> 2개)
  result = result.replace(/\n{3,}/g, '\n\n');

  // 앞뒤 공백 제거
  result = result.trim();

  return result;
}

// 상위 상담 모드 정의
type TopLevelMode = "mbti" | "reaction" | "listening" | null;

const topLevelModes = [
  {
    id: "mbti" as TopLevelMode,
    label: "MBTI 성향 상담",
    description: "성향 맞춤 대화",
    color: "#818cf8",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
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
    color: "#fb7185",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "listening" as TopLevelMode,
    label: "깊은 경청",
    description: "당신의 모든 이야기를",
    color: "#34d399",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
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
    color: "#f472b6",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
  },
  {
    id: "T" as CounselorType,
    label: "T 사고형",
    description: "현실적인 조언이 필요해요",
    color: "#38bdf8",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
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
    color: "#a78bfa",
    label: "나",
    description: "마음, 감정",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M7 21v-2a5 5 0 0 1 10 0v2" />
        <circle cx="12" cy="11" r="1.5" fill="currentColor" />
      </svg>
    )
  },
  {
    id: "future",
    color: "#34d399",
    label: "미래",
    description: "진로, 선택",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2v20M2 12h20" />
        <path d="m16 8-8 8M16 16 8 8" />
        <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" />
      </svg>
    )
  },
  {
    id: "work",
    color: "#38bdf8",
    label: "일",
    description: "업무, 직장",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        <path d="M2 12h20" />
      </svg>
    )
  },
  {
    id: "relationship",
    color: "#fbbf24",
    label: "관계",
    description: "가족, 친구",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  },
  {
    id: "love",
    color: "#fb7185",
    label: "연애",
    description: "사랑, 이별",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    )
  },
  {
    id: "daily",
    color: "#818cf8",
    label: "일상",
    description: "그냥 얘기",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M3 6h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
        <path d="M3 10h18" />
        <path d="M7 14h.01" />
        <path d="M11 14h.01" />
        <path d="M15 14h.01" />
      </svg>
    )
  },
];

// 마음 돌봄 콘텐츠
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
            &ldquo;{content.content}&rdquo;
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

// 세션 제한 에러 타입
interface SessionLimitError extends Error {
  code?: string;
  sessionCount?: number;
  limit?: number;
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
  const [_isLoadingSessions, setIsLoadingSessions] = useState(false);
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
  const [_importError, setImportError] = useState<string | null>(null);

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
      <div className="bg-card border-2 border-border border-r-0 rounded-l-2xl py-3 px-6 shadow-2xl shadow-black/30 flex items-center gap-4 group hover:border-primary/50 transition-all duration-300 pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-primary animate-ping opacity-75" />
          </div>
        </div>
        <div className="w-px h-5 bg-border" />
        <p className="text-sm font-semibold text-foreground whitespace-nowrap">
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
          content: `다시 찾아주셨군요. 지난번에 이런 상담을 하셨어요.\n\n"${res.previousSessionSummary}"\n\n기억하고 있으니 편하게 말씀해 주세요.`,
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
    } catch (err: unknown) {
      console.error(err);
      // 세션 제한 초과 에러 처리
      const sessionErr = err as SessionLimitError;
      if (sessionErr.code === 'SESSION_LIMIT_EXCEEDED') {
        setNotebookLimitError({
          sessionCount: sessionErr.sessionCount || 0,
          limit: sessionErr.limit || 0,
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
          content: `다시 찾아주셨군요. 지난번에 이런 상담을 하셨어요.\n\n"${res.previousSessionSummary}"\n\n기억하고 있으니 편하게 말씀해 주세요.`,
          timestamp: new Date(),
        });
      }

      historyItems.push({ type: "user", content: directInput.trim(), timestamp: new Date() });
      historyItems.push({ type: "assistant", content: res.question, isQuestion: true, timestamp: new Date() });

      setSelectionHistory(historyItems);
      setDirectInput("");
    } catch (err: unknown) {
      console.error(err);
      // 세션 제한 초과 에러 처리
      const sessionErr = err as SessionLimitError;
      if (sessionErr.code === 'SESSION_LIMIT_EXCEEDED') {
        setNotebookLimitError({
          sessionCount: sessionErr.sessionCount || 0,
          limit: sessionErr.limit || 0,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 이전 상담 내용 요약
  const handleSummarizeText = async () => {
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
    } catch (error: unknown) {
      console.error("Summarize failed:", error);
      setImportError("상담 내용을 분석하는 중 오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      setIsImporting(false);
    }
  };

  // 요약된 내용으로 상담 시작
  const handleImportStart = async () => {
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
    } catch (error: unknown) {
      console.error("Import failed:", error);
      setImportError("상담을 시작하는 중 오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      setIsImporting(false);
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
          // 상담가 유형이 선택된 경우 모드 선택 스킵하고 바로 채팅 (selecting 페이즈 유지)
          if (selectedCounselorType) {
            setStreamingContent("");
            let content = "";
            try {
              await setResponseModeStream(sessionId, "comfort", token || undefined, (chunk) => {
                content += chunk;
                setStreamingContent(content);
              });
              // 채팅 응답을 selectionHistory에 추가
              setSelectionHistory(prev => [...prev, { type: "assistant", content, timestamp: new Date() }]);
            } finally {
              setStreamingContent("");
            }
            // 옵션 초기화 (직접 입력만 가능하도록)
            setOptions([]);
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
  const _handleRequestFeedback = useCallback(async () => {
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
        // AI 응답을 selectionHistory에 추가 (selecting 페이즈 유지)
        setSelectionHistory(prev => [...prev, { type: "assistant", content, timestamp: new Date() }]);
        setOptions([]); // 옵션 초기화 - 직접 입력만 가능
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
  const _handleSelectModeInChat = useCallback(async (mode: ResponseMode) => {
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
      // AI 응답을 selectionHistory에 추가 (selecting 페이즈 유지)
      setSelectionHistory(prev => [...prev, { type: "assistant", content, timestamp: new Date() }]);
      setOptions([]); // 옵션 초기화 - 직접 입력만 가능
    } finally {
      setStreamingContent("");
      setIsLoading(false);
    }
  }, [sessionId, token, responseModes]);

  const _handleSupplementSubmit = useCallback(async () => {
    if (!supplementInput.trim()) return;
    await handleSelectOption(supplementInput.trim());
  }, [supplementInput, handleSelectOption]);

  // 모드 선택
  const handleSelectMode = useCallback(
    async (mode: string) => {
      if (!sessionId) return;
      setIsLoading(true);
      setStreamingContent("");

      let content = "";
      try {
        await setResponseModeStream(sessionId, mode, token || undefined, (chunk) => {
          content += chunk;
          setStreamingContent(content);
        });
        // AI 응답을 selectionHistory에 추가 (selecting 페이즈 유지)
        setSelectionHistory(prev => [...prev, { type: "assistant", content, timestamp: new Date() }]);
        setOptions([]); // 옵션 초기화 - 직접 입력만 가능
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
          content: `지난번에 이런 상담을 하셨어요.\n\n**${categoryLabel}** 주제로 ${res.turnCount || 0}회 대화하셨습니다.\n\n"${summaryText}"`,
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

  // 세션 삭제
  const handleDeleteSession = async (targetSessionId: string) => {
    if (!token) return;
    if (!confirm("이 상담 기록을 삭제하시겠어요?")) return;
    try {
      await deleteSession(targetSessionId, token);
      setPreviousSessions((prev) =>
        prev.filter((s) => s.sessionId !== targetSessionId)
      );
      // 현재 세션이 삭제된 경우 새 세션으로 이동
      if (sessionId === targetSessionId) {
        handleNewSession();
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
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
      <main className="min-h-screen flex flex-col bg-background">
        {/* 오른쪽 사이드바 - 문의 링크 */}
        <ContactSidebar />

        {/* 헤더 - 더 넓고 깔끔하게 */}
        <header className="px-6 py-5 border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="flex justify-between items-center max-w-5xl mx-auto w-full">
            <Logo size="md" onClick={handleNewSession} />
            <div className="flex items-center gap-4">
              {authLoading ? (
                <div className="h-10 w-24 bg-muted rounded-xl animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {(user.name || user.email)?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-foreground hidden sm:inline">
                    {user.name || user.email.split('@')[0]}
                  </span>
                  <div className="w-px h-5 bg-border hidden sm:block" />
                  <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground px-2 h-7 text-xs">
                    로그아웃
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setShowLoginPrompt(true)}>
                  로그인
                </Button>
              )}
              {sessionId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewSession}
                >
                  처음으로
                </Button>
              )}
            </div>
          </div>
        </header>

        {statusBadge}

        {/* 메인 콘텐츠 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-12 sm:py-20">
            {!sessionId ? (
              <div className="space-y-16 sm:space-y-24">

                {/* 1. 히어로 섹션 - 토스 스타일 대형 타이포 */}
                <section className="text-center space-y-6">
                  {publicStats && publicStats.todayConversations > 0 && (
                    <div className="flex justify-center animate-fade-in-up">
                      <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-card border border-border">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                        </span>
                        <span className="text-sm font-medium text-muted-foreground">오늘 <strong className="text-primary font-bold">{publicStats.todayConversations.toLocaleString()}</strong>명이 위로받았어요</span>
                      </div>
                    </div>
                  )}

                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight animate-fade-in-up stagger-1 leading-[1.15]">
                    {user?.name ? (
                      <>
                        <span className="text-primary">{user.name}</span>님,<br />
                        오늘 하루도<br className="sm:hidden" /> 수고 많으셨어요
                      </>
                    ) : (
                      <>오늘 하루도<br className="sm:hidden" /> 수고 많으셨어요</>
                    )}
                  </h1>

                  <p className="text-lg sm:text-xl text-muted-foreground animate-fade-in-up stagger-2 max-w-md mx-auto">
                    마음에 걸리는 게 있다면<br className="sm:hidden" /> 편하게 말씀해 주세요
                  </p>
                </section>

                {/* 2. 로그인 유도 (비회원) */}
                {!authLoading && !user && !sessionId && (
                  <section className="animate-fade-in-up stagger-3">
                    <button
                      onClick={() => setShowLoginPrompt(true)}
                      className="group w-full p-6 rounded-2xl bg-card border-2 border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 text-left"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-bold text-foreground">나만의 상담사를 만들어보세요</p>
                          <p className="text-sm text-muted-foreground mt-1">로그인하시면 대화가 저장되고, 회원님을 기억합니다</p>
                        </div>
                        <svg className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </section>
                )}

                {/* 3. 최근 상담 기록 (회원) */}
                {user && previousSessions.length > 0 && !sessionId && (
                  <section className="animate-fade-in-up stagger-3 space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-lg font-bold text-foreground">최근 상담</h3>
                      <span className="text-sm text-muted-foreground">{previousSessions.length}개</span>
                    </div>
                    <div className="grid gap-3">
                      {previousSessions.slice(0, 3).map((session) => {
                        const categoryInfo = categories.find(c => c.id === session.category) || {
                          label: session.category === 'direct' ? '직접 입력' : session.category,
                          color: '#34d399',
                        };
                        const isEditing = editingSessionId === session.sessionId;
                        const displayName = session.alias || session.summary?.slice(0, 20) || categoryInfo.label;

                        return (
                          <div
                            key={session.sessionId}
                            className="group w-full p-5 rounded-2xl bg-card border-2 border-border hover:border-primary/50 transition-all duration-300 text-left flex items-center gap-4"
                          >
                            <button
                              onClick={() => !isEditing && handleResumeSession(session.sessionId)}
                              disabled={isEditing}
                              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold transition-transform hover:scale-105"
                              style={{ backgroundColor: `${categoryInfo.color}20`, color: categoryInfo.color }}
                            >
                              {categoryInfo.label[0]}
                            </button>
                            <div className="flex-1 min-w-0">
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
                                  className="w-full text-base font-semibold bg-secondary border-2 border-primary rounded-lg px-3 py-1.5 focus:outline-none"
                                  autoFocus
                                  maxLength={50}
                                  placeholder="별칭 입력"
                                />
                              ) : (
                                <button
                                  onClick={() => handleResumeSession(session.sessionId)}
                                  className="block w-full text-left"
                                >
                                  <p className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">{displayName}</p>
                                  <p className="text-sm text-muted-foreground mt-0.5">{getTimeAgo(new Date(session.updatedAt))}</p>
                                </button>
                              )}
                            </div>
                            {!isEditing && (
                              <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSessionId(session.sessionId);
                                    setEditingAlias(session.alias || "");
                                  }}
                                  className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                  title="별칭 수정"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSession(session.sessionId);
                                  }}
                                  className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                  title="삭제"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                            {!isEditing && (
                              <svg className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 hidden sm:block sm:group-hover:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* 4. 카테고리 선택 영역 (메인) */}
                <section className="space-y-10 animate-fade-in-up stagger-4">
                  <div className="text-center space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">어떤 대화를 시작할까요?</h2>
                    <p className="text-lg text-muted-foreground">당신의 이야기를 들을 준비가 되어 있습니다</p>
                  </div>

                  <div className="rounded-3xl border-2 border-border p-8 sm:p-10 space-y-10 bg-card">
                    {/* 모드 선택 */}
                    <div className="grid grid-cols-3 gap-4">
                      {topLevelModes.map((mode) => (
                        <button
                          key={mode.id}
                          className={`group relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-300 ${selectedTopMode === mode.id
                            ? "bg-secondary border-primary shadow-lg shadow-primary/20"
                            : "bg-card border-border hover:border-primary/50 hover:shadow-lg hover:shadow-black/20"
                            } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
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
                            className={`mb-3 transition-all duration-300 group-hover:scale-110 ${selectedTopMode === mode.id ? "scale-110" : ""}`}
                            style={{ color: mode.color }}
                          >
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300" style={{ backgroundColor: `${mode.color}20` }}>
                              {mode.icon}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-foreground">{mode.label}</div>
                        </button>
                      ))}
                    </div>

                    {/* MBTI 하위 선택 */}
                    {selectedTopMode === "mbti" && (
                      <div className="bg-secondary rounded-2xl border-2 border-border p-4 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                        {mbtiSubTypes.map((subType) => (
                          <button
                            key={subType.id}
                            className={`group p-5 rounded-xl border-2 transition-all duration-300 ${selectedCounselorType === subType.id ? "bg-card border-primary shadow-lg shadow-primary/20" : "bg-card border-border hover:border-primary/50"}`}
                            onClick={() => setSelectedCounselorType(selectedCounselorType === subType.id ? null : subType.id)}
                          >
                            <div
                              className="mb-2 flex justify-center transition-transform group-hover:scale-110"
                              style={{ color: subType.color }}
                            >
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${subType.color}20` }}>
                                {subType.icon}
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-foreground text-center">{subType.label}</div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {categories.map((category) => (
                        <TopicButton
                          key={category.id}
                          icon={category.icon}
                          label={category.label}
                          description={category.description}
                          color={category.color}
                          onClick={() => handleCategorySelect(category.id)}
                          disabled={isLoading}
                        />
                      ))}
                    </div>
                  </div>
                </section>

                {/* 5. 직접 입력 */}
                <section className="animate-fade-in-up stagger-5 space-y-4">
                  <h3 className="text-lg font-bold text-foreground px-1">직접 이야기하기</h3>
                  <div className="rounded-2xl border-2 border-border bg-card p-6 space-y-4">
                    <p className="text-muted-foreground">우리 천천히 얘기해봐요</p>
                    <div className="flex gap-3 w-full">
                      <input
                        type="text"
                        value={directInput}
                        onChange={(e) => setDirectInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && directInput.trim() && handleDirectInputSubmit()}
                        placeholder="당신의 이야기를 들려주세요"
                        className="flex-1 min-w-0 px-4 sm:px-5 h-12 sm:h-14 rounded-xl bg-secondary border-2 border-transparent text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                      />
                      <Button onClick={handleDirectInputSubmit} disabled={!directInput.trim() || isLoading} size="lg" className="shrink-0 h-12 sm:h-14 px-4 sm:px-6">
                        시작
                      </Button>
                    </div>
                  </div>
                </section>

                {/* 6. 대화 불러오기 */}
                <section className="animate-fade-in-up stagger-6 pb-20">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="w-full p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-all duration-300 group text-left flex items-center gap-5"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      <svg className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">다른 곳에서의 대화 불러오기</p>
                      <p className="text-sm text-muted-foreground mt-1">이전 상담의 맥락을 연결할 수 있습니다</p>
                    </div>
                    <svg className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </section>
              </div>
            ) : (
              <div className="space-y-6 pb-32">
                {/* 오늘의 위로 + 최근 상담 (세션 중에도 표시) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <MindfulnessCard />
                  {user && previousSessions.length > 0 && (
                    <div className="p-4 rounded-2xl bg-card border-2 border-border">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3">최근 상담</h4>
                      <div className="space-y-2">
                        {previousSessions.slice(0, 2).map((session) => {
                          const categoryInfo = categories.find(c => c.id === session.category) || {
                            label: session.category === 'direct' ? '직접 입력' : session.category,
                            color: '#34d399',
                          };
                          const displayName = session.alias || session.summary?.slice(0, 15) || categoryInfo.label;
                          return (
                            <button
                              key={session.sessionId}
                              onClick={() => handleResumeSession(session.sessionId)}
                              className="w-full p-2 rounded-lg bg-secondary/50 hover:bg-secondary text-left text-sm flex items-center gap-2 transition-colors"
                            >
                              <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                                style={{ backgroundColor: `${categoryInfo.color}20`, color: categoryInfo.color }}>
                                {categoryInfo.label[0]}
                              </span>
                              <span className="truncate text-foreground">{displayName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 진단 대화 히스토리 */}
                <div className="space-y-5">
                  {selectionHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex ${item.type === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      <div className={`flex gap-4 max-w-[90%] ${item.type === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        {item.type !== "user" && (
                          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                            <Logo size="sm" showText={false} />
                          </div>
                        )}
                        <div className={`p-5 rounded-2xl ${item.type === "user" ? "bg-primary text-primary-foreground rounded-tr-md" : "bg-card border-2 border-border text-foreground rounded-tl-md"}`}>
                          <div className="markdown-content text-base leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {formatAsMarkdown(item.content)}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && !isLoadingNewOptions && (
                    <div className="flex justify-start animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
                        <div className="p-5 rounded-2xl bg-muted rounded-tl-md w-40 h-14" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* 진단 옵션 버튼 그리드 */}
                {!isLoading && options.length > 0 && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">선택하기</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(option)}
                          className="w-full p-3 sm:p-4 rounded-xl bg-card border-2 border-border text-left hover:border-primary/50 transition-all duration-300 group"
                        >
                          <span className="text-sm text-foreground line-clamp-2">{option}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleRequestNewOptions}
                      className="w-full p-3 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm hover:border-primary/50 hover:text-foreground transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {isLoadingNewOptions ? "추천 답변을 찾는 중..." : "다른 답변 보기"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 진단 단계 하단 고정 입력창 */}
        {sessionId && phase === "selecting" && (
          <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 sm:pb-8 bg-gradient-to-t from-background via-background to-transparent z-40">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3 p-2 rounded-2xl bg-card border-2 border-border">
                <input
                  type="text"
                  value={supplementInput}
                  onChange={(e) => setSupplementInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && supplementInput.trim() && handleSelectOption(supplementInput.trim())}
                  placeholder="직접 말씀해 주셔도 좋아요..."
                  className="flex-1 bg-transparent px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => handleSelectOption(supplementInput.trim())}
                  disabled={isLoading || !supplementInput.trim()}
                  size="lg"
                >
                  전송
                </Button>
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
