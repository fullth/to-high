import { Button } from "@to-high/web";

export const Variants = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    <Button>상담 시작하기</Button>
    <Button variant="secondary">나중에 할게요</Button>
    <Button variant="outline">더 알아보기</Button>
    <Button variant="ghost">건너뛰기</Button>
    <Button variant="destructive">대화 종료</Button>
    <Button variant="link">이용약관 보기</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    <Button size="sm">작게</Button>
    <Button size="default">기본</Button>
    <Button size="lg">크게</Button>
    <Button size="xl">아주 크게</Button>
  </div>
);

export const IconButtons = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Button size="icon-sm" aria-label="닫기">✕</Button>
    <Button size="icon" variant="secondary" aria-label="다음">→</Button>
    <Button size="icon-lg" variant="outline" aria-label="마이크">🎙️</Button>
  </div>
);

export const FullWidthDisabled = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
    <Button className="w-full">오늘의 기분 저장하기</Button>
    <Button className="w-full" variant="secondary" disabled>
      기분을 먼저 선택해 주세요
    </Button>
  </div>
);
