# 위로 웹

위로의 Next.js 16 / React 19 프런트엔드입니다. npm workspace 이름은 `@to-high/web`입니다.

## 개발 실행

저장소 루트에서 실행합니다. Node.js 22 이상을 사용하고, 클라우드 프록시 환경에서는 Node.js 24를 권장합니다.

```bash
npm ci
npm run dev:web
```

개발 서버는 3001번 포트를 사용합니다. API 서버는 별도 터미널에서 `npm run dev:api`로 실행합니다. 루트 `npm run dev`는 3000·3001 포트의 기존 프로세스를 종료하므로 다른 작업이 실행 중인지 확인해야 합니다.

`apps/web/.env.local`에 필요한 공개 설정을 넣습니다.

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=https://www.wirocare.com
```

`NEXT_PUBLIC_` 값은 브라우저에 공개됩니다. API 키와 서버 인증 정보는 이 파일에 넣지 않습니다. API 설정과 MongoDB 실행은 저장소 루트 README를 참고합니다.

## 빌드 및 테스트

저장소 루트에서 실행합니다.

```bash
npm run build:web
npm run start --workspace=@to-high/web -- -p 3001
npm run lint --workspace=@to-high/web
npm exec --workspace=@to-high/web -- playwright install chromium
npm run test:e2e --workspace=@to-high/web
```

Playwright는 홈, 공개 서비스 노출, 개인정보처리방침, 상담 기록 재개, 스트리밍 오류 처리를 검증합니다. API 응답을 대체하는 테스트는 실제 OpenAI 또는 OAuth 연결 검증을 대신하지 않습니다. Chromium 설치에 필요한 OS 라이브러리가 없으면 Playwright의 해당 플랫폼 설치 안내를 따릅니다.

HTTPS 프록시를 사용하는 클라우드 환경에서는 Google Fonts 접근을 허용하고 아래 설정을 사용합니다. Node.js 24 기준이며 TLS 검증을 유지합니다.

```bash
NODE_USE_ENV_PROXY=1 NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npm run build:web
```

## 주요 파일

- `src/components/landing/`: 홈페이지와 스타일
- `src/lib/site-content.ts`: 홈·검색·공유 이미지에 공통으로 쓰는 서비스 소개
- `src/app/chat/[sessionId]/page.tsx`: 상담 시작·재개·스트리밍 화면
- `src/components/chat/chat-bubble.tsx`: 사용자 평문과 상담사 마크다운 표시
- `src/lib/api.ts`: API 클라이언트
- `src/lib/service-visibility.ts`: 감정 일기·구독 공개 여부. 현재 두 화면은 404로 비공개 처리
- `src/app/privacy/page.tsx`: 개인정보처리방침
- `e2e/`: Playwright 테스트

사용하지 않는 기본 Next.js 로고·예제 에셋은 포함하지 않습니다. 디자인 변경은 루트 `DESIGN.md`를 따릅니다.
