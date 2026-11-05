# 개발 가이드

[서비스 소개로 돌아가기](../README.md)

## 준비

- Node.js 24 LTS와 npm 권장. Next.js의 최소 Node.js 버전은 20.9.0입니다.
- 모의 실행에는 Python 3이 필요합니다.
- 실제 NestJS 애플리케이션에는 MongoDB가 필요합니다. 공개 채팅을 저장하지 않아도 애플리케이션 시작 시 DB 연결을 초기화합니다.
- 실제 모델 답변에는 OpenAI API 키와 제공자 사용 권한이 필요합니다.

저장소 루트에서 실행합니다.

```bash
npm ci
```

## 외부 연결 없는 모의 실행

```bash
python3 scripts/local-test/run.py restart --build
python3 scripts/local-test/run.py status
python3 scripts/local-test/run.py stop
```

웹은 `127.0.0.1:3102`, API는 `127.0.0.1:3999`에서 실행합니다. API 상태는 `/health`에서 확인합니다. 모델 제공자만 모의 구현으로 교체하며 실제 사용자 DB·OAuth·모델에 연결하지 않습니다. `실패 테스트`를 보내면 의도적으로 오류를 반환해 입력 복구를 확인할 수 있습니다.

런처는 환경변수를 제한해 전달하므로 일반 셸의 프록시·인증 설정을 그대로 상속하지 않습니다. Google Fonts를 받지 못하면 웹 빌드 로그와 네트워크 허용 설정을 확인하세요. 모의 실행은 OAuth·캐릭터·저장 기억이나 실제 모델 품질을 검증하지 않습니다.

로그와 소유 프로세스 정보는 Git에서 제외된 `scripts/local-test/.runtime/`에 있습니다. 점유 중인 다른 프로세스를 자동 종료하지 않습니다. 상세 내용은 [격리 로컬 테스트](../scripts/local-test/README.md)를 참고하세요.

## 실제 API를 연결하는 개발 실행

API 환경변수 예시를 복사하고, 필요한 값만 로컬에서 설정합니다.

```bash
cp apps/api/.env.example apps/api/.env
```

`apps/api/.env`의 주요 설정:

```dotenv
MONGODB_URI=mongodb://localhost:27017/to-high
JWT_SECRET=<로컬 개발용 비밀값>
OPENAI_API_KEY=<로컬에서 설정>
PORT=3000
FRONTEND_URL=http://localhost:3001
TO_HIGH_LLM_DAILY_REQUEST_LIMIT=100
```

`TO_HIGH_LLM_DAILY_REQUEST_LIMIT=100`은 개발용 예시입니다. 운영 예산은 실제 사용 계획에 맞춰 별도로 정하세요. API 키와 인증 값은 커밋하거나 로그에 출력하지 않습니다.

`apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000
```

별도 터미널에서 각각 실행합니다.

```bash
npm run dev:api
```

```bash
npm run dev:web
```

웹은 `http://localhost:3001`, API는 `http://localhost:3000`입니다. API는 `apps/api` 작업 디렉터리의 `.env`를 읽습니다. Google·카카오 로그인까지 확인할 때만 `.env.example`의 OAuth 설정과 콜백 URL을 추가합니다. `NEXT_PUBLIC_*` 값은 웹 빌드에 포함되므로 변경 후에는 다시 빌드해야 합니다.

결제 서비스는 기본적으로 비활성화합니다. 공개 채팅 실행을 위해 결제 키를 설정할 필요는 없습니다.

## 빌드와 검증

```bash
npm run build:api
npm run build:web
npm exec --workspace=@to-high/web -- tsc --noEmit
```

외부 DB·모델 없이 API 단위·HTTP 회귀 검사를 실행할 수 있습니다. HTTP 테스트는 로컬 임시 포트를 사용합니다.

```bash
npm test --workspace=@to-high/api -- --runInBand
```

기존 저장형 API의 보안 테스트까지 포함하려면 테스트 환경에서만 이전 경로를 활성화합니다. 이 플래그는 운영에서 경로를 복구하지 않습니다.

```bash
TO_HIGH_ENABLE_LEGACY_TEST_ROUTES=1 npm test --workspace=@to-high/api -- --runInBand
```

