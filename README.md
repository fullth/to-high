# 위로(TO-HIGH): AI 기반 심리 상담 서비스

복잡한 감정을 처음부터 말로 표현하기 어려울 때, 간단한 선택지로 시작해 자연스럽게 마음을 열 수 있도록 돕습니다.

## 핵심 기능

- **선택지 기반 대화**: 버튼 클릭만으로 쉽게 시작
- **직접 입력 지원**: 바로 이야기하고 싶을 때 텍스트 입력
- **점진적 컨텍스트 축적**: 대화를 주고받으며 자연스럽게 상황 파악
- **MBTI 기반 상담 스타일**: T(논리형)/F(감정형) 유형에 맞는 맞춤형 응답
- **맞춤형 응답 모드**: 6가지 모드 중 원하는 방식 선택
- **위기 감지**: 자해/자살 관련 표현 감지 및 전문기관 안내
- **실시간 스트리밍**: SSE 기반 AI 응답 스트리밍

## 상담 플로우

```
1. 카테고리 선택 (나, 미래, 일, 관계, 연애, 일상) 또는 직접 입력
2. 선택지 응답 (3~4개 버튼 중 클릭 또는 직접 입력)
3. 충분한 정보 수집 → 응답 모드 선택
4. AI 상담사 응답 (스트리밍)
5. 자유 대화 또는 세션 종료
```

## 응답 모드

| 모드 | 설명 |
|------|------|
| 위로해줘 | 공감과 위로 중심 |
| 들어줘 | 최소 개입, 경청 |
| 상황 정리해줘 | 감정과 사실 분리 |
| 내가 이상한 건가? | 감정 타당성 확인 |
| 뭘 해야 할지 모르겠어 | 작은 행동 1개 제안 |
| 나만 이런 건가? | 유사 경험 공유 |

## MBTI 기반 상담 스타일

사용자의 성향에 맞는 상담 스타일을 선택할 수 있습니다.

| 유형 | 스타일 | 특징 |
|------|--------|------|
| **F (감정형)** | 따스한 공감가 | 감정에 깊이 공감, 정서적 지지 중심 |
| **T (논리형)** | 냉철한 조언가 | 상황 분석, 실용적 해결책 제시 |
| **깊은 대화** | 깊이 있는 탐색 | 내면 탐구, 본질적 질문 |

## 기술 스택

| 구분 | 스택 |
|------|------|
| **Backend** | NestJS, MongoDB, OpenAI GPT-5.6 Terra, GPT-5.6 Luna |
| **Frontend** | Next.js 16, Tailwind CSS, shadcn/ui |
| **Infra** | Vercel (Web), Railway (API + MongoDB) |
| **Monorepo** | npm workspaces |

## 배포

| 서비스 | URL |
|--------|-----|
| Web | Vercel |
| API | Railway |
| DB | MongoDB Atlas (Railway) |

## 프로젝트 구조

```
to-high/
├── apps/
│   ├── api/          # NestJS 백엔드
│   └── web/          # Next.js 프론트엔드
└── packages/         # 공유 패키지
```

## 로컬 개발

### 사전 요구사항

- Node.js 18+
- MongoDB
- OpenAI API Key

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp apps/api/.env.example apps/api/.env

