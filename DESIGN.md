# TO-HIGH (위로) — DESIGN.md

> Google Stitch 9섹션 포맷 기반. 모든 UI·디자인 변경은 이 문서를 기준으로 한다. 북극성 문서(`.claude/skills/to-high-feature-orchestrator/references/product-principles.md`)의 V1~V7 가치 중 특히 **V1(안전)·V3(진입장벽 최소화)·V6(모드·인격 일관성)**를 시각 언어로 구현한다.
>
> 소유자: `web-architect` 에이전트 · 참조: `nextjs-feature-builder` 스킬.

---

## 1. Visual Theme & Atmosphere

**테마명:** *Deep Forest at Dusk* — 어두운 숲 속의 따뜻한 달빛.

**철학:** 심리 상담은 밝은 빛 아래서 판단받는 경험이어야 하지 않는다. 어두운 배경 위에 부드러운 민트·세이지 톤의 빛을 얹어, 사용자가 **관찰당하지 않는 공간에서 자신의 감정을 마주하는 분위기**를 만든다. 과한 애니메이션·그라데이션은 치유 맥락을 방해한다.

**분위기 지시어:** calm · sage · nocturnal · non-judgmental · soft-glow · 16-bit-minimalist

**피해야 할 분위기:** 병원(임상적 흰색), 소셜미디어(자극적 채도), 게임(보상·경쟁 메타포), 럭셔리(금/검정의 위계).

**참고:** 색채심리학(Color Psychology)에서 세이지 그린은 치유·안정과 가장 강하게 결합. 다크 모드 기본값은 밤늦게 상담하는 사용자 비율이 높다는 전제.

---

## 2. Color Palette & Roles

**구현:** `apps/web/src/app/globals.css` (hex 토큰). 추상 변수는 Tailwind 4 `@theme inline`로 노출.

### 2.1 의미론적 토큰

| 역할 | Light 기본값 | Dark | 용도 |
|------|-------------|------|------|
| `--background` | `#0f1f15` (깊은 숲) | `#070f0a` | 페이지 배경 |
| `--foreground` | `#ffffff` | `#ffffff` | 본문 텍스트 |
| `--card` | `#1a2f23` (숲 카드) | `#0f1f15` | 상담 메시지·섹션 카드 |
| `--primary` | `#34d399` (선명한 민트) | 동일 | CTA·강조·포커스 링 |
| `--primary-foreground` | `#022c22` | 동일 | primary 위 텍스트 |
| `--secondary` | `#243d2e` | 동일 | 서브 버튼·태그 |
| `--secondary-foreground` | `#d1fae5` | 동일 | secondary 위 텍스트 |
| `--muted` | `#1e3328` | 동일 | 읽기 부담 낮추는 섹션 |
| `--muted-foreground` | `#9ca3af` | 동일 | 보조 텍스트(메타·날짜) |
| `--accent` | `#2d4a3a` | 동일 | 부드러운 강조 배경 |
| `--accent-foreground` | `#6ee7b7` | 동일 | 밝은 민트 텍스트 |
| `--destructive` | `#ef4444` | 동일 | **제한적 사용** (삭제 확인만) |
| `--border` | `#2d4a3a` | `#1e3328` | 카드·입력창 외곽선 |
| `--ring` | `#34d399` | 동일 | 포커스 인디케이터 |

### 2.2 카테고리 색상 (`apps/web/src/components/category-button-variants.tsx` 호출 시 주입)

> 2026-05 변경: 이전 `lib/ui-data.tsx`(데이터 + 컴포넌트 결합)는 삭제됨. 색상은 호출부(랜딩/채팅 페이지)에서 직접 정의해 `<CategoryButtonVariant color={...} />`로 주입.

상담 6개 카테고리는 자연물 기반 파스텔. 자극도↓, 구분도↑.

| 카테고리 | Hex | 연상 |
|---------|-----|------|
| `self` (나) | `#7C9885` | 세이지 — 자기 수용 |
| `future` (미래) | `#8BA4B4` | 안개빛 — 불확실 |
| `work` (일) | `#B4A48B` | 모래흙 — 현실 |
| `relationship` (관계) | `#9B8AA4` | 라일락 — 인간 |
| `love` (연애) | `#C49B9B` | 흐린 장미 — 애정 |
| `daily` (일상) | `#8B9BAA` | 흐린 하늘 — 평범 |

### 2.3 사용 규칙 (Do/Don't는 §7에 통합)