브라우저 서버 없이 실행하는 클라이언트 테스트:

```bash
npx playwright test --config apps/web/playwright.offline.config.ts
```

실제 Chromium을 사용하는 화면 테스트 파일은 `apps/web/e2e/`에 있습니다. 공개 채팅의 스트리밍·오류 검사는 `chat-stream.browser.spec.ts`, 홈 위젯과 채팅의 격리 검사는 `home-support.browser.spec.ts`를 참고하세요. `product-mvp.browser.spec.ts`에는 비공개 캐릭터·기억 기능을 전제로 한 과거 시나리오도 남아 있어, 현재 공개 기능의 결과와 구분해야 합니다. 기존 전체 테스트 설정이 곧 공개 서비스의 전체 통과를 뜻하지 않습니다.

상담 품질 평가 안내:

```bash
npm run quality:eval
```

이 명령은 평가 사례와 방법만 출력하고 실제 모델을 호출하지 않습니다. 실제 대화 평가는 [평가 가이드](./counseling-quality.md)에 따라 수행합니다.

## 운영 설정

- 웹은 Vercel, API는 Railway 구성을 사용합니다. 프로젝트 루트와 빌드 환경변수는 각 서비스에서 설정합니다.
- 운영에서는 유효한 `TO_HIGH_LLM_DAILY_REQUEST_LIMIT`가 없으면 생성 요청을 거절합니다. 이 값은 프로세스별 요청 수 제한이며 금액 상한이나 여러 서버의 통합 한도가 아닙니다.
- 대화 한도는 공유 MongoDB에서 비로그인 IP는 하루 5턴, 브라우저는 총 5턴, 로그인 계정은 하루 20턴으로 적용합니다. 일별 한도는 한국 시간 자정에 초기화합니다. 브라우저는 무작위 저장 식별자를 쓰고 서버에는 IP와 식별자 대신 HMAC과 횟수를 보관합니다. 일별 기록은 약 3일 후 삭제하며 비로그인 브라우저 체험 기록은 유지합니다. 저장소를 지우거나 IP를 바꾸는 우회를 완전히 막지는 못하며, 같은 IP의 사용자는 한도를 공유합니다.
- 별도의 공유 예산은 MongoDB에서 모델 호출 전 보수적으로 추정한 비용을 차감합니다. 실패하거나 취소된 호출도 차감되므로 실제 청구액보다 클 수 있습니다. 최초 1만 원을 설정하고 잔액을 이월하며, 한국 시간 월요일 이후 잔액과 기존 미정산 예약이 모두 0원이면 1만 원을 충전합니다. 확인은 서버 시작 시, 이후 약 1분 간격 및 예산 접근 시 수행합니다.
- `/admin/budget` 접근은 `TO_HIGH_BUDGET_ADMIN_USER_IDS`의 내부 사용자 ID로 제한합니다. 경고 메일에는 `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `BUDGET_ALERT_RECIPIENT`가 필요합니다. 메일 설정 여부가 실제 발송 성공을 보장하지는 않습니다.
- 로그인 오류 등 문제 화면은 대화나 계정 정보 없이 고정된 알림을 접수합니다. 알림은 한 시간 단위로 묶어 위 메일 설정으로 보내며, 접수 실패 시 사용자에게 실패를 표시합니다.
- 비용은 `AI_BUDGET_KRW_PER_USD`와 모델 단가를 이용한 보수적 추정치입니다. 제공자 청구액과 차이가 날 수 있으므로 OpenAI 프로젝트의 별도 월간 사용 제한도 확인합니다.
- 서버 지표가 필요하면 `SENTRY_DSN`과 `SENTRY_METRICS_ENABLED=true`를 설정합니다. 실제 수신 여부는 Sentry에서 별도로 확인합니다.
- 코드 푸시와 운영 배포 완료는 다릅니다. 배포 로그와 운영 화면에서 해당 버전의 반영을 확인하세요.

현재 제한과 데이터 처리 범위는 [구조 문서](./architecture.md), Sentry 설정은 [지표 문서](./chat-streaming-and-metrics.md)를 확인하세요.
