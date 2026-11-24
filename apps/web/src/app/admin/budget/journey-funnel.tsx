"use client";
import { useState } from "react";
import { Panel, PanelHeader, EmptyState, Notice } from "@/components/ui/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { sumJourneys, type JourneyHistory } from "@/lib/journey-history";

const entries = {
  ad_ticketing: "광고에서 시작한 시나리오",
  lobby_ticketing: "로비에서 선택한 시나리오",
  levi: "레비 상담",
};
const percent = (value: number, base: number) =>
  base ? `${((100 * value) / base).toFixed(1)}%` : "—";
export function JourneyFunnelPanel({
  history,
  unavailable,
}: {
  history?: JourneyHistory;
  unavailable?: boolean;
}) {
  const [period, setPeriod] = useState("7");
  const [source, setSource] = useState("all");
  // Complete Korean dates are compared; today's partial observations stay separate.
  const today = history?.to ?? "";
  const end = Date.parse(`${today}T00:00:00+09:00`);
  const from = Number.isFinite(end)
    ? new Date(end - Number(period) * 86400000 + 9 * 3600000)
        .toISOString()
        .slice(0, 10)
    : "";
  const rows =
    history?.days.filter(
      (row) =>
        row.day >= from &&
        row.day < today &&
        (source === "all" || row.source === source),
    ) ?? [];
  const partial = sumJourneys(
    history?.days.filter(
      (row) => row.day === today && (source === "all" || row.source === source),
    ) ?? [],
  );
  return (
    <Panel aria-label="유입 경로별 대화 전환">
      <PanelHeader
        title="유입 경로별 대화 전환"
        description="광고 유입과 로비 선택을 나눠 대화가 이어지는지 확인합니다."
      />
      {unavailable ? (
        <div className="ui-panel-body">
          <Notice tone="warning">
            경로별 집계를 불러오지 못했어요. 기존 이용량과 예산은 별도로 확인할
            수 있어요.
          </Notice>
        </div>
      ) : !history?.firstRecordedAt ? (
        <EmptyState title="경로별 집계 대기 중">
          업데이트 이후 방문부터 쌓입니다. 과거 유입은 소급 분류하지 않습니다.
        </EmptyState>
      ) : (
        <div className="ui-panel-body journey-funnel">
          <div className="journey-filters">
            <ToggleGroup
              type="single"
              value={period}
              onValueChange={(value) => value && setPeriod(value)}
              aria-label="전환 집계 기간"
            >
              <ToggleGroupItem value="7">최근 7일</ToggleGroupItem>
              <ToggleGroupItem value="28">최근 28일</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup
              type="single"
              value={source}
              onValueChange={(value) => value && setSource(value)}
              aria-label="유입 출처"
            >
              <ToggleGroupItem value="all">전체</ToggleGroupItem>
              <ToggleGroupItem value="practicket">프랙티켓</ToggleGroupItem>
              <ToggleGroupItem value="other">기타 유입</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <p>{from}부터 어제까지 / 오늘 제외</p>
          {history.firstRecordedAt.slice(0, 10) >= from && (
            <Notice>
              이 기간에는 집계 시작 전 날짜가 포함됩니다. 수집된 흐름만 표시하며
              과거 유입은 소급 집계하지 않습니다.
            </Notice>
          )}
          <Table>
            <caption className="sr-only">
              유입 출처별 홈 방문과 대화 진입
            </caption>
            <TableHeader>
              <TableRow>
                <TableHead>유입 출처</TableHead>
                <TableHead>홈 방문</TableHead>
                <TableHead>대화 진입</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(["practicket", "other"] as const)
                .filter((key) => source === "all" || source === key)
                .map((key) => {
                  const counts = sumJourneys(
                    rows.filter((row) => row.source === key),
                  );
                  return (
                    <TableRow key={key}>
                      <TableCell>
                        {key === "practicket" ? "프랙티켓" : "기타 / 직접"}
                      </TableCell>
                      <TableCell>{counts.landing}</TableCell>
                      <TableCell>{counts.selected}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          <Table>
            <caption className="sr-only">대화 시작 경로별 전환 단계</caption>
            <TableHeader>
              <TableRow>
                <TableHead>시작 경로</TableHead>
                <TableHead>진입</TableHead>
                <TableHead className="journey-desktop-only">
                  캐릭터 선택 완료
                </TableHead>
                <TableHead className="journey-desktop-only">
                  첫 메시지 접수
                </TableHead>
                <TableHead className="journey-metric-heading">
                  첫 응답 성공
                </TableHead>
                <TableHead className="journey-desktop-only">
                  응답 3회 이상
                </TableHead>
                <TableHead className="journey-mobile-only">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Object.keys(entries) as (keyof typeof entries)[]).map(
                (entry) => {
                  const counts = sumJourneys(
                    rows.filter((row) => row.entry === entry),
                  );
                  return (
                    <TableRow key={entry}>
                      <TableCell className="journey-entry">
                        {entries[entry]}
                      </TableCell>
                      <TableCell>{counts.selected}</TableCell>
                      <TableCell className="journey-desktop-only">
                        {entry === "levi" ? "—" : counts.character_selected}
                      </TableCell>
                      <TableCell className="journey-desktop-only">
                        {counts.first_message}
                      </TableCell>
                      <TableCell>
                        {counts.first_response}
                        <span className="journey-rate">
                          {percent(counts.first_response, counts.selected)}
                        </span>
                      </TableCell>
                      <TableCell className="journey-desktop-only">
                        {counts.continued}
                        <span className="journey-rate">
                          {percent(counts.continued, counts.selected)}
                        </span>
                      </TableCell>
                      <TableCell className="journey-mobile-only">
                        <details>
                          <summary>상세</summary>
                          <dl className="ui-kv">
                            <div>
                              <dt>캐릭터 선택 완료</dt>
                              <dd>
                                {entry === "levi"
                                  ? "해당 없음"
                                  : counts.character_selected}
                              </dd>
                            </div>
                            <div>
                              <dt>첫 메시지 접수</dt>
                              <dd>{counts.first_message}</dd>
                            </div>
                            <div>
                              <dt>응답 3회 이상</dt>
                              <dd>
                                {counts.continued} (
                                {percent(counts.continued, counts.selected)})
                              </dd>
                            </div>
                          </dl>
                        </details>
                      </TableCell>
                    </TableRow>
                  );
                },
              )}
            </TableBody>
          </Table>
          <p>
            오늘 집계 중: 진입 {partial.selected} / 첫 응답 성공{" "}
            {partial.first_response} / 응답 3회 이상 {partial.continued}
          </p>
          <details className="ops-definition">
            <summary>집계 기준과 한계</summary>
            <p>
              집계 시작:{" "}
              {new Date(history.firstRecordedAt).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
              })}
              . 시작일은 일부 시간만 포함합니다.
            </p>
            <p>
              유입 출처와 시작 경로는 별개입니다. 프랙티켓 방문자가 로비의
              시나리오 버튼을 누르면 출처는 프랙티켓, 경로는 로비 선택입니다.
              링크의 UTM과 허용된 외부 출처만 분류하며 출처가 없으면 기타에
              포함합니다.
            </p>
            <p>
              홈 방문과 진입은 익명 흐름 수이며 사람 수나 GA 세션 수가 아닙니다.
              상담으로 바로 들어온 흐름은 홈 방문 없이 진입에 포함됩니다.
              새로고침, 재시작, 30분 경과 시 새 흐름이 생깁니다.
            </p>
            <p>
              캐릭터 선택 완료는 이름 확인 후 이야기 시작입니다. 첫 메시지는
              한도를 통과해 처리에 들어간 요청, 첫 응답 성공과 응답 3회 이상은
              서버 정상 완료 기준입니다. 읽음이나 구매를 의미하지 않습니다.
            </p>
            <p>
              익명 흐름은 시작 날짜에 귀속되며 후속 응답으로 이전 날짜 값이
              갱신될 수 있습니다. 최근 30일만 조회합니다. 테스트, 수집 차단,
              저장 장애와 외부의 조작된 요청이 포함되거나 누락될 수 있습니다.
              대화 원문, 캐릭터 이름, 계정 정보는 이 지표에 저장하지 않습니다.
            </p>
          </details>
        </div>
      )}
    </Panel>
  );
}
