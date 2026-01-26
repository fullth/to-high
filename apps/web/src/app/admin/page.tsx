"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  getAdminDashboard,
  getAdminUsers,
  getAdminSessions,
  getAdminSessionDetail,
  deleteAdminSession,
  deleteAdminSessions,
  DashboardStats,
  AdminUser,
  AdminSession,
  AdminSessionDetail,
} from "../../lib/api";

type TabType = "dashboard" | "users" | "sessions";
type SessionFilter = "all" | "anonymous" | "logged-in";

export default function AdminPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [sessionDetail, setSessionDetail] = useState<AdminSessionDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      router.push("/");
      return;
    }

    loadDashboard();
  }, [token, authLoading, router]);

  async function loadDashboard() {
    try {
      setLoading(true);
      const [dashboardData, usersData] = await Promise.all([
        getAdminDashboard(token!),
        getAdminUsers(token!),
      ]);
      setStats(dashboardData);
      setUsers(usersData.users);
    } catch (err: unknown) {
      console.error("Admin load error:", err);
      if (err instanceof Error && (err.message.includes("403") || err.message.includes("Forbidden"))) {
        setError("관리자 권한이 필요합니다.");
      } else {
        setError("데이터를 불러오는데 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadSessions() {
    try {
      setLoading(true);
      const data = await getAdminSessions(token!, {
        anonymous: sessionFilter === "anonymous" ? true : sessionFilter === "logged-in" ? false : undefined,
        limit: 100,
      });
      setSessions(data.sessions);
      setSessionsTotal(data.total);
      setSelectedSessions(new Set());
    } catch (err) {
      console.error("Sessions load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "sessions" && token) {
      loadSessions();
    }
  }, [activeTab, sessionFilter, token]);

  async function handleViewSession(sessionId: string) {
    try {
      const detail = await getAdminSessionDetail(sessionId, token!);
      setSessionDetail(detail);
      setShowDetailModal(true);
    } catch (err) {
      console.error("Session detail error:", err);
      alert("세션 정보를 불러오는데 실패했습니다.");
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm("이 세션을 삭제하시겠습니까?")) return;

    try {
      setIsDeleting(true);
      await deleteAdminSession(sessionId, token!);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSessionsTotal((prev) => prev - 1);
      if (showDetailModal && sessionDetail?.id === sessionId) {
        setShowDetailModal(false);
        setSessionDetail(null);
      }
    } catch (err) {
      console.error("Delete session error:", err);
      alert("세션 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDeleteSelectedSessions() {
    if (selectedSessions.size === 0) return;
    if (!confirm(`선택한 ${selectedSessions.size}개의 세션을 삭제하시겠습니까?`)) return;

    try {
      setIsDeleting(true);
      const result = await deleteAdminSessions(Array.from(selectedSessions), token!);
      setSessions((prev) => prev.filter((s) => !selectedSessions.has(s.id)));
      setSessionsTotal((prev) => prev - result.deletedCount);
      setSelectedSessions(new Set());
      alert(`${result.deletedCount}개의 세션이 삭제되었습니다.`);
    } catch (err) {
      console.error("Delete sessions error:", err);
      alert("세션 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  function toggleSessionSelection(sessionId: string) {
    setSelectedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  }

  function toggleAllSessions() {
    if (selectedSessions.size === sessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(sessions.map((s) => s.id)));
    }
  }

  if (authLoading || (loading && activeTab === "dashboard")) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">관리자 대시보드</h1>

        {/* 탭 네비게이션 */}
        <div className="flex gap-2 mb-6 border-b border-gray-700 pb-4">
          {(["dashboard", "users", "sessions"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {tab === "dashboard" ? "대시보드" : tab === "users" ? "사용자" : "세션 관리"}
            </button>
          ))}
        </div>

        {/* 대시보드 탭 */}
        {activeTab === "dashboard" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <StatCard title="전체 사용자" value={stats?.totalUsers ?? 0} />
              <StatCard title="전체 세션" value={stats?.totalSessions ?? 0} />
              <StatCard title="활성 세션" value={stats?.activeSessions ?? 0} />
              <StatCard title="오늘 가입" value={stats?.todayUsers ?? 0} />
              <StatCard title="오늘 세션" value={stats?.todaySessions ?? 0} />
              <StatCard title="구독자" value={stats?.subscribers ?? 0} />
            </div>
          </>
        )}

        {/* 사용자 탭 */}
        {activeTab === "users" && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold">사용자 목록 ({users.length}명)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">사용자</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">이메일</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">세션 수</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">구독</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">레거시</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">마지막 세션</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">가입일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.picture && (
                            <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
                          )}
                          <span className="font-medium">{user.name || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{user.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium">
                          {user.sessionCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {user.isSubscribed ? (
                          <span className="text-green-400">구독중</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {user.isGrandfathered ? (
                          <span className="text-yellow-400">면제</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {user.lastSessionAt ? (
                          <div>
                            <div>{formatDate(user.lastSessionAt)}</div>
                            {user.lastCategory && (
                              <div className="text-xs text-gray-500">{user.lastCategory}</div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 세션 관리 탭 */}
        {activeTab === "sessions" && (
          <div className="space-y-4">
            {/* 필터 및 액션 */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2">
                {(["all", "anonymous", "logged-in"] as SessionFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSessionFilter(filter)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      sessionFilter === filter
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {filter === "all" ? "전체" : filter === "anonymous" ? "비로그인" : "로그인"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">
                  {selectedSessions.size > 0 && `${selectedSessions.size}개 선택`}
                </span>
                {selectedSessions.size > 0 && (
                  <button
                    onClick={handleDeleteSelectedSessions}
                    disabled={isDeleting}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium disabled:opacity-50"
                  >
                    {isDeleting ? "삭제 중..." : "선택 삭제"}
                  </button>
                )}
              </div>
            </div>

            {/* 세션 목록 */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-semibold">세션 목록 ({sessionsTotal}개)</h2>
                <button
                  onClick={() => loadSessions()}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  새로고침
                </button>
              </div>
              {loading ? (
                <div className="p-8 text-center text-gray-400">로딩 중...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedSessions.size === sessions.length && sessions.length > 0}
                            onChange={toggleAllSessions}
                            className="rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">사용자</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">카테고리</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">요약</th>
                        <th className="px-4 py-3 text-center text-sm font-medium">턴</th>
                        <th className="px-4 py-3 text-center text-sm font-medium">상태</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">생성일</th>
                        <th className="px-4 py-3 text-center text-sm font-medium">액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {sessions.map((session) => (
                        <tr key={session.id} className="hover:bg-gray-750">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedSessions.has(session.id)}
                              onChange={() => toggleSessionSelection(session.id)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              {session.userId === "anonymous" ? (
                                <span className="text-yellow-400">비로그인</span>
                              ) : (
                                <div>
                                  <div className="font-medium">{session.userName || "-"}</div>
                                  <div className="text-xs text-gray-500">{session.userEmail}</div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {session.category || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                            {session.summary || "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">
                              {session.turnCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                session.status === "active"
                                  ? "bg-green-600/30 text-green-400"
                                  : "bg-gray-600/30 text-gray-400"
                              }`}
                            >
                              {session.status === "active" ? "진행중" : "완료"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {formatDate(session.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleViewSession(session.id)}
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                보기
                              </button>
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                disabled={isDeleting}
                                className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 세션 상세 모달 */}
      {showDetailModal && sessionDetail && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">세션 상세</h3>
                <div className="text-sm text-gray-400 mt-1">
                  {sessionDetail.userId === "anonymous" ? (
                    <span className="text-yellow-400">비로그인 사용자</span>
                  ) : (
                    <span>
                      {sessionDetail.userName || sessionDetail.userEmail}
                    </span>
                  )}
                  <span className="mx-2">|</span>
                  <span>{sessionDetail.category || "직접 입력"}</span>
                  <span className="mx-2">|</span>
                  <span>{sessionDetail.turnCount}턴</span>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* 메타 정보 */}
            <div className="px-6 py-3 border-b border-gray-700 bg-gray-750 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">상태:</span>{" "}
                <span className={sessionDetail.status === "active" ? "text-green-400" : "text-gray-400"}>
                  {sessionDetail.status === "active" ? "진행중" : "완료"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">상담 유형:</span>{" "}
                <span className="text-gray-300">{sessionDetail.counselorType || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500">응답 모드:</span>{" "}
                <span className="text-gray-300">{sessionDetail.responseMode || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500">저장:</span>{" "}
                <span className="text-gray-300">
                  {sessionDetail.isSaved ? sessionDetail.savedName || "저장됨" : "-"}
                </span>
              </div>
            </div>

            {/* 요약 */}
            {sessionDetail.summary && (
              <div className="px-6 py-3 border-b border-gray-700">
                <div className="text-xs text-gray-500 mb-1">요약</div>
                <div className="text-sm text-gray-300">{sessionDetail.summary}</div>
              </div>
            )}

            {/* 대화 내용 */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="text-xs text-gray-500 mb-3">
                전체 대화 ({sessionDetail.fullContext.length}개 메시지)
              </div>
              <div className="space-y-3">
                {sessionDetail.fullContext.length > 0 ? (
                  sessionDetail.fullContext.map((message, idx) => {
                    const isUser = message.startsWith("[사용자]") || message.startsWith("사용자:");
                    const isSystem = message.startsWith("[시스템]") || message.startsWith("[이전 상담");
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg text-sm ${
                          isSystem
                            ? "bg-purple-900/30 border border-purple-700/30"
                            : isUser
                            ? "bg-blue-900/30 border border-blue-700/30"
                            : "bg-gray-700/50 border border-gray-600/30"
                        }`}
                      >
                        <pre className="whitespace-pre-wrap font-sans">{message}</pre>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-gray-500 text-center py-8">대화 내용이 없습니다.</div>
                )}
              </div>
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 border-t border-gray-700 flex justify-between items-center">
              <div className="text-xs text-gray-500">
                생성: {formatDate(sessionDetail.createdAt)} | 수정: {formatDate(sessionDetail.updatedAt)}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeleteSession(sessionDetail.id)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {isDeleting ? "삭제 중..." : "세션 삭제"}
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="text-gray-400 text-sm mb-1">{title}</div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `오늘 ${date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
  } else if (diffDays === 1) {
    return "어제";
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
}
