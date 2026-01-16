# To high; 위로

AI 기반 심리 상담 서비스

점진적 상호작용으로 마음의 문을 여는 AI 상담 서비스입니다.

## 핵심 컨셉

- **선택지 기반 시작**: 복잡한 감정을 처음부터 말로 표현하기 어려울 때, 간단한 선택지로 시작
- **점진적 컨텍스트 축적**: 대화를 주고받으며 자연스럽게 상황 파악
- **맞춤형 응답 모드**: 충분한 정보가 쌓이면 원하는 방식의 상담 제공

## 상담 플로우

```
1. 카테고리 선택 (나 자신, 미래, 직장, 인간관계)
2. 선택지 응답 반복 (3~4개 선택지 중 클릭)
3. 충분한 정보 수집 시 → 응답 모드 선택
4. AI 상담사 응답
5. 세션 종료 및 요약
```

## 응답 모드

| 모드 | 설명 |
|------|------|
| 🤗 그냥 위로해줘 | 공감과 위로만 |
| 👂 그냥 들어줘 | 최소 개입, 경청 |
| 📝 상황 정리해줘 | 감정과 사실 분리 |
| 🤔 내가 이상한 건가? | 감정 타당성 확인 |
| 🧭 뭘 해야 할지 모르겠어 | 작은 행동 1개 제안 |
| 👥 나만 이런 건가? | 유사 경험 공유 |

## 기술 스택

| 구분 | 스택 |
|------|------|
| **Backend** | NestJS v11, MongoDB, Mongoose, JWT, OpenAI |
| **Frontend** | Next.js 16, Tailwind CSS, shadcn/ui |
| **Monorepo** | npm workspaces |

## 프로젝트 구조

```
to-high/
├── apps/
│   ├── api/          # NestJS 백엔드 (포트 3000)
│   └── web/          # Next.js 프론트엔드 (포트 3001)
└── packages/         # 공유 패키지 (예정)
```

## 시작하기

### 사전 요구사항

- Node.js 18+
- MongoDB (로컬 또는 Atlas)
- OpenAI API Key

### 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp apps/api/.env.example apps/api/.env
# .env 파일에 필요한 값 입력
```

### 실행

```bash
# 프론트엔드 (포트 3001)
npm run dev:web

# 백엔드 (포트 3000)
npm run dev:api

# 테스트
npm run test:api
```

### 환경 변수

`apps/api/.env`:
```
MONGODB_URI=mongodb://localhost:27017/to-high
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
OPENAI_API_KEY=your-openai-api-key
PORT=3000
FRONTEND_URL=http://localhost:3001
```

`apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

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

## TODO

### Backend
- [ ] Google OAuth 설정 (Google Cloud Console에서 OAuth 클라이언트 생성 필요)
- [ ] Refresh Token 구현
- [ ] 세션 목록/상세 조회 API
- [ ] AI 응답 스트리밍 (SSE)

### Frontend
- [ ] 로딩 UI 개선 (스켈레톤, 스피너)
- [ ] 에러 처리 UI
- [ ] 반응형 디자인 (모바일 최적화)
- [ ] 다크 모드
- [ ] 상담 히스토리 페이지

## 라이선스

[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)

이 프로젝트는 **CC BY-NC-ND 4.0** 라이선스를 따릅니다.

- **저작자표시**: 출처를 명시해야 합니다
- **비영리**: 상업적 이용 불가 (별도 계약 필요)
- **변경금지**: 수정, 2차 저작물 작성 불가

자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.
