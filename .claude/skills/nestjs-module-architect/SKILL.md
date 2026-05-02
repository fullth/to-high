---
name: nestjs-module-architect
description: TO-HIGH의 NestJS 백엔드에서 모듈/서비스/레포지토리/컨트롤러/DTO/Mongoose 스키마를 설계·구현할 때 사용한다. apps/api 하위 파일 생성·수정, OpenAI 클라이언트 통합, JWT 가드 적용, Zod+class-validator 검증, 토큰 경제(rolling summary, 의미없는 입력 필터) 유지 같은 백엔드 작업에 반드시 이 스킬을 사용하라. NestJS 컨트롤러·서비스·레포지토리·DTO·스키마를 수정하는 모든 요청에 트리거.
---

# NestJS Module Architect

TO-HIGH 백엔드 아키텍처 규약을 정의하고, 새 기능을 추가하거나 기존 모듈을 수정할 때의 패턴을 제공한다.

## 레이어 분리

```
apps/api/src/
├── app/{domain}/          ← 비즈니스 로직 (Service, Module)
├── controller/{domain}/   ← HTTP 계층 (Controller, DTO)
├── persistence/{domain}/  ← DB 계층 (Repository)
├── database/              ← Mongoose Schema
├── client/                ← 외부 API (OpenAI 등)
├── common/                ← 가드, 파이프, 유틸
├── prompts/               ← OpenAI 프롬프트 (prompt-engineer 소유)
└── types/                 ← 공유 타입
```

**철칙:**
- Service는 **Repository를 통해서만** DB에 접근. `@InjectModel(...)`은 Repository에서만 허용.
- Controller는 **얇게** 유지. 검증 + 서비스 호출 + DTO 매핑만.
- Controller는 Repository를 직접 주입받지 않는다.

## 새 도메인 추가 워크플로우

1. **타입 정의** — `apps/api/src/types/{domain}.ts`에 도메인 타입(`Session`, `ResponseMode` 등 참고).
2. **Mongoose 스키마** — `database/{domain}.schema.ts`. 인덱스·userId·createdAt/updatedAt 명시.
3. **Repository** — `persistence/{domain}/{domain}.repository.ts`. 쿼리는 여기에만.
4. **Service** — `app/{domain}/{domain}.service.ts`. 비즈니스 규칙, 검증, 외부 API 조합.
5. **DTO** — `controller/{domain}/dto/{domain}.request.ts` + `{domain}.response.ts`. Zod 스키마와 class-validator 병행(Zod는 런타임 외부 입력, class-validator는 NestJS 통합).
6. **Controller** — `controller/{domain}/{domain}.controller.ts`. 가드(`JwtGuard`/`OptionalJwtGuard`), Throttler 적용 결정.
7. **Module 등록** — `app/{domain}/{domain}.module.ts` → `app.module.ts`에 import.

## DTO 설계 규칙 (경계면 일치성이 핵심)

응답 DTO는 프론트(`apps/web`)가 그대로 소비한다. 다음을 지킨다:

- **Optional vs Nullable 구분**: `field?: string` (필드 자체 생략) vs `field: string | null` (필드는 존재, 값이 null). 의미 다름.
- **날짜 직렬화**: Mongoose Date → JSON에서 string. 응답 DTO는 `createdAt: string` (ISO).
- **enum 값 고정**: 타입만이 아니라 값 자체(`'active' | 'completed'`)를 공유.
- **배열 기본값**: 빈 배열 vs undefined. 프론트가 `.map()` 호출한다면 반드시 빈 배열 반환.

변경 시 반드시 web-architect에 알림 + qa-validator에 경계면 검증 요청.

## OpenAI 호출 가드레일

- `OpenAIAgent`만 OpenAI SDK 직접 사용. 서비스는 `OpenAIAgent`를 주입받음.
- 호출 전: `isMeaninglessInput` 필터, context 길이 체크.
- 호출 후: JSON 파싱 실패 대비 try/catch + fallback 응답.
- 새 호출 메서드 추가 시: 프롬프트는 `apps/api/src/prompts/`에 정의하고 import. 인라인 금지.

## 인증·권한 패턴

- 공개 엔드포인트: `OptionalJwtGuard` (anonymous 허용)
- 로그인 필수: `JwtGuard`
- anonymous 사용자 처리 시 `userId === 'anonymous'` 분기 항상 재확인(safety-auditor 감사 대상).
- 관리자 API: `app/admin/admin.service.ts`의 권한 체크 재사용.

## 토큰 경제

- `MAX_CONTEXT_COUNT=200`, `MAX_INPUT_LENGTH=500`, `MAX_IMPORT_LENGTH=100000` 상수는 `chat.service.ts` 최상단에 집중. 분산 금지.
- context 크기 임계 초과 시 rolling summary(`ROLLING_SUMMARY_PROMPT`) 적용.
- 첫 질문은 `INITIAL_QUESTIONS`로 API 호출 생략.

## 테스트

- `*.service.spec.ts`에 단위 테스트. Repository는 mock, OpenAI는 `OpenAIAgent` mock.
- 위기 감지 관련 변경은 반드시 `crisis-detector.spec.ts` 돌려본다.
- `npm run test:api`로 검증.

## 빌드·실행

- 개발: `npm run dev:api` (3000 포트)
- 빌드: `npm run build:api`
- 린트: `cd apps/api && npm run lint`

## 체크리스트 (파일 수정 후)

- [ ] 레이어 분리 유지(Controller가 Repository 직접 쓰지 않음)
- [ ] 응답 DTO shape 변경 시 web-architect·qa-validator에 알림
- [ ] JWT 가드·Throttler 적용 여부 명시적 판단
- [ ] PII(세션 context, 이메일) 로그·에러 미노출
- [ ] `npm run build:api`, `npm run test:api` 통과
