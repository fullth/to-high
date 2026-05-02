# TO-HIGH (위로) — Claude 작업 가이드

## 하네스: 심리 상담 서비스 기능 개발

**목표:** NestJS 백엔드 + Next.js 프론트 + OpenAI 프롬프트가 얽힌 TO-HIGH의 기능 변경을 안전성(위기 감지, PII, 상담 윤리)을 보장하면서 일관된 품질로 수행한다.

**북극성(North Star):** 제품의 핵심 개념·용어·가치·불변식·에픽은 `.claude/skills/to-high-feature-orchestrator/references/product-principles.md`에 정의되어 있다. 모든 기능 변경은 이 문서의 불변식(I1~I7)·안티패턴과 충돌하지 않아야 하며, 충돌 시 사용자 확인을 먼저 받는다. 가치 충돌 시 우선순위 V1(안전) > V2(비판단) > V3(진입장벽) > V4(점진적 개방) > V5(프라이버시) > V6(일관성) > V7(지속가능성)을 따른다.

**DESIGN.md:** 모든 UI·디자인 변경은 프로젝트 루트 `DESIGN.md`(Google Stitch 9섹션 포맷 기반)를 따른다. 색상 토큰·타이포·컴포넌트 패턴·크라이시스 UI 규약·접근성 기준을 정의한다. 새 색상·폰트·그림자 도입 시 반드시 이 문서 갱신.

**트리거:** 다음 중 하나 이상에 해당하면 `to-high-feature-orchestrator` 스킬을 사용하라.
- 2개 이상 계층(프롬프트/API/Web)이 얽힌 기능 추가·수정·버그 수정
- 새 상담 모드/카테고리/상담사 타입 추가
- 응답 DTO·엔드포인트·세션 구조 변경
- 위기 감지·PII·인증·결제 흐름 수정
- 스트리밍/SSE·롤링 요약·토큰 경제 변경
- "다시 실행", "재실행", "업데이트", "이전 결과 기반으로" 등 후속 작업 요청

단일 파일의 사소한 수정(오타, 색상 토큰 변경)은 직접 처리 가능.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-04-18 | 초기 하네스 구성 (5 에이전트 팀 + 5 스킬 + 오케스트레이터) | 전체 | - |
| 2026-04-18 | 북극성 문서 추가 (도메인 용어집·가치·불변식·에픽·안티패턴) | to-high-feature-orchestrator/references/product-principles.md, CLAUDE.md | 핵심 가치·개념 흔들림 방지 |
| 2026-04-18 | ~~E1 상담 엔진: 모드 의도 fast path + userTurnCount 버그 수정 + 크라이시스 재스캔 가드~~ | ~~prompts/response-modes.ts, client/openai/openai.agent.ts, app/chat/chat.service.ts, controller/chat/dto/chat.response.ts~~ | **무효화 (2026-05-02)** — origin 23커밋이 응답 모드 선택을 제거하고 SSE 제너레이터로 전면 재작성하면서 이 변경은 흡수·대체됨 |
| 2026-04-18 | E2E 테스트 인프라 준비: Playwright MCP 등록 + 5개 시나리오 문서화 | .mcp.json, .claude/skills/to-high-feature-orchestrator/references/e2e-scenarios.md | 실제 사용자 플로우에서 수정 검증. Docker·세션 리로드 후 실행 예정 |
| 2026-04-18 | DESIGN.md 도입 (Google Stitch 9섹션) | DESIGN.md, CLAUDE.md | 디자인 규칙 단일화 — globals.css/ui-data/Skill 파편 통합. 크라이시스 UI·접근성 규약 명문화 |
| 2026-05-02 | origin 23커밋 동기화 — 다크그린 리뉴얼·인라인 단일 흐름·게스트 5턴 로그인월·SSE 스트리밍 마이그레이션 반영 | product-principles.md, DESIGN.md, nextjs-feature-builder/SKILL.md, CLAUDE.md | 타 세션 작업과 정합. `ui-data.tsx` 제거, `components/{chat,landing}/` 분리, `category-button-variants.tsx` 도입, 응답 모드 인라인 패턴, `selectOptionStream/setResponseModeStream/sendMessageStream` 청크 패턴, phase 머신(`selecting → mode/loginWall → chatting → ended`) 명문화 |