- **신규 색상 도입 금지.** 기능 분기가 필요하면 먼저 위 토큰 조합으로 시도. 새 헥스는 `web-architect` + 사용자 승인 필요.
- **크라이시스 UI 색상:** `destructive`는 **쓰지 않는다**. 배너는 `primary` + `muted` 조합으로 위급함을 "부드럽게" 전달. 빨강은 공포를 자극해 V1(안전)에 역행.
- **opacity 사용:** `primary/20`, `primary/15` 등 투명도는 자주 사용 (예: `markdown-content strong { bg-primary/15 }`). 과도한 겹침 방지 위해 2단계까지만.

---

## 3. Typography Rules

**폰트:** `Geist` Sans (Google Fonts) — Latin + 한글 렌더 안정. Mono는 아직 미사용.

### 3.1 스케일

| 역할 | 크기 | 예시 클래스 |
|------|------|------------|
| 상담 본문 (최상위 보장) | 16px 이상 | `text-base` |
| 상담사 응답 | 14–15px | `text-[14px] sm:text-[15px]` (마크다운 li) |
| 페이지 제목 | 24px–30px | `text-xl` / `text-2xl` |
| 카드 제목 | 18px | `text-lg` (`card.tsx CardTitle`) |
| 선택지 버튼 | 16px | `text-base font-semibold` (`button.tsx`) |
| 보조·메타 | 12–14px | `text-sm` / `text-xs` |

### 3.2 행간·자간

- `line-height: 1.6` 이상 — 읽기 부담 최소화 (V3 접근성)
- 제목은 `tracking-tight` 허용, 본문은 기본 tracking 유지
- 상담 응답 `line-clamp` 금지 — 축약된 위로는 위로가 아니다

### 3.3 굵기

- `font-bold` — 제목·강조
- `font-semibold` — 버튼·리드 문구
- `font-medium` — 카드 태그
- 본문은 기본(400). 굵은 본문 과다 금지 (감정 강압 느낌).

### 3.4 마크다운 (상담사 응답 전용)

`globals.css .markdown-content` 규약 유지. AI 응답에만 적용. 사용자 입력에 마크다운 렌더링 **금지** (XSS).

- h1–h3: 민트 primary + `border-b primary/20`
- `strong`: `bg-primary/15` 하이라이트 — 중요어만
- `code`: 키워드 강조용(`bg-secondary/80`) — 코드 아님
- 리스트: 커스텀 마커 `bg-primary/60` (ul) / 번호 원형 `bg-primary/20` (ol)
- `blockquote`: 왼쪽 4px 민트 보더 + `"` 장식

---

## 4. Component Stylings

**재사용 원천:** `apps/web/src/components/ui/` (shadcn 스타일 + Radix Slot + CVA).

### 4.1 Button (`components/ui/button.tsx`)

| Variant | 규약 | 사용처 |
|---------|------|--------|
| `default` | primary 민트 + `shadow-primary/25` + `active:scale-[0.98]` | 주요 CTA |
| `outline` | `border-2 border-border` + 호버 시 accent | 보조 액션 |
| `secondary` | secondary 배경 | 제3 액션 |
| `ghost` | 배경 없음 + 호버만 | 아이콘 버튼 |
| `destructive` | **삭제 확인 등 극소 사용** | 세션/계정 삭제 |
| `link` | 밑줄 | 외부 이동 |

**사이즈:**
- `default`: 48px 높이 (터치 44px+ 충족, V3)
- `sm`: 40px / `lg`: 56px / `xl`: 64px
- `icon` 계열: 정사각 48/40/56

**공통:** `rounded-xl` · 포커스 시 `ring-2 ring-ring ring-offset-2` · `transition-all duration-200`.

### 4.2 Card (`components/ui/card.tsx`)

- 기본: `bg-card rounded-2xl border border-border p-6 shadow-lg shadow-black/20`
- Header/Title/Content/Footer 서브컴포넌트 제공
- `@container/card-header` 컨테이너 쿼리로 반응형 헤더

### 4.3 CategoryButtonVariant (`components/category-button-variants.tsx`)

> 2026-05 변경: 단일 `topic-button.tsx`에서 5가지 variant 컴포넌트로 분기. 이전 `lib/ui-data.tsx`는 삭제됨.

카테고리 선택용 버튼. variant prop으로 5가지 스타일 선택:
- `gradient-glow` — 그라디언트 + 호버 시 글로우 확산
- `glassmorphism` — 유리 느낌(반투명 + 블러)
- `neon-cyber` — 네온 보더 강조
- `minimal-interactive` — 미니멀 + 인터랙션 단서
- `card-3d` — 3D 카드 느낌

