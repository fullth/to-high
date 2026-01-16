# 전체 CI 파이프라인

모든 검증을 순차적으로 실행하고 결과를 종합해주세요.

## 파이프라인 단계

### Step 1: Lint (ESLint)
```bash
cd apps/api && npm run lint 2>&1 || true
```

### Step 2: Type Check (Build)
```bash
npm run build:api
```

### Step 3: Unit Test
```bash
npm run test:api
```

### Step 4: E2E Test (선택)
```bash
npm run test:e2e:api 2>&1 || echo "E2E 테스트 스킵"
```

## 결과 리포트

각 단계별 결과를 다음 형식으로 출력:

```
📋 파이프라인 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Lint: 통과
✅ Type Check: 통과
✅ Unit Test: 통과 (10/10)
⏭️ E2E Test: 스킵
━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 모든 검증 통과!
```

오류 발생 시:
```
📋 파이프라인 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Lint: 통과
❌ Type Check: 실패
   └─ src/app/chat/chat.service.ts:42
      'Category' is not defined
━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 수정하려면: /fix Category 타입 import 누락
```
