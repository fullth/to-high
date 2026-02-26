---
name: feature-plan
description: 신규 기능 기획 및 구현 체크리스트 - 단계별 가이드
---

# 신규 기능 기획 스킬

## 📋 기획 단계 체크리스트

### 1단계: 요구사항 분석
- [ ] 기능 목적 명확화
- [ ] 사용자 시나리오 작성
- [ ] 기존 기능과의 충돌 확인
- [ ] 성능/비용 영향 검토

### 2단계: 기술 검토
- [ ] DB 스키마 변경 필요?
  - 새 컬렉션? → `database/*.schema.ts` 추가
  - 기존 스키마 확장? → 마이그레이션 필요

- [ ] API 엔드포인트 필요?
  - Controller: `controller/*.controller.ts`
  - Service: `app/*/` 모듈
  - DTO: 타입 정의

- [ ] 외부 서비스 연동?
  - API 키 필요? → `.env` 추가
  - 새 클라이언트? → `client/` 디렉토리

- [ ] UI 컴포넌트?
  - 재사용 가능? → `components/`
  - 페이지 전용? → `app/` 내부

### 3단계: 구현 체크리스트

#### Backend (API)
```
1. Schema 정의 (필요시)
   📁 apps/api/src/database/feature.schema.ts

2. Repository 생성 (필요시)
   📁 apps/api/src/persistence/feature/

3. Service 로직
   📁 apps/api/src/app/feature/feature.service.ts
   - 비즈니스 로직
   - 에러 처리
   - 트랜잭션 (필요시)

4. Controller
   📁 apps/api/src/controller/feature/feature.controller.ts
   - DTO 검증
   - 인증/인가 (Guard)
   - Rate Limiting

5. Module 등록
   📁 apps/api/src/app/feature/feature.module.ts
   📁 apps/api/src/controller/controller.module.ts

6. 테스트
   📁 apps/api/src/app/feature/feature.service.spec.ts
```

#### Frontend (Web)
```
1. API 클라이언트
   📁 apps/web/src/lib/api.ts
   - 타입 정의 (export interface)
   - API 함수 추가

2. UI 컴포넌트
   📁 apps/web/src/components/feature.tsx (재사용)
   또는
   📁 apps/web/src/app/feature/page.tsx (페이지)

3. 상태 관리
   - useState/useCallback 활용
   - Context (전역 상태시)

4. 스타일링
   - Tailwind CSS 클래스
   - shadcn/ui 컴포넌트 활용
```

### 4단계: 품질 체크

- [ ] TypeScript 에러 없음
  ```bash
  npm run build:api
  npm run build:web
  ```

- [ ] 테스트 작성
  - Unit: Service 로직
  - E2E: API 엔드포인트

- [ ] 에러 처리
  - try-catch 블록
  - 사용자 친화적 메시지
  - Sentry 로깅

- [ ] 성능 검토
  - DB 쿼리 최적화
  - N+1 문제 없음
  - 필요시 인덱스 추가

- [ ] 보안 검토
  - 인증/인가 확인
  - 입력 검증 (DTO)
  - Rate Limiting

## 🎯 참고: 기존 기능 구조

### 예시 1: 상담 세션
**요구사항**: 사용자가 AI와 대화하며 상담
**구현**:
- Schema: `session.schema.ts`
- Service: `chat.service.ts` (로직) + `session.service.ts` (DB)
- Controller: `chat.controller.ts`
- Frontend: `app/page.tsx` (메인 UI)

### 예시 2: 구독/결제
**요구사항**: Toss Payments 연동
- Schema: `payment.schema.ts`, `user.schema.ts` (구독 정보)
- Service: `payment.service.ts`
- Controller: `payment.controller.ts`
- Frontend: `app/subscribe/page.tsx`

### 예시 3: 어드민 대시보드
**요구사항**: 관리자 통계 조회
- Guard: `admin.guard.ts` (권한 검증)
- Controller: `admin.controller.ts`
- Frontend: `app/admin/page.tsx`

## 💡 빠른 템플릿

### 새 API 엔드포인트
```typescript
// Controller
@Post('endpoint')
async createFeature(@Body() dto: CreateDto) {
  return this.service.create(dto);
}

// Service
async create(dto: CreateDto) {
  // 입력 검증
  // 비즈니스 로직
  // DB 저장
  return result;
}
```

### 새 페이지
```typescript
// app/feature/page.tsx
'use client';
export default function FeaturePage() {
  const [data, setData] = useState(null);
  // API 호출
  // UI 렌더링
}
```

## 주의사항

1. **무제한 사용자 (isGrandfathered)**: 항상 체크
2. **토큰 소모**: OpenAI 호출 시 비용 고려
3. **세션 제한**: FREE_USER_SESSION_LIMIT = 3
4. **입력 제한**: MAX_INPUT_LENGTH = 500
5. **컨텍스트 제한**: MAX_CONTEXT_COUNT = 200