**필수 props:** `label`, `description`, `color`(카테고리 hex), `onClick`, `variant`. 색상은 카테고리별 자연물 파스텔(§2.2).

**선택 기준:** 랜딩에서는 `gradient-glow` 또는 `glassmorphism` 일관 사용. 한 화면에 variant 혼재 금지(시각적 통일성).

### 4.4 MindfulnessCard (`components/mindfulness-card.tsx`)

"마음 한 스푼" 일일 돌봄 카드. `quote`·`tip` 두 타입. 랜덤 순환. 자극 없는 문구만.

추가로 `lib/emotional-messages.ts`(2026-05 신규)에 감성 카피 중앙화 — 새 카피 추가 시 이 파일에만 수정.

### 4.5 Chat Components (`components/chat/`) — 분리 완료

> 2026-05 변경: `app/page.tsx`(2524줄)에서 분리되어 전용 컴포넌트로 추출.

| 파일 | 역할 |
|------|------|
| `chat/chat-bubble.tsx` | 메시지 버블 (`role` 기반 user/ai 분기). AI는 `react-markdown` + 커스텀 `ch-md-*` 클래스로 렌더 |
| `chat/chat-sidebar.tsx` | 데스크톱 좌측 사이드바 (최근 상담·이전 이야기) |
| `chat/chat.css` | 채팅 전용 스타일(700줄) — 버블·인라인 모드·phase 전환 애니메이션 |

**핵심 패턴:**
- **Phase 머신** — `selecting` → (5턴 도달 시) `mode` (로그인) 또는 `loginWall` (비로그인) → `chat`. 페이지에서 `phase` state로 분기 렌더.
- **인라인 응답 모드** — 별도 모달이 아닌 채팅 흐름 내 `ch-inline-modes` 카드 6개. AI 메시지에 자연스럽게 이어지도록 같은 컬럼에 렌더.
- **SSE 스트리밍** — `selectOptionStream`/`setModeStream`/`sendMessageStream`이 chunk 단위(`question_chunk`, `options`, `metadata`, `next`) 전달. 토큰 단위 점진 렌더.
- **사용자 입력** — `ch-bubble.user`. 평문 only(마크다운 렌더링 금지, XSS 차단).

### 4.6 Landing (`components/landing/wirocare-landing.tsx`)

> 2026-05 신규.

`app/page.tsx`가 단순히 `<WirocareLanding />`만 import. 다크 그린 톤 랜딩 + 카테고리 선택 + "긴 컨텍스트 문제" 차별점 강조.

- `landing.css`(799줄)에 전용 스타일
- 멤버십 메뉴 분리 (인증 상태별 변형)

### 4.7 Crisis Banner (여전히 미분리 — 후속 작업 후보)

현재도 `chat/[sessionId]/page.tsx`에 조건부 렌더. **최우선 분리 대상** — 안전 경로 일관성을 위해 `components/chat/crisis-banner.tsx`로 추출 권장.

---

## 5. Layout Principles

### 5.1 스페이싱 스케일

Tailwind 기본 스케일(4의 배수) 사용. 핵심 간격:

- 카드 내부 padding: `p-6` (24px)
- 섹션 사이: `gap-6` (24px) / `gap-3` (12px, 조밀 영역)
- 카드 간: `gap-3 sm:gap-4`
- 페이지 max-width: 본문 영역 ~640–768px (모바일 우선)

### 5.2 그리드·컨테이너

- **모바일 우선.** `sm:` (640px) 분기점 주로 사용
- 데스크톱에서만 사이드바 노출 (최근 상담 기록, "마음 한 스푼")
- 카테고리 그리드: 모바일 2열 → sm+ 3열

### 5.3 여백 철학

- **비어있음을 두려워하지 않는다.** 상담 UI는 "여백이 숨 쉬는 공간"이다.
- 카드끼리 딱 붙이지 않는다. 최소 `gap-3` 유지
- 페이지 상단 `pt-8` 이상, 하단 `pb-24` (스크롤 끝 여유)

### 5.4 Radius

`--radius: 16px` 기본. 파생 변수:
- `sm: 12px` · `md: 14px` · `lg: 16px` · `xl: 20px` · `2xl: 24px` · `3xl: 28px` · `4xl: 32px`

대부분 `rounded-xl`(20px) 또는 `rounded-2xl`(24px). 직각(`rounded-none`) 금지 — 날카로움은 상담 톤 역행.

---

## 6. Depth & Elevation

