---
name: nextjs-feature-builder
description: TO-HIGH의 Next.js 16 App Router 프론트엔드에서 페이지/컴포넌트/API 클라이언트/스트리밍 UI를 설계·구현할 때 사용한다. apps/web 하위 페이지·컴포넌트 생성, React 19 서버/클라이언트 분리, Tailwind 4 + Radix + CVA 스타일링, react-markdown 렌더링, SSE 상담 응답 스트리밍, 위기 감지 UI 경로, auth-context 관리 작업에 반드시 이 스킬을 사용하라. 프론트엔드 기능/UI/API 연결 변경 요청에 트리거.
---

# Next.js Feature Builder

TO-HIGH 프론트엔드의 표준 패턴과 주의사항.

## 라우트 구조

```
apps/web/src/
├── app/                   ← App Router
│   ├── layout.tsx         ← 루트 레이아웃 + 메타데이터
│   ├── page.tsx           ← 랜딩 (wirocare-landing 삽입)
│   ├── chat/[sessionId]/  ← 상담 화면 (phase 머신)
│   ├── sessions/          ← 세션 목록
│   ├── auth/callback/     ← OAuth 콜백
│   ├── admin/, diary/, subscribe/, privacy/
│   ├── global-error.tsx   ← Sentry 통합 전역 에러
│   ├── sitemap.ts, robots.ts
│   └── opengraph-image.tsx, apple-icon.tsx
├── components/
│   ├── ui/                          ← shadcn 스타일 재사용 (button, card)
│   ├── chat/                        ← 채팅 전용 (chat-bubble, chat-sidebar, chat.css)
│   ├── landing/                     ← 랜딩 전용 (wirocare-landing, landing.css)
│   ├── category-button-variants.tsx ← 카테고리 버튼 5가지 변형 (gradient-glow, glassmorphism, neon-cyber, minimal-interactive, card-3d)
│   ├── topic-button.tsx, mindfulness-card.tsx, contact-sidebar.tsx, logo.tsx
│   └── {feature}.tsx                ← 기타 기능 컴포넌트
├── contexts/auth-context.tsx
└── lib/
    ├── api.ts                ← API 클라이언트 (중앙화, *Stream 함수 포함)
    ├── emotional-messages.ts ← 감정 텍스트 카탈로그
    └── utils.ts
```

**구조 컨벤션:** 상담 도메인이 큰 컴포넌트(chat, landing)는 하위 폴더로 분리해 `*.css`와 함께 관리. 단발 컴포넌트는 `components/` 루트에 둔다. `lib/ui-data.tsx`는 제거됨 — 카테고리/모드 메타는 컴포넌트나 상수 파일로 흩어진다.

## 서버/클라이언트 분리 규칙

- **기본은 서버 컴포넌트.** 데이터 fetch, SEO, 정적 렌더가 필요하면 서버.
- `'use client'`를 붙이는 경우: `useState`/`useEffect`/이벤트 핸들러/Context 사용, 브라우저 API 필요.
- 클라이언트 컴포넌트 내부에서만 쓰는 상태는 클라이언트 컴포넌트 안으로 격리. 서버 컴포넌트를 클라이언트로 바꾸지 않는다.

## API 클라이언트

- `lib/api.ts`에 모든 API 호출 집중. 컴포넌트 내부 fetch 금지.
- 응답 타입은 **백엔드 DTO를 기준으로** 정의. 임의 필드 추가 금지.
  - 이상적: 백엔드 응답 타입을 shared 패키지로 공유(현재는 수동 동기화, qa-validator가 교차 검증).
- 에러: `response.ok`만 체크하지 말고 상태 코드·payload의 `code`(예: `SESSION_LIMIT_EXCEEDED`) 분기.

## SSE 스트리밍 (상담 응답)

상담 응답은 토큰 단위로 흘러 들어온다. `lib/api.ts`에 3개 스트리밍 함수가 중앙화되어 있다.

| 함수 | 엔드포인트 | 청크 페이로드 | 용도 |
|------|----------|------------|------|
| `selectOptionStream` | `POST /chat/select/stream` | JSON 객체(`{question?, options?, isCrisis?, crisisLevel?, crisisMessage?, empathyComment?, counselorFeedback?, contextSummary?, responseModes?, ...}`) — 여러 청크가 누적되어 한 응답을 구성 | 카테고리 후 선택지 응답 + 위기 + 모드 옵션 |
| `setResponseModeStream` | `POST /chat/mode/stream` | `{content: string}` — 토큰 단위 텍스트 | 응답 모드 결정 후 본 응답 |
| `sendMessageStream` | `POST /chat/message/stream` | `{content: string}` — 토큰 단위 텍스트 | 자유 메시지 응답 |

표준 파싱 패턴:

```ts
const reader = response.body!.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    try {
      const parsed = JSON.parse(line.slice(6));
      if (parsed.error) throw new Error(parsed.error);
      if (parsed.done) break;
      onChunk(parsed); // selectOptionStream은 객체, mode/message는 {content}
    } catch { /* 불완전 청크 무시 */ }
  }
}
```

