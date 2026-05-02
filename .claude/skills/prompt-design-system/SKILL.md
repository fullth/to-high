---
name: prompt-design-system
description: TO-HIGH의 OpenAI GPT-4o 심리 상담 프롬프트를 설계·수정·최적화할 때 사용한다. apps/api/src/prompts의 system.ts/categories/counselor-types/response-modes 수정, OpenAI 호출 파라미터 조정, 토큰 경제(rolling summary, meaningless input, initial questions) 유지, 상담사 인격(T/F/reaction/listening) 정의, 응답 모드(comfort/listen/organize/validate/direction/similar) 경계 유지 같은 모든 프롬프트 작업에 반드시 이 스킬을 사용하라. 상담 응답 품질·톤·포맷·길이 변경 요청에 트리거.
---

# Prompt Design System

TO-HIGH의 상담 응답 품질은 프롬프트의 품질이다. 이 스킬은 프롬프트를 수정할 때 지켜야 할 원칙과 검증 방법을 담는다.

## 프롬프트 파일 지도

```
apps/api/src/prompts/
├── system.ts              ← 메인 상담 프롬프트 + PROMPT_CONFIG
├── categories.ts          ← 카테고리별 초기 질문/힌트/컨텍스트
├── categories/            ← 카테고리별 전문 지식 (career, family, future, relationship, self-esteem)
├── counselor-types.ts     ← T/F/reaction/listening 인격
├── response-modes.ts      ← 6가지 응답 모드
└── index.ts               ← 배럴 export
```

`openai.agent.ts`는 이 프롬프트들을 조합하여 OpenAI에 전달한다.

## 변경하기 전 반드시 읽기

1. `PROMPT_CONFIG` 상수 (`system.ts`) — MIN_CONTEXT_FOR_RESPONSE, MIN_TURNS_FOR_ADVICE, TEMPERATURE, MODEL
2. `GENERATE_OPTIONS_SYSTEM_PROMPT` 본문 — 선택지/응답의 금지·허용 규칙
3. 현재 프롬프트가 다루는 edge case(의미없는 입력, 위기, 조언 요청 감지, 무관 주제 차단)

## 핵심 규약 (변경 금지 또는 신중한 변경 필요)

### A. 응답 포맷
- 응답 길이 `150-250자` (PROMPT_CONFIG.RESPONSE_LENGTH)
- 마크다운 제목(`**제목**`, `[제목]`) 금지
- 조언은 번호 리스트로
- 반말·물음표 규약은 선택지(`options`)에만 적용. 응답 본문은 존댓말 허용.

### B. 선택지 규약
- 8개 고정, 15자 이내, 반말, 물음표 없음
- 마지막(8번째)은 반드시 "조언해줘" 또는 "정리해줘"
- 다양한 감정축 포함: 동의 / 반대 / 더 말하기 / 주제 전환 / 조언 요청 / 경청 요청

### C. 조언 모드 트리거
- 3턴 이상이면 조언/해석 제시 (`MIN_TURNS_FOR_ADVICE`)
- 사용자가 "조언해줘/어떻게 하면/정리해줘" 등을 말하면 즉시 조언 모드(질문 금지)

### D. 금지 행동
- 상담 무관 주제(요리/코딩/번역 등)에 답변 금지
- 공감만 하고 내용 없이 끝내기 금지
- "~하셨군요. ~세요?" 패턴 3회 이상 반복 금지
- 의료 진단·처방 금지 (상담 ≠ 의료)

## 응답 모드별 경계 (혼합 금지)

| 모드 | 본질 | 허용 | 금지 |
|------|------|------|------|
| `comfort` | 공감·위로 | 감정 인정, 따뜻한 말 | 해결책·행동 제안 |
| `listen` | 경청 | 짧은 반응, 다음 이야기 유도 | 조언, 해석 |
| `organize` | 상황/감정 정리 | 사실-감정 분리, 요점화 | 판단, 해결책 |
| `validate` | 감정 타당화 | "그럴 수 있어요" 류 | 진단, 비교 |
| `direction` | 행동 제안 | **작은** 행동 1개 | 거창한 계획, 여러 단계 |
| `similar` | 유사 경험 공유 | 일반화된 사례 | 개인 식별 정보, 과장 |

모드 프롬프트 수정 시 다른 모드와 경계가 흐려지지 않는지 검토.

## 상담사 타입

| Type | 특징 | 주의 |
|------|------|------|
| `F` | 감정 공감 우선 | 해결책을 앞에 두지 않는다 |
| `T` | 논리·해결 | 공감 한 줄 후 해결. 차갑지 않게 |
| `reaction` | 짧은 리액션만 | 대화 차단하지 않는 정도 |
| `listening` | 경청 | 질문도 최소 |

## 토큰 경제

- **첫 질문**: `INITIAL_QUESTIONS[category]` 미리 정의 — OpenAI 호출 생략
- **의미없는 입력**: `MEANINGLESS_PATTERNS` 정규식에 걸리면 fallback 응답
- **Rolling summary**: context 길이가 임계 초과 시 `ROLLING_SUMMARY_PROMPT`로 요약 후 앞부분 대체
- **세션당 최대 턴**: `MAX_CONTEXT_COUNT=200` (backend 상수)
- 새 프롬프트 추가 시 토큰 예산 추정(입력 + 출력). 불필요한 반복 지시 제거.

## 변경 워크플로우

1. **영향 분석** — 어떤 모드/카테고리/타입에 영향? 기존 테스트가 가정하는 불변식은?
2. **A/B 샘플 비교** — 수정 전/후 같은 입력에 대한 응답 예시 3개씩 생성하고 품질 비교:
   - 공감 적절성
   - 조언 구체성 (해당되는 모드만)
   - 금지 사항 위반 여부
   - 길이/포맷 준수
3. **안전성 검토** — 위기 신호 감쇠 위험, 판단적 표현, PII 언급 여부 → safety-auditor에 리뷰 요청
4. **토큰 영향 측정** — 프롬프트 길이 증가분, 세션당 예상 비용 증가
5. **회귀 테스트** — `npm run test:api`, 특히 `chat.service.spec.ts`, `crisis-detector.spec.ts`

## 새 모드/카테고리 추가 시

1. `types/session.ts`의 union 타입 확장 (api-architect 협업)
2. 프롬프트 상수 추가(`RESPONSE_MODE_PROMPTS`, `CATEGORY_CONTEXTS` 등)
3. `response-modes.ts`의 `RESPONSE_MODE_OPTIONS` 배열에 UI용 메타 추가 (web-architect 협업)
4. 기존 모드와의 경계 문서화 (모드별 경계 표 업데이트)
5. 초기 질문(`INITIAL_QUESTIONS[category]`)과 초기 선택지(`INITIAL_OPTIONS[category]`) 정의

## 체크리스트

- [ ] 응답 포맷 규약(길이, 마크다운 금지, 리스트) 유지
- [ ] 모드별 경계 표와 일치
- [ ] 위기 감지가 어떤 모드보다 우선하는가
- [ ] before/after 예시 대화 3쌍 준비
- [ ] `npm run test:api` 통과
- [ ] safety-auditor 리뷰 요청 전송
