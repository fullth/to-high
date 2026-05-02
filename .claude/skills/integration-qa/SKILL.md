---
name: integration-qa
description: TO-HIGH의 NestJS API와 Next.js Web 간 경계면을 교차 검증하고 빌드/단위테스트를 실행할 때 사용한다. 응답 DTO(apps/api/src/controller/*/dto/*.response.ts)와 프론트 소비부(apps/web/src/lib/api.ts 등)의 필드명·타입·nullable·배열·날짜 직렬화·enum 값을 필드별 diff로 비교하고, npm run build:api/build:web/test:api 실행 결과를 수집하고, SSE 페이로드·위기 감지 응답 shape 일관성을 확인하는 모든 통합 QA 작업에 반드시 이 스킬을 사용하라. 기능 완료 후 검증·회귀 체크·경계면 불일치 수사에 트리거.
---

# Integration QA

## 핵심 원칙: 존재 확인 ≠ 일치 확인

**나쁜 QA**: "API에 `createdAt` 필드 있음. 프론트에서도 `createdAt` 씀. OK."
**좋은 QA**: "API는 `createdAt: Date` (Mongoose), 응답 JSON에선 `string`. 프론트는 `new Date(createdAt)`로 파싱 중. 필드명은 일치하지만 타입 처리는 정상. ✅"

**좋은 QA 2**: "API 응답에 `messages: []` (빈 배열). 프론트는 `messages?.map(...)` 사용. optional 처리 OK. 단 응답 DTO 정의는 `messages: Message[]`라 옵셔널 아님. 불일치 — 타입 엄격화 필요. ⚠️"

## 검증 레벨

| 레벨 | 포함 | 시점 |
|------|------|------|
| `quick` | 빌드 + 타입 체크 | 작은 수정 직후 |
| `standard` | quick + 단위 테스트 + 경계면 diff | 에이전트 작업 완료 직후 |
| `full` | standard + 수동 스모크 체크리스트 | 기능 묶음 완료 시 |

## 표준 절차

### Step 1. 변경 파일 파악

- 오케스트레이터/에이전트가 전달한 파일 목록 확인
- 백엔드 `apps/api/src/controller/*/dto/*.response.ts` 변경이 있으면 경계면 diff 필수
- SSE/스트리밍 엔드포인트 변경 시 페이로드 shape도 비교 대상

### Step 2. 빌드·테스트 실행

```bash
npm run build:api      # NestJS TS 컴파일
npm run build:web      # Next.js build
npm run test:api       # Jest (chat.service.spec, crisis-detector.spec 포함)
cd apps/api && npm run lint  # ESLint
```

결과 캡처:
- 성공/실패
- 실패 시 첫 5개 에러의 파일:라인 + 메시지

### Step 3. 경계면 교차 비교

변경된 응답 DTO마다 다음 표를 작성:

```markdown
### `GET /api/chat/sessions` (example)

| Field | API (`chat.response.ts`) | Web (`lib/api.ts` 또는 소비부) | 상태 |
|-------|--------------------------|--------------------------------|------|
| `id` | `string` | `string` | ✅ |
| `category` | `Category` (union) | `string` | ⚠️ 프론트가 union 타입 공유 안함 |
| `createdAt` | `string` (ISO) | `string` → `new Date()` | ✅ |
| `counselorType` | `CounselorType \| undefined` | `string` (optional 누락) | ❌ optional 처리 누락 |
```

**확인 항목:**
1. 필드명 일치
2. 타입 일치 (union/literal/primitive)
3. optional/nullable 처리
4. 날짜: API에서 Date → JSON에선 string, 프론트에서 Date로 재변환
5. 배열: 빈 배열 보장 vs undefined
6. enum 값: `'active' | 'completed'` 값 자체 일치
7. 중첩 객체 구조

### Step 4. 경계면 버그 패턴 감시 (체크리스트)

- [ ] Mongoose `ObjectId` → 프론트에서 `string`으로 변환되는가
- [ ] Date 필드 직렬화/역직렬화
- [ ] `undefined` vs `null` 혼용
- [ ] 에러 응답 shape (`{ code, message, ... }`)의 `code` 값을 프론트가 분기 사용하는가
- [ ] SSE 청크 포맷(`data: ...\n\n`)이 변경되지 않았는가
- [ ] 위기 감지 응답(`crisis: { level, ... }`)의 위치와 shape
- [ ] `canRequestFeedback`, `canProceedToResponse` 같은 플래그 필드 기본값

### Step 5. 단위 테스트 결과 분석

- 실패한 테스트가 있으면 파일·케이스명 기록
- 위기 감지 관련 테스트(`crisis-detector.spec.ts`) 실패는 즉시 Blocker로 표시
- 테스트 자체가 오래된 것으로 보이면 `요업데이트` 표기(삭제 금지)

### Step 6. 보고서 작성

`_workspace/NN_qa-validator_report.md`:

```markdown
# QA Report — {기능명} ({날짜})

## 실행 결과
- `npm run build:api`: ✅ / ❌ (에러 요지)
- `npm run build:web`: ✅ / ❌
- `npm run test:api`: N passed, N failed
- Lint: ✅ / ⚠️ (경고 N개)

## 경계면 비교
(Step 3의 표)

## 발견 이슈

### [Blocker] {제목}
- 경로: ...
- 증상: ...
- 소유자: @api-architect

### [Major] / [Minor] ...

## 재실행 필요 여부
- [ ] 수정 후 `standard` 레벨로 재검증 필요
```

### Step 7. 수정 위임

- Blocker/Major 이슈는 소유 에이전트에 `SendMessage`로 재작업 요청
- 해결 후 `TaskUpdate`로 QA 재실행 태스크 생성

## 경계면 버그 자주 보이는 위치 (TO-HIGH 특이사항)

- `GenerateOptionsResult` → 프론트가 소비 (`question`, `options[]`, `canProceedToResponse`, `canRequestFeedback?`)
- `SessionListItem`, `SessionDetailResponse` → 프론트 목록/상세 페이지
- 위기 감지 응답 필드 위치 (별도 필드 vs 응답 안에 포함 vs 상태 코드)
- 구독 제한 에러 (`SESSION_LIMIT_EXCEEDED` code) 프론트 분기
- 응답 모드/상담사 타입 enum — 백엔드 정의와 프론트 버튼 라벨 매핑

## 체크리스트

- [ ] 빌드 2개 모두 통과 기록
- [ ] 테스트 결과(pass/fail 수) 기록
- [ ] 변경된 DTO에 대해 필드별 diff 표 존재
- [ ] Blocker/Major 이슈에 소유자 지정
- [ ] 이전 `_workspace/*_qa-validator_report.md`의 미해결 Blocker 재노출
