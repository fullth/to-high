# to-high

AI 기반 감정 상담 서비스

> **새 세션 시작 시 이 파일을 멘션하면 프로젝트 컨텍스트와 진행 상황을 파악할 수 있습니다.**

---

## 프로젝트 진행 상황

### 완료된 작업

#### Backend (API) - `apps/api`
- [x] NestJS v11 프로젝트 세팅
- [x] MongoDB + Mongoose 연동
- [x] Google OAuth 2.0 + JWT 인증
- [x] 채팅 API 구현 (start, select, mode, message, end)
- [x] OpenAI 연동 (gpt-4o-mini)
- [x] E2E 테스트 8개 작성

#### Frontend (Web) - `apps/web`
- [x] Next.js 16 앱 생성
- [x] Tailwind CSS + shadcn/ui 설정
- [x] 홈 페이지 (카테고리 선택 UI)
- [x] API 클라이언트 (`src/lib/api.ts`)

### 다음 작업 (우선순위 순)

#### Frontend 상담 플로우
- [ ] 채팅 페이지 (`/chat/[sessionId]`) - 선택지 UI
- [ ] 모드 선택 화면 - 4가지 응답 모드 카드
- [ ] AI 응답 표시 화면
- [ ] 세션 종료 및 요약 화면

#### 인증 연동
- [ ] Google 로그인 버튼 활성화
- [ ] OAuth 콜백 페이지 (`/auth/callback`)
- [ ] JWT 저장 및 관리
- [ ] 인증 상태 Context

#### Backend 개선
- [ ] OAuth 콜백에서 프론트엔드로 JWT 전달 방식 구현
- [ ] `GET /sessions` - 세션 목록 조회 API
- [ ] `GET /sessions/:id` - 세션 상세 조회 API

---

## 핵심 컨셉

**"처음부터 힘든 점을 다 말하기 어렵다"**

점진적 상호작용으로 해결:
- 선택지 기반 질문으로 부담 없이 시작
- 대화를 주고받으며 자연스럽게 컨텍스트 축적
- 충분한 정보가 쌓이면 사용자가 원하는 방식의 상담 제공

## 상담 플로우

```
1. 카테고리 선택 (직장, 인간관계, 나 자신, 미래)
2. 선택지 응답 반복 (3~4개 선택지 중 클릭)
3. 충분한 정보 수집 시 → 응답 모드 선택
4. AI 상담사 응답
5. 세션 종료 및 요약
```

## 응답 모드

| 모드 | 설명 |
|------|------|
| comfort | 그냥 위로부터 (공감과 위로만) |
| organize | 상황 정리해줘 (감정과 사실 분리) |
| validate | 내가 이상한 건지 말해줘 (중립적 판단) |
| direction | 앞으로 어떻게 해야 할지 (작은 행동 1개 제안) |

---

## 기술 스택

| 구분 | 스택 |
|------|------|
| **Backend** | NestJS v11, MongoDB, Mongoose, JWT, OpenAI, Zod |
| **Frontend** | Next.js 16, Tailwind CSS, shadcn/ui |
| **Monorepo** | npm workspaces |

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /auth/google | Google 로그인 |
| GET | /auth/me | 현재 사용자 정보 |
| POST | /chat/start | 세션 시작 |
| POST | /chat/select | 선택지 선택 |
| POST | /chat/mode | 응답 모드 설정 |
| POST | /chat/message | 메시지 전송 |
| POST | /chat/end | 세션 종료 |

## 실행

```bash
# 프론트엔드 (포트 3001)
npm run dev:web

# 백엔드 (포트 3000)
npm run dev:api

# 테스트
npm run test:api
```

## 환경 변수

### Backend (`apps/api/.env`)
```
MONGODB_URI
JWT_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL
OPENAI_API_KEY
PORT=3000
```

### Frontend (`apps/web/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 프로젝트 구조

```
to-high/
├── apps/
│   ├── api/                 # NestJS 백엔드
│   │   ├── src/
│   │   │   ├── app/         # 비즈니스 로직 (auth, chat, session)
│   │   │   ├── controller/  # HTTP 컨트롤러
│   │   │   ├── database/    # MongoDB 스키마
│   │   │   ├── persistence/ # Repository 계층
│   │   │   ├── client/      # 외부 API (OpenAI)
│   │   │   └── types/       # TypeScript 타입
│   │   └── test/            # E2E 테스트
│   │
│   └── web/                 # Next.js 프론트엔드
│       └── src/
│           ├── app/         # App Router 페이지
│           ├── components/  # UI 컴포넌트
│           └── lib/         # API 클라이언트, 유틸리티
│
├── packages/                # 공유 패키지 (예정)
└── package.json             # Monorepo 루트
```

---

## 전체 TODO 리스트

### Backend

#### Phase 1: 인증 개선
- [ ] OAuth 콜백에서 프론트엔드로 JWT 전달 방식 구현
- [ ] Refresh Token 구현
- [ ] 로그아웃 엔드포인트 추가

#### Phase 2: 세션 API 확장
- [ ] `GET /sessions` - 사용자 세션 목록 조회
- [ ] `GET /sessions/:id` - 세션 상세 조회
- [ ] 세션 삭제 기능

#### Phase 3: 실시간 기능
- [ ] AI 응답 스트리밍 (SSE)
- [ ] 타이핑 인디케이터

#### Phase 4: 고급 기능
- [ ] 카테고리 목록 API
- [ ] 사용자 설정 API
- [ ] 상담 통계 API

### Frontend

#### Phase 1: 기반 구축 ✅
- [x] Next.js 앱 생성
- [x] Tailwind CSS + shadcn/ui 설정
- [x] API 클라이언트 설정
- [ ] 공통 타입 패키지 (`packages/types`)

#### Phase 2: 인증
- [ ] Google 로그인 버튼 활성화
- [ ] OAuth 콜백 페이지
- [ ] JWT 저장 및 관리
- [ ] 인증 상태 Context
- [ ] 보호된 라우트

#### Phase 3: 상담 플로우 UI
- [x] 홈 화면 - 카테고리 선택
- [ ] 채팅 페이지 - 선택지 UI
- [ ] 모드 선택 화면
- [ ] 상담 응답 화면
- [ ] 세션 종료 화면

#### Phase 4: UX 개선
- [ ] 로딩 상태 (스켈레톤, 스피너)
- [ ] 페이지 전환 애니메이션
- [ ] 반응형 디자인 (모바일 우선)
- [ ] 에러 처리 UI
- [ ] 다크 모드

#### Phase 5: 히스토리
- [ ] 마이페이지
- [ ] 과거 상담 목록
- [ ] 상담 상세 보기
