"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getBudgetStatus, topupBudget, type BudgetStatus } from "@/lib/api";

type Pending = { amount: number; id: string };
const formatWon = (milliWon: number) =>
  `${(milliWon / 1000).toLocaleString("ko-KR", { maximumFractionDigits: 3 })}원`;

export default function BudgetAdminPage() {
  const { token, user, isLoading, login } = useAuth();
  const pendingKey = user?.userId ? `budgetTopupPending:${user.userId}` : null;
  const [status, setStatus] = useState<BudgetStatus | null>(null);
  const [amount, setAmount] = useState("10000");
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

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
    if (!token) return;
    try {
      setStatus(await getBudgetStatus(token));
      setError("");
    } catch {
      setError(
        "예산 정보를 불러오지 못했어요. 관리자 권한과 연결 상태를 확인해 주세요.",
      );
    }
  }, [token]);

  useEffect(() => {
    if (!pendingKey) return;
    try {
      const raw = sessionStorage.getItem(pendingKey);
      if (raw) {
        const saved = JSON.parse(raw) as Pending;
        if (
          /^[a-f0-9]{32}$/.test(saved.id) &&
          Number.isSafeInteger(saved.amount) &&
          saved.amount > 0 &&
          saved.amount <= 1_000_000
        ) {
          setPending(saved);
          setAmount(String(saved.amount));
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
    const won = Number(amount);
    if (!Number.isSafeInteger(won) || won < 1 || won > 1_000_000) {
      setError("충전 금액을 1원에서 1,000,000원 사이로 입력해 주세요.");
      return;
    }
    const operation = pending ?? {
      amount: won,
      id: crypto.randomUUID().replaceAll("-", ""),
    };
    if (operation.amount !== won) {
      setError("이전 충전의 결과를 먼저 확인해 주세요.");
      return;
    }
    try {
      sessionStorage.setItem(pendingKey, JSON.stringify(operation));
    } catch {
      setError("충전 요청을 안전하게 저장할 수 없어 진행하지 않았어요.");
      return;
    }
    submitting.current = true;
    setPending(operation);
    setBusy(true);
    setError("");
    try {
      await topupBudget(token, operation.amount, operation.id);
      sessionStorage.removeItem(pendingKey);
      setPending(null);
      await load();
    } catch {
      setError(
        "충전 결과를 확인하지 못했어요. 같은 금액으로 다시 확인해 주세요.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (isLoading) return <main className="p-8">확인 중이에요.</main>;
  if (!token)
    return (
      <main className="p-8">
        <p>관리자 로그인이 필요해요.</p>
        {error && <p role="alert">{error}</p>}
        <button
          onClick={() => startLogin(login)}
          className="mt-4 rounded bg-slate-900 px-4 py-2 text-white"
        >
          Google 로그인
        </button>
      </main>
    );
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">AI 이용 예산</h1>
      <p>
        잔액이 있으면 다음 주로 이월됩니다. 월요일에 확정된 잔액이 0원이고 처리
        중인 금액이 없으면 1만 원을 충전합니다.
      </p>
      {status && (
        <section className="rounded border p-4 space-y-2">
          <p>
            사용 가능한 잔액:{" "}
            <strong>{formatWon(status.balanceMilliWon)}</strong>
          </p>
          <p>처리 중 / 확인 필요 금액: {formatWon(status.reservedMilliWon)}</p>
          {status.reservedMilliWon > 0 && (
            <p className="text-sm text-slate-600">
              이전 방식으로 남은 금액입니다. 사용량 확인이 필요하며 자동 충전이
              보류될 수 있습니다.
            </p>
          )}
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
          <label htmlFor="budget-amount" className="block">
            충전 금액
          </label>
          <input
            id="budget-amount"
            className="w-full rounded border p-2"
            inputMode="numeric"
            type="number"
            min="1"
            max="1000000"
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={busy || !!pending}
          />
          <button
            disabled={busy}
            className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? "확인 중" : pending ? "충전 결과 다시 확인" : "예산 충전"}
          </button>
        </form>
      )}
      {status && (
        <section>
          <h2 className="font-semibold">최근 충전 내역</h2>
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
                  충전 / {formatWon(item.amountMilliWon)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2">충전 내역이 없어요.</p>
          )}
        </section>
      )}
    </main>
  );
}
