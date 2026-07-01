"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { claimSession } from "@/lib/api";

function CallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      window.location.href = "/?error=auth_failed";
      return;
    }

    localStorage.setItem("accessToken", token);

    // 로그인 전 진행하던 게스트 대화가 있으면 이어받고 그 화면으로 복귀한다.
    const pendingSession = localStorage.getItem("pendingClaimSession");
    if (pendingSession) {
      localStorage.removeItem("pendingClaimSession");
      claimSession(pendingSession, token)
        .catch(() => {
          // 이어받기 실패해도 로그인은 됐으니 해당 세션으로 이동은 시도
        })
        .finally(() => {
          window.location.href = `/chat/${pendingSession}`;
        });
      return;
    }

    window.location.href = "/";
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">로그인 처리 중...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">불러오는 중...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
