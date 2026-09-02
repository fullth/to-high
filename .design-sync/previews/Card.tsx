import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@to-high/web";
import { Button } from "@to-high/web";

export const Basic = () => (
  <Card style={{ maxWidth: 380 }}>
    <CardHeader>
      <CardTitle>이번 주</CardTitle>
      <CardDescription>지난 7일 동안의 마음 기록이에요.</CardDescription>
    </CardHeader>
    <CardContent>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 40 }}>🙂</span>
        <div>
          <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>3.2</p>
          <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>지난달 대비 +0.3</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const WithActionAndFooter = () => (
  <Card style={{ maxWidth: 380 }}>
    <CardHeader>
      <CardTitle>AI 인사이트</CardTitle>
      <CardDescription>최근 대화에서 발견한 패턴이에요.</CardDescription>
      <CardAction>
        <Button size="icon-sm" variant="ghost" aria-label="더보기">⋯</Button>
      </CardAction>
    </CardHeader>
    <CardContent>
      <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        잠을 푹 잔 다음 날은 기분이 평균 0.7점 높았어요. 이번 주는 수면 시간을
        조금 더 확보해 보는 건 어떨까요?
      </p>
    </CardContent>
    <CardFooter>
      <Button variant="secondary" size="sm">자세히 보기</Button>
    </CardFooter>
  </Card>
);

export const ContentOnly = () => (
  <Card style={{ maxWidth: 380 }}>
    <CardContent>
      <p style={{ fontSize: 14, margin: 0 }}>
        가장 단순한 형태 — 헤더 없이 본문만 담은 카드예요.
      </p>
    </CardContent>
  </Card>
);
