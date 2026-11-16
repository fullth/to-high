<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 신규 페이지와 운영 화면 디자인

- 관리자 페이지는 `app/admin/layout.tsx`의 공통 Sidebar 레이아웃과 shadcn/ui의 Card, Button, Table, ToggleGroup, Alert를 재사용한다. `components/ui/page.tsx`는 이 컴포넌트의 조합 도우미다.
- 색상은 `components/ui/system.css`의 관리자 범위 의미 토큰을 사용한다. 페이지별 CSS는 데이터 배치만 담당하며 자체 사이드바, 카드와 버튼 규격을 추가하지 않는다.
- 긴 설명은 주요 지표와 같은 비중으로 나열하지 않는다. 제목/핵심 값/주요 행동을 먼저 배치하고, 집계 기준과 긴 안내는 접을 수 있는 상세 설명에 둔다.
- 승인된 홈과 상담의 전용 디자인은 새 페이지 규칙을 이유로 일괄 변경하지 않는다.
