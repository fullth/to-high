"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getBudgetStatus, topupBudget, type BudgetStatus } from "@/lib/api";
import "./budget.css";

type Pending = { amount: number; id: string };
const formatWon = (milliWon: number) =>
  `${(milliWon / 1000).toLocaleString("ko-KR", { maximumFractionDigits: 3 })}원`;

export default function BudgetAdminPage() {
  const { token, user, isLoading, login } = useAuth();
  const pendingKey = user?.userId ? `budgetTopupPending:${user.userId}` : null;
  const [status, setStatus] = useState<BudgetStatus | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const currentToken = useRef(token);
  useEffect(() => { currentToken.current = token; }, [token]);

  function startLogin(provider: () => void) {
    try {
      sessionStorage.setItem("authReturnTo", "budget");
    } catch {
      setError("로그인 후 이 페이지로 돌아오려면 브라우저 저장 공간이 필요해요.");
      return;
    }
    provider();
  }

  const load = useCallback(async () => {
    if (!token || !user?.userId) return;
    try {
      const next = await getBudgetStatus(token);
      if (currentToken.current !== token) return;
      setStatus(next);
      setError("");
    } catch {
      if (currentToken.current !== token) return;
      setStatus(null);
      setError(
        "예산 정보를 불러오지 못했어요. 관리자 권한과 연결 상태를 확인해 주세요.",
      );
    }
  }, [token, user?.userId]);

  useEffect(() => {
    setStatus(null);
    setPending(null);
    if (!pendingKey) return;
    try {
      const raw = sessionStorage.getItem(pendingKey);
      if (raw) {
        const saved = JSON.parse(raw) as Pending;
        if (
          /^[a-f0-9]{32}$/.test(saved.id) &&
          Number.isSafeInteger(saved.amount) &&
          saved.amount === 10_000
        ) {
          setPending({ amount: 10_000, id: saved.id });
        }
      }
    } catch {
      /* Invalid local state is ignored. */
    }
  }, [pendingKey]);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !pendingKey || submitting.current) return;
    if (!status) return;
    const operation = pending ?? {
      amount: 10_000,
      id: crypto.randomUUID().replaceAll("-", ""),
    };
    try {
      sessionStorage.setItem(pendingKey, JSON.stringify(operation));
    } catch {
      setError("승인 요청을 안전하게 저장할 수 없어 진행하지 않았어요.");
      return;
    }
    submitting.current = true;
    setPending(operation);
    setBusy(true);
    setError("");
    try {
      await topupBudget(token, operation.id);
      sessionStorage.removeItem(pendingKey);
      if (currentToken.current !== token) return;
      setPending(null);
      await load();
    } catch {
      if (currentToken.current !== token) return;
      setError(
        "승인 결과를 확인하지 못했어요. 관리자 권한과 연결 상태를 확인한 뒤 같은 요청으로 다시 확인해 주세요.",
      );
    } finally {
        submitting.current = false;
      setBusy(false);
    }
  }

  if (isLoading) return <main className="budget-page"><div className="budget-content"><p className="budget-card">확인 중이에요.</p></div></main>;
  if (!token)
    return (
      <main className="budget-page"><div className="budget-content budget-card">
        <p>관리자 로그인이 필요해요.</p>
        {error && <p role="alert">{error}</p>}
        <button
          onClick={() => startLogin(login)}
          className="budget-button mt-4"
        >
          Google 로그인
        </button>
      </div></main>
    );
  return (
    <main className="budget-page"><div className="budget-content space-y-6">
      <h1 className="text-2xl font-bold">서비스 운영 현황</h1>
      <section className="budget-card space-y-2" aria-label="오늘 대화 이용량">
        <h2 className="font-semibold">오늘 대화 이용량</h2>
        {status?.todayUsage ? <>
          <p>로그인 이용 계정 <strong>{status.todayUsage.signedInAccounts.toLocaleString("ko-KR")}개</strong></p>
          <p>비로그인 접속망 <strong>{status.todayUsage.guestNetworks.toLocaleString("ko-KR")}개</strong></p>
          <p>한도에 집계된 대화 요청 <strong>{status.todayUsage.countedTurns.toLocaleString("ko-KR")}회</strong></p>
        </> : <p>확인 중</p>}
        <p className="text-sm text-slate-600">한국 시간 오늘 기준이며 계정과 접속망 수는 집계 기능 적용 이후부터 표시돼요. 같은 접속망의 여러 사람은 하나로 집계되고, 한 사람이 로그인 전후로 이용하면 각각 집계될 수 있어요.</p>
      </section>
      <h2 className="text-xl font-bold">AI 비용 관리</h2>
      <p>자동으로 한도를 늘리지 않습니다. 운영자 계정에서 승인할 때마다 운영 한도가 10,000원 증가합니다.</p>
      <p className="text-sm text-slate-600">사용 비용은 모델이 보고한 토큰, 적용 단가와 환율로 계산하며 제공자의 최종 청구액과 다를 수 있습니다.</p>
      {status && (
        <section className="budget-card space-y-2" aria-label="AI 운영 예산">
          <p>총 운영 한도: <strong>{formatWon(status.accounting.carryoverMilliWon + status.accounting.approvedMilliWon)}</strong></p>
          <p>사용량 기준 계산액: {formatWon(status.accounting.settledMilliWon)}</p>
          <p>처리 중 / 확인 필요 금액: {formatWon(status.reservedMilliWon)}</p>
          <p>추가 사용 가능액: <strong>{formatWon(Math.max(0, status.balanceMilliWon))}</strong></p>
          {status.balanceMilliWon < 0 && <p role="alert">예약액을 초과한 사용 비용: {formatWon(-status.balanceMilliWon)}. 추가 모델 호출은 중단됩니다.</p>}
          <p className="text-sm text-slate-600">정산 시작: {new Date(status.accounting.startedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}. 기존 이월 예산 {formatWon(status.accounting.carryoverMilliWon)}을 포함하며, 이전 사용 비용은 재계산하지 않습니다.</p>
          {status.reservedMilliWon > 0 && <p className="text-sm text-slate-600">사용량이 확인되지 않은 호출은 예약금을 유지합니다.</p>}
        </section>
      )}
      {status && !status.notificationReady && (
        <p role="alert" className="text-red-700">
          예산 알림 메일 설정이 필요해요.
        </p>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {status && (
        <form onSubmit={submit} className="space-y-3">
          {pending ? <p>이전 승인 요청의 결과를 다시 확인합니다. 동일한 요청은 중복 반영하지 않습니다.</p> : <>
            <p>이번 승인으로 운영 한도에 <strong>10,000원</strong>을 추가합니다.</p>
            <p>승인 후 총 운영 한도: <strong>{formatWon(status.accounting.carryoverMilliWon + status.accounting.approvedMilliWon + 10_000_000)}</strong></p>
          </>}
          <p className="text-sm text-slate-600">운영자 계정에서만 승인할 수 있으며, 한도 증가는 결제가 아닙니다.</p>
          <button disabled={busy} className="budget-button">
            {busy ? "확인 중" : pending ? "같은 승인 요청 다시 확인" : "한도 10,000원 추가 승인"}
          </button>
        </form>
      )}
      {status && (
        <section>
          <h2 className="font-semibold">최근 한도 증가 내역</h2>
          {status.credits.length ? (
            <ul className="mt-2 space-y-1">
              {status.credits.map((item, index) => (
                <li key={`${item.at}-${index}`}>
                  {new Date(item.at).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                  })}{" "}
                  /{" "}
                  {item.kind === "initial"
                    ? "초기"
                    : item.kind === "automatic"
                      ? "자동"
                      : "수동"}{" "}
                  증가 / {formatWon(item.amountMilliWon)} / {item.actor}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2">승인 내역이 없어요.</p>
          )}
        </section>
      )}
    </div></main>
  );
}