**원칙:** 그림자는 **한 장의 종이가 살짝 떠 있는 수준**까지만. 드라마틱한 깊이는 게임·랜딩 사이트 문법이며, 상담 앱에는 과함.

### 6.1 그림자 레이어

| 레벨 | 토큰 | 용도 |
|------|------|------|
| 없음 | — | 배경·보조 요소 |
| 카드 | `shadow-lg shadow-black/20` | 카드 기본 |
| 카드 강조 | `shadow-xl shadow-primary/30` | 호버 시 primary CTA |
| CTA | `shadow-lg shadow-primary/25` | 기본 primary 버튼 |
| 카테고리 호버 | `shadow 0 12px 24px -8px oklch(0.48 0.12 160 / 0.15)` | 카테고리 카드 호버 |

**금지:**
- 이중·삼중 drop shadow
- `blur`가 24px 초과하는 큰 글로우
- neumorphism(내부 그림자 조합)

### 6.2 Z-index 계층

- 기본 콘텐츠: 0
- 스티키 헤더/사이드바: 10
- 모달·드로어: 40
- **크라이시스 배너: 50** (가장 위, 다른 요소에 가려지지 않음 — I1)
- 토스트: 60

---

## 7. Do's and Don'ts

### ✅ Do

- **위기 배너는 첫 프레임에 노출한다.** 애니메이션·지연·스크롤 없이 보이게. `isCrisis=true` 응답 수신 즉시 `z-50`으로 렌더.
- **터치 타겟 최소 44×44px.** 버튼 `size="default"`(48px)가 기본.
- **`prefers-reduced-motion` 존중.** 애니메이션은 `@media (prefers-reduced-motion: no-preference)`로 감쌀 것.
- **에러 메시지는 시스템 원문을 노출하지 않는다.** "문제가 발생했어요. 잠시 후 다시 시도해주세요." 톤.
- **응답 모드별 시각 언어를 구분한다.** `comfort`·`listen`는 미묘하게 더 부드러운 색, `direction`은 선명한 primary.
- **사용자 이름은 `{이름}님`으로 호칭한다** (북극성 §2.1). 로그인 사용자 한정.
- **마크다운 렌더는 AI 응답에만 적용.** 사용자 입력은 평문.
- **카테고리 색상은 좌측 액센트 바로 표현** (full-fill 피하기 — 자극 적음).

### ❌ Don't

- **빨강(`destructive`)을 경고·강조에 남용하지 않는다.** 위기 배너에도 빨강 금지 — primary + muted로 부드럽게.
- **번쩍이는 애니메이션 금지.** `animate-pulse`, `animate-bounce`는 상담 맥락 부적합.
- **Glassmorphism 과다 사용 금지.** `backdrop-blur`는 topic-button 외곽 액센트 정도까지.
- **Emoji-only 메시지 금지** (AI 응답). 단 "마음 한 스푼" 장식에는 제한적 허용.
- **배지·카운터 배지 과다** 금지. "공책 3권 남음" 류 숫자는 눈에 띄되 경쟁심 자극하지 않게 `muted`로.
- **다크 모드 전용 가정 금지.** `.dark` 분기는 있으나 기본은 이미 어둡다. 라이트 테마는 현재 미계획이나 코드 구조는 확장 가능하게 유지.
- **카드에 `border` 제거 금지.** 다크 배경 위에서 카드 경계가 사라지면 "사각형 떠다니는 듯한" UX 저하.

---

## 8. Responsive Behavior

### 8.1 Breakpoints (Tailwind 기본)

| 키 | 최소폭 | 주용도 |
|---|---|---|
| `sm` | 640px | 모바일 → 작은 태블릿 전환 |
| `md` | 768px | 타이포 크기 상향 |
| `lg` | 1024px | 사이드바 노출 기준 |
| `xl` | 1280px | 중앙 max-width 확장 |

### 8.2 레이아웃 스위치

- **모바일 (기본):** 단일 컬럼, 상담 플로우 우선. 사이드바 없음.
- **`lg:` 이상:** 좌측 사이드바(최근 상담 + 마음 한 스푼) 노출. 중앙 상담 영역 `max-w-2xl` 유지.

### 8.3 터치·포인터

- 터치 타겟 44×44px 최소 (iOS HIG + WCAG)
- 호버 효과는 `hover:` + `@media (hover: hover)` 명시적 쿼리 고려 (터치 기기 불필요한 상태 변경 방지)
- 액티브 피드백은 `active:scale-[0.97]`~`[0.98]`로 촉감 제공

