---
name: api-debug
description: API 디버깅을 위한 빠른 참조 - 엔드포인트, 서비스 로직, OpenAI 설정 위치
---

# API 디버깅 스킬

## 주요 파일 위치

### API 서비스
- **ChatService**: `/Users/levi/WebstormProjects/to-high/apps/api/src/app/chat/chat.service.ts`
  - `selectOption` (line ~210): 옵션 선택 처리
  - `setMode` (line ~334): 응답 모드 설정
  - `generateResponse` (line ~343): 응답 생성

### OpenAI Agent
- **OpenAIAgent**: `/Users/levi/WebstormProjects/to-high/apps/api/src/client/openai/openai.agent.ts`
  - `generateOptions` (line ~120-260): 선택지 생성 로직
  - 조언 요청 감지 (line ~128): `adviceRequestKeywords`
  - API 호출 (line ~184-193): timeout 설정 포함

### 프론트엔드 API 호출
- **API 클라이언트**: `/Users/levi/WebstormProjects/to-high/apps/web/src/lib/api.ts`
  - `selectOption` (line ~125): `/chat/select` 호출
  - `setResponseModeStream` (line ~140+): 스트리밍 응답

## 환경 변수
- API: `/Users/levi/WebstormProjects/to-high/apps/api/.env`
- Web: `/Users/levi/WebstormProjects/to-high/apps/web/.env.local`
  - `NEXT_PUBLIC_API_URL=http://localhost:3000`

## 빠른 디버깅

무한 로딩 이슈:
1. OpenAI timeout 확인 (line 192)
2. API 서버 로그 확인
3. 브라우저 Network 탭에서 `/chat/select` 요청 확인

서버 상태 확인:
```bash
curl http://localhost:3000/health
ps aux | grep "nest start"
lsof -i:3000
```
