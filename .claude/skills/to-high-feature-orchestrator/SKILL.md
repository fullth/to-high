---
name: to-high-feature-orchestrator
description: TO-HIGH(위로) 심리 상담 서비스의 기능 개발·수정·버그 수정·리팩터링을 오케스트레이션할 때 사용한다. NestJS 백엔드·Next.js 프론트·OpenAI 프롬프트 중 2개 이상 계층이 얽힌 모든 작업(새 상담 모드 추가, 카테고리 확장, DTO 변경, 인증/결제 흐름 수정, 세션/스트리밍 변경, 위기 감지 강화 등)에 반드시 이 스킬을 사용하라. "기능 추가해줘", "버그 고쳐줘", "이 부분 수정해줘", "다시 실행", "재실행", "업데이트", "보완", "개선", "이전 결과 기반으로" 같은 요청에도 트리거. 단일 계층만 건드리는 사소한 수정은 직접 처리 가능.
---

# TO-HIGH Feature Orchestrator

TO-HIGH 심리 상담 서비스의 기능 변경을 5명 에이전트 팀으로 조율한다.

## 팀 구성

| 에이전트 | 소유 영역 | 빌트인 타입 |
|---|---|---|
| `api-architect` | `apps/api/src/app,controller,persistence,database,common,client` | general-purpose |
| `web-architect` | `apps/web/src/**` | general-purpose |
| `prompt-engineer` | `apps/api/src/prompts,client/openai` | general-purpose |
| `safety-auditor` | 읽기 전용 감사 (위기·PII·권한·윤리) | general-purpose |
| `qa-validator` | 빌드·테스트·경계면 교차 검증 | general-purpose |

**모든 Agent 호출 시 `model: "opus"` 명시.**

## 실행 모드

**에이전트 팀(기본).** `TeamCreate`로 5명 팀을 구성하고 `TaskCreate`로 작업을 분배. 팀원 간 `SendMessage`로 직접 통신.

사유: 상담 기능 변경은 프롬프트↔API↔Web이 동시에 움직이고, 서로의 산출물을 실시간 참조해야 한다.

## 북극성 (North Star)

**모든 작업 착수 전, `references/product-principles.md`를 반드시 먼저 읽는다.** 이 문서는 제품의 도메인 용어집·핵심 가치(V1~V7)·불변식(I1~I7)·에픽(E1~E9)·안티패턴을 정의한다.

- 요청이 **불변식(I1~I7)에 위배**되면 즉시 사용자 확인 없이 진행하지 않는다.
- 핵심 가치 간 충돌이 있으면 **V1(안전) > V2(비판단) > V3(진입장벽) > V4(점진적 개방) > V5(프라이버시) > V6(일관성) > V7(지속가능성)** 우선순위를 따른다.
- 각 에이전트에 작업 할당 시, 해당 작업이 속하는 에픽 번호(E1~E9)를 함께 전달한다.

## Phase 0. 컨텍스트 확인 (반드시 먼저)

```
프로젝트루트/_workspace/ 존재?
├─ 없음 → 초기 실행
├─ 있음 + 사용자가 "부분 수정/재실행/업데이트" 요청
│  → 부분 재실행 (관련 에이전트만 호출)
└─ 있음 + 새 요청
   → 기존 _workspace/ 를 _workspace_prev/로 이동 후 초기 실행
```

각 에이전트는 자신의 이전 산출물(`_workspace/*_{agent}_*.md`)을 먼저 읽는다.

## Phase 1. 요청 분해

사용자 요청을 읽고 다음을 판단:

1. **북극성 정합성** — `references/product-principles.md`의 불변식·안티패턴 위배 여부 먼저 확인
2. **소속 에픽** — E1~E9 중 어디인가 (여러 개 가능)
3. **영향 계층** — 프롬프트? API? Web? (여러 개 가능)
4. **안전 민감도** — 위기 감지·PII·결제와 관련? → safety-auditor 필수
5. **경계면 변경** — 응답 DTO 변경? 새 엔드포인트? → qa-validator 점진적 실행
6. **작업 규모** — 소/중/대 (팀 크기 조정 불필요, 5명 고정이지만 일부는 호출 안 할 수 있음)

## Phase 2. 팀 생성과 초기 작업 할당

```
TeamCreate(members=[api-architect, web-architect, prompt-engineer, safety-auditor, qa-validator])
```

`_workspace/` 디렉토리 생성:
```bash
mkdir -p _workspace
```

작업 할당 예시 (새 응답 모드 추가 요청):
1. `TaskCreate` — prompt-engineer: 새 모드 프롬프트 설계, 모드 경계 문서화
2. `TaskCreate` — api-architect: 타입 추가, 응답 모드 처리 서비스 수정, DTO 업데이트 (blockedBy: 1)
3. `TaskCreate` — web-architect: 모드 선택 UI, 라벨/설명, API 연결 (blockedBy: 2)
4. `TaskCreate` — safety-auditor: 프롬프트 안전성 + UI 위기 경로 감사 (blockedBy: 1, 3)
5. `TaskCreate` — qa-validator: 경계면 교차 검증 + 빌드·테스트 (blockedBy: 3)

