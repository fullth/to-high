---
name: tech-review
description: 기술 스택 검토 및 아키텍처 참조 - 의존성, DB 스키마, API 구조
---

# 기술 검토 스킬

## 📚 기술 스택

### Backend (NestJS)
- **Framework**: NestJS 11.x
- **Database**: MongoDB (Mongoose 8.x)
- **AI**: OpenAI GPT-4o
- **Auth**: Passport (Google OAuth, Kakao)
- **Payment**: Toss Payments
- **Monitoring**: Sentry

### Frontend (Next.js)
- **Framework**: Next.js 16.1 (App Router)
- **React**: 19.2
- **UI**: Radix UI + Tailwind CSS
- **Markdown**: react-markdown

## 🗄️ 데이터베이스 스키마

위치: `/Users/levi/WebstormProjects/to-high/apps/api/src/database/`

1. **user.schema.ts** - 사용자 기본 정보
   - email, name, provider (google/kakao)
   - isSubscribed, subscriptionTier
   - isGrandfathered (레거시 무제한)

2. **session.schema.ts** - 상담 세션
   - userId, category, context[]
   - responseMode, alias
   - rollingSummary (토큰 절약)

3. **payment.schema.ts** - 결제/구독
   - SUBSCRIPTION_PLANS (FREE, BASIC, PREMIUM)
   - orderId, amount, status

4. **user-profile.schema.ts** - 사용자 프로필
   - 학습된 사용자 특성

5. **visitor.schema.ts** - 방문자 추적

6. **inquiry.schema.ts** - 문의사항

## 🏗️ 아키텍처 패턴

### API 레이어 구조
```
Controller (DTO 검증)
  ↓
Service (비즈니스 로직)
  ↓
Repository (DB 접근)
  ↓
Schema (Mongoose)
```

### 주요 서비스
- **ChatService**: 상담 로직
  - 파일: `/apps/api/src/app/chat/chat.service.ts`
  - 제한: MAX_CONTEXT_COUNT=200, MAX_INPUT_LENGTH=500

- **SessionService**: 세션 관리
  - 파일: `/apps/api/src/app/session/session.service.ts`

- **OpenAIAgent**: AI 통신
  - 파일: `/apps/api/src/client/openai/openai.agent.ts`
  - Timeout: 60초

### 프론트엔드 구조
```
app/
├── page.tsx         # 메인 페이지 (상담 UI)
├── admin/           # 어드민 대시보드
├── subscribe/       # 구독 페이지
└── layout.tsx       # 글로벌 레이아웃

components/
├── ui/              # shadcn/ui 컴포넌트
├── contact-sidebar.tsx
└── logo.tsx

lib/
├── api.ts           # API 클라이언트
└── ui-data.tsx      # UI 상수 (카테고리 등)
```

## 🔐 환경 변수

### API (.env)
- OPENAI_API_KEY
- MONGODB_URI
- JWT_SECRET
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- KAKAO_CLIENT_ID, KAKAO_CLIENT_SECRET
- TOSS_SECRET_KEY
- FRONTEND_URL

### Web (.env.local)
- NEXT_PUBLIC_API_URL (http://localhost:3000)
- NEXT_PUBLIC_SENTRY_DSN

## 🚀 성능 최적화

1. **토큰 절약**: Rolling Summary (20턴마다)
2. **캐싱**: MongoDB 쿼리 최소화
3. **스트리밍**: OpenAI 응답 스트리밍
4. **Rate Limiting**: Throttler 적용

## 🎯 사용 예시

새 기능 추가 시:
1. DB 스키마 필요? → `database/*.schema.ts` 확인
2. API 엔드포인트? → Controller → Service 순서로 추가
3. 프론트? → `app/` 또는 `components/` 위치 결정
4. 환경 변수? → 위 목록 참고