# 실행
npm run dev:api   # 백엔드 (3000)
npm run dev:web   # 프론트엔드 (3001)
```

### 환경 변수

**apps/api/.env**
```
MONGODB_URI=mongodb://localhost:27017/to-high
OPENAI_API_KEY=your-openai-api-key
PORT=3000
FRONTEND_URL=http://localhost:3001
```

**apps/web/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 보안 기능

- **Rate Limiting**: 검증된 로그인 사용자 또는 익명 IP 기준 분당 20회, 세션 시작 5회, AI 생성 경로 합산 10회 제한
- **입력 크기 제한**: 일반 입력 최대 500자, 불러오기 요약 원문 최대 1만자, 요청 본문 최대 64KB
- **세션 대화 제한**: 세션당 최대 200턴, 채팅 모드 사용자 메시지 최대 100개
- **비용 어뷰징 방지**: 상담 외 직접 작업 요청, 저정보 입력, 세 번째 동일 입력은 AI 호출 없이 응답하고 모든 생성 경로에 출력 토큰 상한 적용
- **프롬프트 보호**: 사용자 입력을 비신뢰 데이터로 격리하고 내부 지침 노출, 역할 탈취, 의료 진단과 처방 유도를 차단
- **세션 보호**: 로그인 상담은 JWT 사용자 소유권을 확인하고 게스트 상담은 시작 시 발급한 세션별 소유 토큰을 `X-Guest-Token` 헤더로 검증합니다. DB 조회·갱신에도 소유 조건을 적용하며 claim 후 기존 게스트 접근을 거부합니다. 토큰 없는 기존 게스트 상담은 접근할 수 없고 새 상담을 시작해야 합니다.
- **위기 표현 우선**: 한국어 완곡 표현과 영어, 일본어, 중국어 위기 표현을 상담 외 요청보다 먼저 감지
- **미출시 서비스 차단**: 감정 일기와 구독 화면은 출시 플래그가 꺼진 동안 404를 반환하고 결제 API를 등록하지 않음

## 로컬 회귀 검증

- API: `npm run test --workspace=@to-high/api -- --runInBand` (DB·LLM mock, HTTP 테스트는 loopback 임시 포트 사용)
- Web 클라이언트: `npx playwright test --config apps/web/playwright.offline.config.ts` (브라우저 서버·외부 API 미사용)
- 질문·선택지는 검증 후 함께 전송되므로 첫 텍스트 표시는 기존 토큰 스트리밍보다 늦을 수 있습니다. 의미상 중복이나 상담 단계 진행 전체 설계는 별도 개선 범위입니다.

## 라이선스

[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)

이 저장소의 자체 저작물은 **CC BY-NC-ND 4.0** 라이선스를 따릅니다.

- 비상업적 목적으로 원본의 전부 또는 일부를 복제하고 공유할 수 있습니다.
- 비상업적 목적으로 수정본을 작성하고 복제할 수 있지만, 수정본 공유는 허용하지 않습니다.
- 공유 시 저작자·저작권 표시, 라이선스·면책 고지와 원본 링크 등을 유지해야 합니다.
- 이 허가에 포함되지 않는 상업적 이용이나 수정본 공유에는 해당 권리자의 별도 서면 허가가 필요합니다.
- 제3자 코드·로고·이미지와 의존성에는 각각의 별도 라이선스 및 권리 표시가 적용됩니다.

위 내용은 한국어 이용 안내입니다. 법률상 예외·제한을 포함한 정확한 조건은
[공식 라이선스 전문](https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode.en)을 따르며,
적용 범위와 안내는 [LICENSE](./LICENSE)를 확인하세요.

---

## Claude Code를 활용할 때

새 세션에서 이 프로젝트를 이어서 작업할 때:

1. 이 README를 먼저 읽어 전체 구조 파악
2. [`apps/api/README.md`](./apps/api/README.md) - **백엔드 진행 상황, TODO, API 명세**
3. [`apps/web/README.md`](./apps/web/README.md) - 프론트엔드 기본 정보

> `apps/api/README.md`에 프로젝트 전체 진행 상황과 다음 작업 목록이 정리되어 있습니다.


## 미보관 상담 MVP (로컬 변경)

새 진입점은 `/talk`(선택지 + 직접 입력; 출시 UI에서는 응답 모드/스타일 선택 미제공)와 `/characters`(로그인 캐릭터 하나 + 명시적으로 승인한 기억)입니다. 상담 원문과 요약은 React RAM에서만 유지하고 종료·페이지 이동·새로고침 시 복원하지 않습니다. 새 `POST /ephemeral/respond`는 Session/UserProfile 저장소를 호출하지 않습니다. 캐릭터 기억은 별도 Character 컬렉션에 저장하며 원문·전체 요약·세션 ID를 저장하지 않습니다.

- 기존 `/chat/*`는 운영에서 410입니다. 과거 Mongo 데이터는 삭제하지 않습니다. 관리자 기능도 이 MVP에서 410으로 차단합니다.
- 기존 보안 회귀 테스트만 `NODE_ENV=test`와 `TO_HIGH_ENABLE_LEGACY_TEST_ROUTES=1`을 함께 설정해 구형 경로를 실행할 수 있습니다. **운영 복구 플래그는 없습니다.** 데이터 삭제나 기존 경로 재개는 별도 결정입니다.
- 신규 API는 500자 입력, 20메시지/12,000자 문맥, 64KB 본문 제한을 적용합니다. 한도에서는 앞 문맥을 자동 삭제하지 않고 새 상담을 안내합니다.
- 기존 분당 생성10회 제한 + 계정/익명IP별 동시에 응답1개를 적용합니다. 익명IP는 RAM 카운터 키에 해시만 사용합니다. 사용자 컴퓨터/기기 지문·평생1회 제한을 추가하지 않습니다.
- 로컬 기본 요청 예산은 UTC 일100회/프로세스입니다. 운영에서는 검토된 `TO_HIGH_LLM_DAILY_REQUEST_LIMIT`(1–100000 정수)을 명시하지 않으면 생성이503으로 차단됩니다. 이는 요청 수 상한이며 **여러 인스턴스 전체의 금액 상한이 아닙니다**. 실패·중단 요청도 예약 사용량에 포함합니다. 답변+선택지 생성 최대2회, 공통30초 중단, 자동재시도0회. 기존 모델 출력 토큰상한은 유지합니다.
- 모든 Chat Completions 요청은 `store:false`입니다. 공급자의 abuse monitoring 보관과 별도 ZDR 승인은 다른 설정입니다. 계정 설정은 변경하지 않았습니다.
- Sentry 전체송신·replay/profiling/traces와 전역GTM을 로컬 코드에서 비활성화했습니다. 새 화면은 ChannelTalk를 로드하지 않습니다. 원문을 포함한 임의 오류를 로그/응답에 싣지 않는 전역 예외 필터를 적용합니다.

출시 전에는 전역 비용 상한/다중 서버 제한, 실제 AI 계정 보존 정책, 프록시·호스팅의 요청 본문/크래시덤프/백업 정책, 보안 의존성 업데이트를 검증해야 합니다. 현재 변경은 운영 배포 완료나 완전한 공급자 무보관을 보장하지 않습니다.

안전한 로컬 검증: `TO_HIGH_ENABLE_LEGACY_TEST_ROUTES=1 npm test --workspace=@to-high/api -- --runInBand`. 실제DB 테스트는 `TO_HIGH_ISOLATED_DB=1 TO_HIGH_TEST_MONGO_PORT=<직접 만든 loopback 전용 Mongo 포트>`로 test/jest-local-mongo-character.json 및 test/jest-local-character-repository.json을 별도 실행합니다. 테스트는 임의 UUID DB만 정리하며 운영 MONGODB_URI를 읽지 않습니다. 브라우저 새 제품 검증은 `npm run test:e2e --workspace=@to-high/web -- --config=playwright.callback.config.ts`(mock API + 실제 Chromium)입니다. 기존 저장 공책·스트리밍 E2E는 새 제품 출시 시나리오가 아니므로 전체 통과를 주장하지 않습니다.

출시 UI는 선택지와 직접 입력에 집중하며 새 상담은 기본 comfort/F로 시작합니다. 선택지 텍스트를 숨은 모드 변경으로 매핑하지 않습니다. 서버의 여섯 응답 모드 지원과 기존 개인 캐릭터의 저장 스타일은 보존합니다. 완료된 JSON 답변을 한 번 표시하며 스트리밍을 가장하지 않습니다.

기존 서비스 명칭 `위로 (To High)`를 유지하며 기본 대화 캐릭터 이름은 레비입니다. `to-high-ing`·`투하잉`은 아이데이션으로 제공된 표현이며 서비스 명칭으로 사용하지 않습니다. 기존 `displayName`을 재사용하며 `PATCH /characters/:id` 이름 변경은 승인 기억과 말투를 보존합니다. 로그인 상담은 소유권을 확인한 현재 이름을 헤더/답변 라벨과 비신뢰 프롬프트 참고 데이터에 반영합니다. 저장소/패키지/도메인/OAuth 환경 이름은 그대로 유지합니다.

기본 AI 캐릭터는 레비이며 선택한 원본 비주얼은 `apps/web/public/characters/levi.png`에 포함합니다. 기존 사용자 이름을 덮어쓰지 않습니다. 로그인은 직접 확인/승인한 기억을 다음 상담에 사용하기 위한 선택이고, 원문 저장은 하지 않습니다.

배포 준비에서 Next/eslint-config-next 16.3.8, proxy-addr 2.0.8 보안 패치를 적용했습니다. Next 개발 서버의 debug IndexedDB를 테스트에서 무시하지 않고 브라우저 검증을 build/start 프로덕션 서버로 수행합니다. Railway 설정의 start:prod 스크립트도 명시했습니다. 운영 인증·환경변수·플랫폼 로그·공유 비용 제한은 실제 배포 전 확인 대상입니다.