### 8.4 SSE 스트리밍 렌더

- 토큰 단위로 텍스트 추가 시 레이아웃 시프트 방지 — 메시지 컨테이너에 최소 높이 유지
- 긴 응답은 자동 스크롤 **마지막 위치 고정**, 사용자가 위로 스크롤하면 추적 중단

### 8.5 세이프 에어리어

- iOS 세이프 에어리어 존중 (`env(safe-area-inset-*)`)
- 하단 고정 입력창(채팅 모드) 시 `pb-[env(safe-area-inset-bottom)]`

---

## 9. Agent Prompt Guide

> AI 에이전트가 UI 변경 작업 시 빠르게 참조할 체크리스트. 설계 원칙을 요약한 "북극성의 시각 언어" 버전.

### 9.1 변경 전 확인

- [ ] 이 변경이 북극성 **V1(안전)·V3(진입장벽)·V6(일관성)**에 부합하는가?
- [ ] 새 색상·폰트·컴포넌트를 도입하는가? → 기존 토큰으로 먼저 시도
- [ ] 위기 배너 z-index·노출 경로를 가리지 않는가?
- [ ] 마크다운 렌더를 사용자 입력에 적용하지는 않는가?

### 9.2 필수 규약 (절대 위반 금지)

1. 상담 본문 최소 16px · line-height 1.6+
2. 터치 타겟 44px 이상
3. 위기 배너는 z-50 · 애니메이션/지연 없이 첫 프레임 노출
4. `destructive`(빨강)는 "삭제 확인"에만
5. 사용자 입력은 평문 렌더

### 9.3 자주 쓰는 조합 치트시트

```tsx
// 주 CTA
<Button variant="default" size="lg">시작하기</Button>

// 카테고리 버튼
<TopicButton color="#7C9885" label="나" description="마음, 감정" icon={...} onClick={...} />

// 정보 카드
<Card>
  <CardHeader>
    <CardTitle>오늘의 마음 돌봄</CardTitle>
  </CardHeader>
  <CardContent>…</CardContent>
</Card>

// 상담사 응답 (마크다운)
<div className="markdown-content">
  <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
</div>

// 선택지 버튼
<button className="rounded-xl bg-secondary/80 hover:bg-secondary text-secondary-foreground px-4 py-3 text-base active:scale-[0.98] transition-all">
  {option}
</button>
```

### 9.4 새 컴포넌트 추가 프로토콜

1. `components/ui/` 하위 재사용 가능한지 먼저 판단. 기능별 도메인 컴포넌트는 `components/{feature}/`
2. CVA + Radix Slot 패턴 유지
3. 모든 상태(hover, focus, active, disabled)에 대한 스타일 정의
4. `data-slot="..."` 속성으로 의미 구분 (쉽게 오버라이드 가능)
5. `cn()` 유틸로 외부 `className` 머지
6. 스크린샷이나 설명을 이 문서 §4에 추가

### 9.5 시각적 회귀 검사 (Playwright MCP)

새 컴포넌트 도입 시 다음 시나리오 통과 필수:
- 모바일 뷰포트 375×667에서 터치 타겟 ≥44px
- 크라이시스 배너 노출 시 z-index 최상단 확인
- 포커스 링 `ring-ring` 가시성 (키보드 네비게이션)
- `prefers-reduced-motion` 활성화 시 애니메이션 중단

---

## 10. 변경 이력

| 날짜 | 변경 | 사유 |
|------|------|------|
| 2026-04-18 | 초기 작성 (9섹션 + Agent Prompt Guide) | 디자인 규칙 단일화, 에이전트 참조 경로 확보 |
| 2026-05-02 | origin 23커밋 동기화: §4 컴포넌트 재작성 (`category-button-variants`/`chat/*`/`landing/wirocare-landing`), `lib/ui-data.tsx` 삭제 반영, 응답 모드 인라인 패턴 명시, SSE 스트리밍 chunk 패턴 추가 | 다크 그린 랜딩 리뉴얼·채팅 컴포넌트 분리·실시간 스트리밍 도입에 따른 정합 |

---

## 참조

- **북극성**: `.claude/skills/to-high-feature-orchestrator/references/product-principles.md`
- **구현 토큰**: `apps/web/src/app/globals.css` · `apps/web/src/lib/ui-data.tsx`
- **컴포넌트**: `apps/web/src/components/ui/` · `apps/web/src/components/*.tsx`
- **유사 참고 (awesome-design-md)**: Linear, Intercom, Cal.com — getdesign.md에서 브라우징