## Phase 3. 점진적 QA 루프

각 에이전트가 작업 완료할 때마다 **즉시** qa-validator에 검증 요청 (full 통합 검증은 마지막에).

```
api-architect 완료 → qa-validator(quick: 빌드+타입)
web-architect 완료 → qa-validator(quick: 빌드+타입)
prompt-engineer 완료 → qa-validator(standard: 빌드+테스트+경계면)
전체 완료 → qa-validator(full: 스모크 체크리스트 포함)
```

Blocker 발견 시 qa-validator가 소유 에이전트에 재작업 요청 `SendMessage`.

## Phase 4. 안전 감사

safety-auditor는 변경이 모두 확정된 시점에 한 번 더 전체 감사 수행. Critical 발견 시 배포 차단·해당 에이전트에 수정 요청.

## Phase 5. 결과 종합

오케스트레이터(=리더)는:
1. 각 에이전트 최종 산출물을 `_workspace/`에서 수집
2. qa-validator 보고서와 safety-auditor 감사 보고서 요약
3. 사용자에게 다음 보고:
   - 변경된 파일 목록
   - 경계면 변경 요약
   - 안전 감사 결과 (Critical/High 있으면 명시)
   - 남은 작업 / 추천 조치

## 데이터 전달 프로토콜

- **메시지(팀)**: 실시간 협업 — "DTO shape 바뀌었어요", "위기 감지 오탐 증가 가능성" 같은 즉시 공유
- **태스크(팀)**: 작업 상태·의존성 관리
- **파일(팀)**: `_workspace/{NN}_{agent}_{artifact}.md` — 감사 보고서, 경계면 비교표, 설계 노트

파일명 컨벤션:
- `01_prompt-engineer_design.md`
- `02_api-architect_changes.md`
- `03_web-architect_changes.md`
- `04_safety-auditor_audit.md`
- `05_qa-validator_report.md`

최종 산출물(실제 코드)은 `apps/*` 하위에 반영. `_workspace/`는 감사·재실행용으로 보존.

## 에러 핸들링

| 상황 | 처리 |
|------|------|
| 에이전트 1회 실패 | 1회 재시도. 실패 사유를 에이전트에 전달 |
| 2회 연속 실패 | 해당 작업 스킵하고 보고서에 "미해결: {사유}" 명시 |
| 경계면 불일치 | qa-validator가 Blocker 표시 → 소유 에이전트에 재작업 |
| 위기 감지 회귀 감지 | 즉시 배포 차단, prompt-engineer + safety-auditor 긴급 협업 |
| 빌드/테스트 환경 문제 (MongoDB 미기동 등) | 정적 검증만 수행, 사용자에 환경 문제 보고 |

상충 데이터는 삭제하지 않고 출처 병기.

## 테스트 시나리오

### 시나리오 1 (정상): 새 응답 모드 "격려해줘" 추가
1. 사용자: "응답 모드에 '격려해줘' 추가해줘"
2. 오케스트레이터가 Phase 0 수행 → _workspace 없음, 초기 실행
3. TeamCreate(5명), TaskCreate 5개 (의존 관계 포함)
4. prompt-engineer → `response-modes.ts`에 `encourage` 모드 프롬프트 추가, 다른 모드와 경계 문서화
5. api-architect → `types/session.ts`의 `ResponseMode` union 확장, chat.service/controller 업데이트
6. web-architect → `RESPONSE_MODE_OPTIONS`에 UI 메타 추가, 버튼 렌더
7. safety-auditor → 격려 모드가 판단적 표현 유도 여부 검토
8. qa-validator → 빌드+테스트+경계면 diff
9. 오케스트레이터 결과 종합 보고

### 시나리오 2 (에러): 위기 감지 키워드 변경 중 회귀
1. 사용자: "'힘들어'는 위기 키워드에서 빼줘"
2. prompt-engineer/api-architect가 크라이시스 키워드 수정
3. qa-validator가 `crisis-detector.spec.ts` 실행 → 기존 테스트 케이스 실패
4. safety-auditor가 Critical 이슈 제기 — 해당 키워드 제거가 미탐 증가 위험
5. 오케스트레이터가 변경 롤백 권고, 사용자에 근거 보고 후 재결정 요청

## 후속 작업 트리거 키워드

description에 포함된 키워드로 후속 요청을 받는다:
- "다시 실행", "재실행", "업데이트", "수정", "보완", "개선"
- "이전 결과 기반으로"
- "{부분}만 다시"

후속 요청 시 Phase 0에서 `_workspace/` 존재·사용자 범위를 확인해 **부분 재실행** 결정.

## 체크리스트

- [ ] Phase 0 컨텍스트 확인 수행
- [ ] TeamCreate로 팀 구성, Agent 호출마다 `model: "opus"`
- [ ] `_workspace/` 파일 컨벤션 준수
- [ ] 각 에이전트 완료 직후 qa-validator 점진적 검증
- [ ] safety-auditor가 최종 변경 전체 감사
- [ ] 최종 보고에 경계면 변경 + Critical/High 감사 결과 명시
