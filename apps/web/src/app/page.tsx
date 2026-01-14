"use client";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";

const categories = [
  { id: "work", label: "직장", description: "업무, 상사, 동료 관계" },
  { id: "relationship", label: "인간관계", description: "친구, 가족, 연인" },
  { id: "self", label: "나 자신", description: "자존감, 불안, 우울" },
  { id: "future", label: "미래", description: "진로, 목표, 불확실함" },
];

export default function Home() {
  const { user, isLoading, login, logout } = useAuth();

  const handleCategorySelect = (categoryId: string) => {
    console.log("Selected category:", categoryId);
    // TODO: 세션 시작 API 호출 후 채팅 페이지로 이동
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">To high; 위로 - AI 기반 상담 서비스</h1>
          <p className="text-muted-foreground">
            처음부터 다 말하기 어려워도 괜찮아요.
            <br />
            천천히 함께 이야기해봐요.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            오늘은 어떤 이야기를 하고 싶으세요?
          </p>

          <div className="grid gap-3">
            {categories.map((category) => (
              <Card
                key={category.id}
                className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                onClick={() => handleCategorySelect(category.id)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">{category.label}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <div className="pt-4">
          {isLoading ? (
            <Button variant="outline" className="w-full" disabled>
              로딩 중...
            </Button>
          ) : user ? (
            <div className="space-y-2">
              <p className="text-sm text-center">{user.email}님 환영합니다</p>
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

        <div className="pt-6 border-t">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            간단한 선택지로 시작해서 대화를 나누다 보면,
            <br />
            AI가 당신의 상황을 이해하고 점점 더 좋은 상담을 해드려요.
          </p>
        </div>
      </div>
    </main>
  );
}
