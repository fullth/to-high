"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getBudgetStatus, topupBudget, type BudgetStatus } from "@/lib/api";
import {
  ArrowUpRight,
  CheckCircle2,
  Coins,
  ExternalLink,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Badge,
  EmptyState,
  MetricCard,
  Notice,
  PageHeader,
  PageShell,
  Panel,
  PanelHeader,
} from "@/components/ui/page";
import { formatCount, formatMilliWon as formatWon } from "@/lib/format";
import "./budget.css";
import { JourneyFunnelPanel } from "./journey-funnel";
import { UsageHistoryPanel } from "./usage-history";

type Pending = { amount: number; id: string };

export default function BudgetAdminPage() {
  const { token, user, isLoading, login } = useAuth();
  const pendingKey = user?.userId ? `budgetTopupPending:${user.userId}` : null;
  const [status, setStatus] = useState<BudgetStatus | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const submitting = useRef(false);
  const currentToken = useRef(token);
  useEffect(() => {
    currentToken.current = token;
  }, [token]);

  function startLogin(provider: () => void) {
    try {
      sessionStorage.setItem("authReturnTo", "budget");
    } catch {
      setError(
        "로그인 후 이 페이지로 돌아오려면 브라우저 저장 공간이 필요해요.",
      );
      return;
    }
    provider();
  }

  const load = useCallback(async () => {
    if (!token || !user?.userId) return;
    setRefreshing(true);
    try {
      const next = await getBudgetStatus(token);
      if (currentToken.current !== token) return;
      setStatus(next);
      setUpdatedAt(new Date());
      setError("");
    } catch {
      if (currentToken.current !== token) return;
      setStatus(null);
      setError(
        "예산 정보를 불러오지 못했어요. 관리자 권한과 연결 상태를 확인해 주세요.",
      );
    } finally {
      if (currentToken.current === token) setRefreshing(false);
    }
  }, [token, user?.userId]);

  useEffect(() => {
    setStatus(null);
    setUpdatedAt(null);
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

  const today = status?.usageHistory?.days.find(
    (d) => d.day === status.usageHistory?.to,
  );
  const totalBudget = status
    ? status.accounting.carryoverMilliWon + status.accounting.approvedMilliWon
    : 0;
  const usedPercent =
    status && totalBudget > 0
      ? Math.min(100, (status.accounting.settledMilliWon / totalBudget) * 100)
      : 0;
  const reservedPercent =
    status && totalBudget > 0
      ? Math.min(
          100 - usedPercent,
          (status.reservedMilliWon / totalBudget) * 100,
        )
      : 0;
  const header = (
    <PageHeader
      title="운영 현황"
      description="상담 이용과 AI 예산을 한눈에 확인하세요."
      actions={
        token && (
          <>
            <Button variant="outline" asChild>
              <a
                href="https://analytics.google.com/analytics/web/#/a399568760p543674918/reports/intelligenthome"
                target="_blank"
                rel="noopener noreferrer"
              >
                GA 보고서 <ExternalLink size={14} aria-hidden="true" />
              </a>
            </Button>
            <Button
              variant="outline"
              disabled={refreshing}
              aria-busy={refreshing}
              onClick={() => void load()}
            >
              <RefreshCw size={14} aria-hidden="true" />
              새로고침
            </Button>
          </>
        )
      }
    />
  );

  if (isLoading)
    return (
      <PageShell>
        {header}
        <Panel className="ops-auth">
          <EmptyState title="로그인 상태 확인 중">
            잠시만 기다려 주세요.
          </EmptyState>
        </Panel>
      </PageShell>
    );
  if (!token)
    return (
      <PageShell>
        {header}
        <Panel className="ops-auth">
          <PanelHeader
            title="관리자 로그인"
            description="운영자 계정으로 서비스 현황을 확인하세요."
          />
          <div className="ui-panel-body">
            {error && <Notice tone="danger">{error}</Notice>}
            <Button onClick={() => startLogin(login)}>Google 로그인</Button>
          </div>
        </Panel>
      </PageShell>
    );
  return (
    <PageShell>
      {header}
      <div className="ops-status-line">
        <span>한국 시간 기준 / 오늘은 집계 중</span>
        <Badge tone={status ? "success" : "neutral"}>
          {status && updatedAt
            ? `${updatedAt.toLocaleTimeString("ko-KR", { hour12: false, timeZone: "Asia/Seoul" })} 갱신`
            : "불러오는 중"}
        </Badge>
      </div>
      {error && (
        <Notice tone="danger" title="정보를 확인하지 못했어요">
          {error}
        </Notice>
      )}
      {status && !status.notificationReady && (
        <Notice tone="warning" title="예산 알림 미설정">
          한도 도달 전에 메일로 안내받으려면 알림 설정을 확인하세요.
        </Notice>
      )}
      <section
        className="ops-overview"
        id="overview"
        aria-label="오늘 대화 이용량"
      >
        <h2>오늘 요약</h2>
        <dl className="ops-metrics">
          <MetricCard
            label="상담 요청"
            value={formatCount(
              today?.requests?.requests ?? status?.todayUsage?.countedTurns,
            )}
            note={today?.requests ? "처리 전 거절 포함" : "한도에 반영된 요청"}
            icon={<MessageSquare size={15} aria-hidden="true" />}
          />
          <MetricCard
            label="상담 시작 성공"
            value={formatCount(today?.requests?.starts)}
            note="첫 문맥 요청의 정상 완료"
            icon={<ArrowUpRight size={15} aria-hidden="true" />}
          />
          <MetricCard
            label="성공 응답"
            value={formatCount(today?.requests?.successes)}
            note="서버에서 정상 완료"
            icon={<CheckCircle2 size={15} aria-hidden="true" />}
          />
          <MetricCard
            label="오늘 계산 비용"
            value={formatWon(today?.model?.settledMilliWon)}
            note="제공자 토큰의 정산 기준"
            icon={<Coins size={15} aria-hidden="true" />}
          />
        </dl>
      </section>
      {status && <JourneyFunnelPanel history={status.journeyHistory} unavailable={status.journeyHistoryUnavailable} />}
      <div className="ops-grid">
        <div className="ops-main">
          {status?.usageHistory ? (
            <UsageHistoryPanel history={status.usageHistory} />
          ) : (
            <Panel>
              <PanelHeader title="상담 이용 추이" />
              {status?.usageHistoryUnavailable ? (
                <div className="ui-panel-body">
                  <Notice tone="warning">
                    일별 집계를 불러오지 못했어요. 예산 정보와 승인은 계속
                    사용할 수 있습니다.
                  </Notice>
                </div>
              ) : (
                <EmptyState
                  title={
                    status
                      ? "일별 집계를 준비하고 있어요"
                      : "운영 정보를 불러오고 있어요"
                  }
                >
                  {status
                    ? "API 업데이트 후 발생하는 요청부터 확인할 수 있어요."
                    : "연결 상태와 관리자 권한을 확인합니다."}
                </EmptyState>
              )}
            </Panel>
          )}
          {status && (
            <Panel aria-label="이용 계정과 접속망">
              <PanelHeader
                title="오늘 이용 범위"
                description="한도 집계 기준. 실제 사람 수와는 다릅니다."
              />
              <div className="ui-panel-body">
                <dl className="ui-kv">
                  <div>
                    <dt>로그인 이용 계정</dt>
                    <dd>
                      {formatCount(status.todayUsage?.signedInAccounts)}개
                    </dd>
                  </div>
                  <div>
                    <dt>비로그인 접속망</dt>
                    <dd>{formatCount(status.todayUsage?.guestNetworks)}개</dd>
                  </div>
                </dl>
              </div>
            </Panel>
          )}
        </div>
        {status && (
          <Panel className="ops-budget" id="budget" aria-label="AI 운영 예산">
            <PanelHeader
              title="AI 비용 관리"
              actions={
                <Badge
                  tone={status.balanceMilliWon <= 0 ? "danger" : "success"}
                >
                  {status.balanceMilliWon <= 0 ? "한도 확인 필요" : "수동 승인"}
                </Badge>
              }
            />
            <div className="ui-panel-body">
              <p className="ops-budget-label">추가 사용 가능액</p>
              <p className="ops-budget-balance">
                {formatWon(Math.max(0, status.balanceMilliWon))}
              </p>
              <dl className="ui-kv">
                <div>
                  <dt>총 운영 한도:</dt>
                  <dd>{formatWon(totalBudget)}</dd>
                </div>
                <div>
                  <dt>사용량 기준 계산액</dt>
                  <dd>{formatWon(status.accounting.settledMilliWon)}</dd>
                </div>
                <div>
                  <dt>처리 중 / 확인 필요 금액:</dt>
                  <dd>{formatWon(status.reservedMilliWon)}</dd>
                </div>
              </dl>
              <div
                className="ops-budget-progress"
                role="img"
                aria-label={`운영 한도 중 정산 ${usedPercent.toFixed(1)}%, 예약 ${reservedPercent.toFixed(1)}%`}
              >
                <span style={{ width: `${usedPercent}%` }} />
                <span
                  className="reserved"
                  style={{ width: `${reservedPercent}%` }}
                />
              </div>
              <p className="ops-budget-caption">
                초록: 계산 비용 / 노랑: 미정산 예약금
              </p>
              {status.balanceMilliWon < 0 && (
                <Notice tone="danger">
                  예약액 초과 {formatWon(-status.balanceMilliWon)}. 추가 모델
                  호출은 중단됩니다.
                </Notice>
              )}
              <details className="ops-definition">
                <summary>계산 기준 확인</summary>
                <p>
                  제공자의 토큰, 적용 단가와 환율로 계산하며 최종 청구액과 다를
                  수 있습니다.
                </p>
                <p>
                  정산 시작:{" "}
                  {new Date(status.accounting.startedAt).toLocaleString(
                    "ko-KR",
                    { timeZone: "Asia/Seoul" },
                  )}
                  . 기존 이월 예산{" "}
                  {formatWon(status.accounting.carryoverMilliWon)}. 과거 비용은
                  재계산하지 않습니다.
                </p>
                <p>사용량을 확인하지 못한 호출은 예약금을 유지합니다.</p>
              </details>
            </div>
            <form onSubmit={submit} className="ops-approval">
              <h3>운영 한도 추가</h3>
              {pending ? (
                <Notice title="이전 승인 결과를 다시 확인합니다">
                  같은 요청은 중복 반영하지 않습니다.
                </Notice>
              ) : (
                <dl className="ui-kv">
                  <div>
                    <dt>이번 승인</dt>
                    <dd>+10,000원</dd>
                  </div>
                  <div>
                    <dt>승인 후 총 한도</dt>
                    <dd>{formatWon(totalBudget + 10_000_000)}</dd>
                  </div>
                </dl>
              )}
              <Button disabled={busy} aria-busy={busy}>
                {busy
                  ? "확인 중"
                  : pending
                    ? "같은 승인 요청 다시 확인"
                    : "한도 10,000원 추가 승인"}
              </Button>
              <p className="ops-approval-note">
                운영자만 승인 / 자동 증액 없음 / 실제 결제 아님
              </p>
            </form>
          </Panel>
        )}
      </div>
      {status && (
        <Panel
          className="ops-credits"
          id="approvals"
          aria-label="한도 증가 내역"
        >
          <PanelHeader
            title="한도 증가 내역"
            description="최근 20건의 승인 기록"
          />
          {status.credits.length ? (
            <ul className="ui-panel-body">
              {status.credits.map((item, index) => (
                <li key={`${item.at}-${index}`} className="ops-credit-row">
                  <div>
                    <p className="ops-credit-date">
                      {new Date(item.at).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })}
                    </p>
                    <p className="ops-credit-actor">
                      {item.actor === "system" ? "시스템" : "운영자 승인"}
                    </p>
                  </div>
                  <Badge>
                    {item.kind === "initial"
                      ? "초기"
                      : item.kind === "automatic"
                        ? "자동"
                        : "수동"}
                  </Badge>
                  <span className="ops-credit-amount">
                    +{formatWon(item.amountMilliWon)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title="승인 내역이 없어요">
              한도를 추가하면 승인 시각과 금액이 기록됩니다.
            </EmptyState>
          )}
        </Panel>
      )}
    </PageShell>
  );
}
