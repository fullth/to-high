"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
function CallbackContent() {
  const params = useSearchParams();
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const token = params.get("token");
    window.history.replaceState(null, "", "/auth/callback");
    // Legacy guest sessions and drafts are never carried into the new product.
    localStorage.removeItem("pendingClaimSession");
    for (const key of Object.keys(localStorage))
      if (key.startsWith("guestSession:")) localStorage.removeItem(key);
    if (!token) {
      window.location.replace("/characters?error=auth_failed");
      return;
    }
    localStorage.setItem("accessToken", token);
    window.location.replace("/characters");
  }, [params]);
  return (
    <main className="p-8">
      <p>로그인 처리 중...</p>
    </main>
  );
}
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p>불러오는 중...</p>}>
      <CallbackContent />
    </Suspense>
  );
}
