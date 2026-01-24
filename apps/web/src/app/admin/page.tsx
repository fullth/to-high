"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminDashboard, getAdminUsers, DashboardStats, AdminUser } from "../../lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    async function loadData() {
      try {
        const token = localStorage.getItem("token")!;
        const [dashboardData, usersData] = await Promise.all([
          getAdminDashboard(token),
          getAdminUsers(token),
        ]);
        setStats(dashboardData);
        setUsers(usersData.users);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("403")) {
          setError("관리자 권한이 필요합니다.");
        } else {
          setError("데이터를 불러오는데 실패했습니다.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  if (loading) {
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
        <h1 className="text-3xl font-bold mb-8">관리자 대시보드</h1>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard title="전체 사용자" value={stats?.totalUsers ?? 0} />
          <StatCard title="전체 세션" value={stats?.totalSessions ?? 0} />
          <StatCard title="활성 세션" value={stats?.activeSessions ?? 0} />
          <StatCard title="오늘 가입" value={stats?.todayUsers ?? 0} />
          <StatCard title="오늘 세션" value={stats?.todaySessions ?? 0} />
          <StatCard title="구독자" value={stats?.subscribers ?? 0} />
        </div>

        {/* 사용자 목록 */}
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
                          <img
                            src={user.picture}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
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
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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
    return "오늘";
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
