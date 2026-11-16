"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UsageHistory } from "@/lib/usage-history";
import { formatCount, formatMilliWon } from "@/lib/format";
import {
  Badge,
  EmptyState,
  HelpDetails,
  Panel,
  PanelHeader,
} from "@/components/ui/page";

function UsageTrend({ history }: { history: UsageHistory }) {
  const observed = history.days.filter((d) => d.requests !== null);
  if (observed.length < 2)
    return (
      <div className="ui-panel-body">
        <p className="ops-note">
          2일 이상의 집계가 쌓이면 이용 추이를 표시합니다.
        </p>
      </div>
    );
  const first = Date.parse(history.from);
  const span = Math.max(1, (Date.parse(history.to) - first) / 86400000);
  const max = Math.max(
    10,
    Math.ceil(Math.max(...observed.map((d) => d.requests!.requests)) / 10) * 10,
  );
  const width = Math.min(14, 440 / (span + 1));
  const height = (n: number) => (n / max) * 100;
  return (
    <div className="ops-trend">
      <div className="ops-chart-legend">
        <span className="ops-chart-key">요청</span>
        <span className="ops-chart-key success">성공</span>
        <span>관측된 날짜만 표시</span>
      </div>
      <svg
        viewBox="0 0 640 150"
        className="ops-chart"
        role="img"
        aria-label={`${history.from}부터 ${history.to}까지 일별 상담 요청과 성공 수. 상세 수치는 아래 일별 내역에서 확인할 수 있습니다.`}
      >
        {[0, max / 2, max].map((n) => (
          <g key={n}>
            <line
              x1="32"
              x2="630"
              y1={112 - height(n)}
              y2={112 - height(n)}
              stroke="#e4ebe6"
              strokeDasharray="3 4"
            />
            <text x="0" y={116 - height(n)}>
              {n}
            </text>
          </g>
        ))}
        {observed.map((d) => {
          const x = 44 + ((Date.parse(d.day) - first) / 86400000 / span) * 570;
          return (
            <g key={d.day}>
              <title>
                {d.day}: 요청 {d.requests!.requests}, 성공{" "}
                {d.requests!.successes}
              </title>
              <rect
                x={x - width}
                y={112 - height(d.requests!.requests)}
                width={width}
                height={height(d.requests!.requests)}
                rx="2"
                fill="var(--ui-chart-request)"
              />
              <rect
                x={x + 2}
                y={112 - height(d.requests!.successes)}
                width={width}
                height={height(d.requests!.successes)}
                rx="2"
                fill="var(--ui-accent)"
              />
            </g>
          );
        })}
        <text x="32" y="140">
          {history.from.slice(5).replace("-", ".")}
        </text>
        <text x="630" y="140" textAnchor="end">
          {history.to.slice(5).replace("-", ".")}
        </text>
      </svg>
    </div>
  );
}

