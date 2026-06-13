// 카테고리 ID → 한글 라벨 (공용 상수)
// sessions/page.tsx, chat-sidebar.tsx 등에서 동일 라벨을 쓰도록 단일화한다.
export const CATEGORY_LABELS: Record<string, string> = {
  daily: "일상",
  love: "사랑",
  work: "커리어",
  self: "나",
  future: "미래",
  relationship: "관계",
  other: "기타",
  direct: "직접 입력",
};
