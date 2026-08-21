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
- **세션 보호**: 로그인 세션은 JWT 사용자 소유권을 검증하고 익명 요청은 게스트 세션에만 접근 허용
- **위기 표현 우선**: 한국어 완곡 표현과 영어, 일본어, 중국어 위기 표현을 상담 외 요청보다 먼저 감지
- **미출시 서비스 차단**: 감정 일기와 구독 화면은 출시 플래그가 꺼진 동안 404를 반환하고 결제 API를 등록하지 않음

## 라이선스

[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)

이 프로젝트는 **CC BY-NC-ND 4.0** 라이선스를 따릅니다.

- 저작자표시 필수
- 비영리 목적만 허용
- 변경 금지

---

## Claude Code를 활용할 때

새 세션에서 이 프로젝트를 이어서 작업할 때:

1. 이 README를 먼저 읽어 전체 구조 파악
2. [`apps/api/README.md`](./apps/api/README.md) - **백엔드 진행 상황, TODO, API 명세**
3. [`apps/web/README.md`](./apps/web/README.md) - 프론트엔드 기본 정보

> `apps/api/README.md`에 프로젝트 전체 진행 상황과 다음 작업 목록이 정리되어 있습니다.