export function UsageHistoryPanel({ history }: { history: UsageHistory }) {
  const [period, setPeriod] = useState<7 | 30>(7);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const from =
    period === 30
      ? history.from
      : new Date(Date.parse(history.to) - 6 * 86400000)
          .toISOString()
          .slice(0, 10);
  const visible = {
    ...history,
    from: from > history.from ? from : history.from,
    days: history.days.filter((d) => d.day >= from),
  };
  const toggleDay = (day: string) =>
    setExpanded((before) => {
      const next = new Set(before);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  return (
    <Panel aria-label="일별 이용 추이" id="usage">
      <PanelHeader
        title="상담 이용 추이"
        description={`${visible.from} ~ ${history.to}, 한국 시간`}
        actions={
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={String(period)}
            onValueChange={(value) => {
              if (value === "7" || value === "30")
                setPeriod(Number(value) as 7 | 30);
            }}
            aria-label="집계 기간"
          >
            <ToggleGroupItem value="7">7일</ToggleGroupItem>
            <ToggleGroupItem value="30">30일</ToggleGroupItem>
          </ToggleGroup>
        }
      />
      {visible.days.length === 0 ? (
        <EmptyState title="이용 데이터가 쌓이면 여기에 표시돼요">
          배포 후 발생한 요청부터 집계합니다. 수집하지 않은 과거 값은 0으로
          표시하지 않습니다.
        </EmptyState>
      ) : (
        <>
          <UsageTrend history={visible} />
          <Table className="ops-usage-table">
            <TableCaption className="sr-only">
              일별 상담 요청, 성공, 시작, 오류와 정산된 계산 비용. 미집계 값은
              —로 표시합니다.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">날짜</TableHead>
                <TableHead scope="col" className="text-right">
                  요청
                </TableHead>
                <TableHead scope="col" className="text-right">
                  성공
                </TableHead>
                <TableHead
                  scope="col"
                  className="hidden text-right md:table-cell"
                >
                  시작
                </TableHead>
                <TableHead
                  scope="col"
                  className="hidden text-right md:table-cell"
                >
                  오류
                </TableHead>
                <TableHead scope="col" className="text-right">
                  계산 비용
                </TableHead>
                <TableHead scope="col" className="w-10">
                  <span className="sr-only">상세</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.days.map(({ day, requests: r, model: m }) => (
                <Fragment key={day}>
                  <TableRow>
                    <TableCell className="font-medium">
                      <time dateTime={day}>
                        {day.slice(5).replace("-", ".")}
                      </time>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(r?.requests)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(r?.successes)}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {formatCount(r?.starts)}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {r?.failures ? (
                        <span className="text-destructive">
                          {formatCount(r.failures)}
                        </span>
                      ) : (
                        formatCount(r?.failures)
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMilliWon(m?.settledMilliWon)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`${day} 상세 보기`}
                        aria-expanded={expanded.has(day)}
                        aria-controls={
                          expanded.has(day) ? `usage-day-${day}` : undefined
                        }
                        onClick={() => toggleDay(day)}
                      >
                        <ChevronDown
                          className={expanded.has(day) ? "rotate-180" : ""}
                          aria-hidden="true"
                        />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expanded.has(day) && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-3">
                        <div
                          className="ops-day-details"
                          id={`usage-day-${day}`}
                        >
                          <dl>
                            {(
                              [
                                ["상담 시작 성공", r?.starts],
                                ["처리 중 오류", r?.failures],
                                ["로그인 이용 계정", r?.signedInAccounts],
                                ["비로그인 접속망", r?.guestNetworks],
                                ["중도 취소", r?.cancelled],
                                ["처리 전 거절", r?.rejected],
                                ["정산된 모델 호출", m?.reportedCalls],
                                ["입력 토큰", m?.inputTokens],
                                ["캐시 입력 토큰", m?.cachedInputTokens],
                                ["출력 토큰", m?.outputTokens],
                              ] satisfies [string, number | undefined][]
                            ).map(([label, value]) => (
                              <div key={label}>
                                <dt>{label}</dt>
                                <dd>{formatCount(value)}</dd>
                              </div>
                            ))}
                          </dl>
                          {r && (
                            <div className="ops-outcomes">
                              {Object.entries(r.outcomes).map(
                                ([code, count]) => (
                                  <Badge
                                    key={code}
                                    tone={
                                      code === "ok"
                                        ? "success"
                                        : code === "cancelled"
                                          ? "neutral"
                                          : "warning"
                                    }
                                  >
                                    {code} {formatCount(count)}
                                  </Badge>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </>
      )}
      <HelpDetails title="집계 기준과 데이터 범위">
        {history.firstRecordedAt && (
          <p>
            집계 시작:{" "}
            {new Date(history.firstRecordedAt).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
            })}
          </p>
        )}
        <p>
          성공은 서버에서 정상 완료한 요청입니다. 시작은 이전 답변이나 요약 없이
          보낸 첫 요청의 성공이며, 재시도는 별도 요청으로 집계합니다.
        </p>
        <p>
          계정과 접속망은 성공 요청 기준으로 날짜별 중복을 제거합니다. 실제 사람
          수나 기간 전체의 고유 이용자 수와 다릅니다.
        </p>
        <p>
          오늘은 집계 중입니다. 서버 종료나 저장 장애로 일부 요청이 누락될 수
          있으며, 관측이 없거나 수집하지 않은 값은 —로 표시합니다.
        </p>
        <p>
          비용과 토큰은 정산 시점의 한국 날짜 기준입니다. 캐시 토큰은 전체
          입력에 포함됩니다. 미정산 예약금은 예산에서 확인하세요.
        </p>
        <p>
          GA는 홈 방문과 버튼 클릭, 서버는 실제 요청 성공을 각각 집계합니다. 두
          집계만으로 광고 방문자의 상담 성공을 연결할 수 없습니다.
        </p>
      </HelpDetails>
    </Panel>
  );
}
