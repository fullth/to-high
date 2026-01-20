"use client";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { startSession, startSessionWithText } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

const categories = [
  { id: "self", label: "나 자신", description: "자존감, 불안, 우울" },
  { id: "future", label: "미래", description: "진로, 목표, 불확실함" },
  { id: "work", label: "직장", description: "업무, 상사, 동료 관계" },
  { id: "relationship", label: "인간관계", description: "친구, 가족, 연인" },
];

export default function Home() {
  const router = useRouter();
  const { user, token, isLoading, login, logout } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [directInput, setDirectInput] = useState("");

  const handleCategorySelect = async (categoryId: string) => {
    setIsStarting(true);
    try {
      const res = await startSession(categoryId, token || undefined);
      const params = new URLSearchParams({
        question: res.question,
        options: JSON.stringify(res.options),
      });
      router.push(`/chat/${res.sessionId}?${params.toString()}`);
    } catch (err) {
      console.error(err);
      setIsStarting(false);
    }
  };

  const handleDirectInputSubmit = async () => {
    if (!directInput.trim()) return;
    setIsStarting(true);
    try {
      const res = await startSessionWithText(directInput.trim(), token || undefined);
      const params = new URLSearchParams({
        question: res.question,
        options: JSON.stringify(res.options),
      });
      router.push(`/chat/${res.sessionId}?${params.toString()}`);
    } catch (err) {
      console.error(err);
      setIsStarting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-background to-secondary/20">
      <div className="max-w-lg w-full space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground/90">
            To high; 위로
          </h1>
          <p className="text-lg text-muted-foreground">
            천천히 함께 이야기해봐요
          </p>
        </div>

        {/* 카테고리 2x2 그리드 */}
        <div className="space-y-4">
          <p className="text-center text-muted-foreground">
            나누고 싶은 이야기를 선택해주세요
          </p>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                className={`p-5 rounded-xl border bg-card text-left transition-all duration-200 hover:border-primary/40 hover:bg-secondary/30 ${isStarting ? "opacity-50 pointer-events-none" : ""}`}
                onClick={() => handleCategorySelect(category.id)}
                disabled={isStarting}
              >
                <div className="text-lg font-medium">{category.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{category.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 직접 입력 - 인라인 스타일 */}
        <div className="flex gap-3 items-stretch">
          <input
            type="text"
            value={directInput}
            onChange={(e) => setDirectInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDirectInputSubmit()}
            placeholder="직접 이야기하기..."
            className="flex-1 px-4 h-12 text-base rounded-xl border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            disabled={isStarting}
          />
          <Button
            className="h-12 px-6"
            onClick={handleDirectInputSubmit}
            disabled={isStarting || !directInput.trim()}
          >
            시작
          </Button>
        </div>

        {/* 로그인 영역 */}
        <div className="pt-4">
          {isLoading ? (
            <Button variant="outline" className="w-full" disabled>
              로딩 중...
            </Button>
          ) : user ? (
            <div className="space-y-2">
              <p className="text-sm text-center text-muted-foreground">{user.email}님 환영합니다</p>
              <Button variant="outline" className="w-full" onClick={logout}>
                로그아웃
              </Button>
            </div>
          ) : (
            <>
              <Button variant="outline" className="w-full" onClick={login}>
                Google로 로그인
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                로그인하면 상담 기록을 저장할 수 있어요
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