**주의:**
- 청크 파싱 실패는 무시(불완전 청크). 단 `parsed.error`는 상위로 던진다.
- 컴포넌트 언마운트 시 `reader.cancel()` 호출로 정리. 메모리 누수 방지.
- `selectOptionStream` 청크에 `isCrisis: true`가 오면 **즉시 스트리밍을 중단**하고 `crisisMessage` 기반 위기 UI로 전환(safety-auditor 필수 요구).
- 네트워크 끊김 시 마지막까지 받은 텍스트는 보존하고 재시도 버튼 제공.
- 새 스트리밍 엔드포인트 추가 시 `lib/api.ts`에 `*Stream` 함수로 추가하고 컴포넌트는 `onChunk` 콜백만 노출.

## 채팅 화면 Phase 머신

`app/chat/[sessionId]/page.tsx`는 4개 phase 상태로 화면을 분기한다.

```
selecting ─→ mode ────→ chatting ──→ ended
       │      ↑
       └→ loginWall ┘  (비로그인 시 mode 진입 직전 차단)
```

| Phase | 의미 | 진입 조건 |
|-------|------|---------|
| `selecting` | 첫 질문에 대한 선택지 노출 | 세션 시작 직후 또는 `selectOptionStream` 응답 후 `canProceedToResponse=false`일 때 |
| `mode` | 응답 모드 선택 (comfort/organize/validate/direction/listen/similar) | `canProceedToResponse=true` + 토큰 보유 |
| `loginWall` | 모드 선택 전 로그인 유도 | `canProceedToResponse=true` + 토큰 없음 |
| `chatting` | 자유 메시지 대화 진행 | 모드 선택 완료(`setResponseModeStream` 종료) |
| `ended` | 세션 요약 노출 | `endSession` 응답 도착 |

**규칙:**
- 새 분기 추가 시 4개 분기 모두에 대한 사이드바·헤더 상태를 동시에 검토.
- 위기(`isCrisis`)는 phase와 무관하게 최우선 — 어떤 phase에서도 즉시 위기 UI를 띄운다.
- phase 전환은 단방향이 원칙. `chatting → mode`로 되돌리려면 명시적 사용자 액션 + 신규 세션 권장.

## 위기 UI 경로 (safety-critical)

- `selectOptionStream` 청크에 `isCrisis: true`·`crisisLevel`·`crisisMessage`가 포함되면 즉시 화면 상단에 전문기관 안내 배너 노출 후 스트리밍 중단.
- 배너는 애니메이션·지연 없이 첫 프레임에 보이게(I1 안전 우선).
- 위기 번호는 모든 화면에서 일관되어야 한다 — 현재 사용처: `1393`(자살예방상담전화). 추가/변경 시 `wirocare-landing.tsx` 등 노출 지점 동시 갱신.
- 위기 단계(low/medium/high) 처리 정책은 `apps/api/src/prompts/crisis-detection.ts`와 `DESIGN.md` §7 크라이시스 UI 규약을 따른다.

## 디자인 시스템

**원천 문서:** 프로젝트 루트 `DESIGN.md` (Google Stitch 9섹션 포맷). UI·디자인 작업 시 **반드시 먼저 읽는다.**

- 색상 토큰·타이포·그림자·Radius·반응형 규약 → `DESIGN.md` §2~§6
- 컴포넌트 패턴(Button/Card/TopicButton/MindfulnessCard) → `DESIGN.md` §4
- 크라이시스 UI·접근성 필수 규약 → `DESIGN.md` §7 Do/Don't
- 에이전트 빠른 참조 체크리스트 → `DESIGN.md` §9 Agent Prompt Guide

**기술 스택 요약 (상세는 DESIGN.md로):**
- **TailwindCSS 4** (`@tailwind/postcss`), `globals.css` 토큰
- **Radix UI + CVA** (`components/ui/button.tsx`, `card.tsx` 패턴)
- **tw-animate-css** — 전환 애니메이션 (과한 모션 금지, `prefers-reduced-motion` 존중)
- **lucide-react** — 아이콘
- **react-markdown + remark-gfm** — 상담사 응답만 렌더. 사용자 입력은 평문(XSS 방지)

## 접근성·UX 원칙

- 폰트 대비·크기: 상담 텍스트는 최소 16px, line-height 1.6+.
- 에러 메시지 톤: "문제가 발생했어요. 잠시 후 다시 시도해주세요" 식의 부드러운 문구. 시스템 원문 노출 금지.
- 버튼 타겟: 터치 영역 44x44px 이상.
- `prefers-reduced-motion` 존중.

## 인증·세션

- `AuthContext`가 JWT 토큰과 사용자 정보 보관.
- 익명 상담은 토큰 없이 호출 가능해야 함. API 클라이언트가 토큰 유무에 따라 헤더 분기.
- OAuth 콜백(`/auth/callback`)에서 토큰 수신 후 `AuthContext` 업데이트 및 홈/원래 경로로 리다이렉트.

## 빌드·실행

- 개발: `npm run dev:web` (3001 포트)
- 빌드: `npm run build:web`
- 타입 체크: `npx tsc --noEmit` (필요 시)

## 체크리스트

- [ ] 서버/클라이언트 경계가 필요 최소 범위인가
- [ ] API 응답 타입이 백엔드 DTO와 일치(qa-validator 교차 검증 요청)
- [ ] 위기 UI 경로가 모든 에러·중단에서 유지되는가
- [ ] 마크다운 렌더링 대상이 AI 응답뿐인가 (사용자 입력 제외)
- [ ] Sentry `global-error.tsx`·`instrumentation.ts` 흐름 유지
- [ ] `npm run build:web` 통과
