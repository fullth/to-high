"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function CallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      localStorage.setItem("accessToken", token);
      window.location.href = "/";
    } else {
      window.location.href = "/?error=auth_failed";
    }
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
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
