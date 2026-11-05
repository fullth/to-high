"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FullPageLink } from "@/components/full-page-link";
import "./problem-page.css";

export function ProblemPage() {
  const [report, setReport] = useState<"pending" | "accepted" | "sent" | "failed">(
    "pending",
  );
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    fetch(`${base}/problem/report`, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return setReport("failed");
        const result = await response.json();
        setReport(result.state === "pending" ? "accepted" : result.state === "sent" ? "sent" : "failed");
      })
      .catch(() => setReport("failed"))
      .finally(() => window.clearTimeout(timeout));
  }, []);
  return (
    <main className="problem-page">
      <div className="problem-card">
        <Image
          className="problem-levi"
          src="/characters/levi-problem.png"
          alt="문제 안내 표지판을 든 레비"
          width={320}
          height={320}
          priority
        />
        <h1>문제가 발생했어요</h1>
        <p aria-live="polite">
          {report === "pending"
            ? "담당자에게 문제를 알리고 있어요."
            : report === "accepted"
              ? "담당자에게 문제를 알리는 메일을 보내겠습니다."
              : report === "sent"
                ? "담당자에게 이 시간대의 문제 알림이 이미 발송되었어요."
              : "문제 알림을 접수하지 못했어요. 잠시 후 다시 찾아주세요."}
        </p>
        <FullPageLink className="problem-home" href="/">
          홈으로 이동하기
        </FullPageLink>
      </div>
    </main>
  );
}
