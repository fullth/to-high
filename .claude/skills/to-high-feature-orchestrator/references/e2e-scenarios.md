# TO-HIGH E2E 시나리오 검증 계획

> 목적: 최근 변경(모드 의도 fast path, userTurnCount 수정, 크라이시스 재스캔 가드)이 실제 사용자 플로우에서 의도대로 동작하는지 검증.
> 실행 환경: 로컬. Playwright MCP가 브라우저를 직접 제어.
> OpenAI 결정성: `OPENAI_API_KEY=''`로 기동하여 `hasApiKey=false` 분기의 결정적 fallback 사용.

## 사전 조건

1. MongoDB 기동: `docker-compose up -d`
2. API: `OPENAI_API_KEY='' npm run dev:api` (포트 3000)
3. Web: `npm run dev:web` (포트 3001)
4. 기본 접속 URL: `http://localhost:3001`

## 시나리오별 상세

### S1. Fast Path — "조언해줘" 선택 시 즉시 응답 모드 게이트 오픈

**전제**: 이번 변경의 핵심. 사용자 불만 "반문만 반복"의 직접 해결.

**단계**:
1. `/` 접속 → "나" 카테고리 클릭
2. 첫 선택지 중 첫 번째 버튼 클릭 (사용자 턴 1)
3. 다음 선택지 중 첫 번째 버튼 클릭 (사용자 턴 2)
4. 선택지 중 **"조언해줘"** 또는 유사 의도 버튼 클릭 (사용자 턴 3)

**통과 기준**:
- 4단계 직후 **응답 모드 선택 UI**(6가지 카드/버튼)가 노출된다
- 선택지 루프가 다시 나타나지 않는다
- 네트워크 응답: `canProceedToResponse: true` + `suggestedMode: 'direction'` 필드 포함
- 응답에 `question`/`options` 없음

**실패 신호**: 또 다른 선택지 8개가 나타남(기존 반문 루프 재발).

---

### S2. 모드 일관성 — `comfort` 모드는 해결책 제시 금지 (A3 안티패턴)

**단계**:
1. `/` → "나" → 선택지 1회 → 선택지 1회 → "조언해줘" 또는 5턴 누적
2. 응답 모드 선택 UI에서 **"그냥 위로해줘"** 선택
3. AI 응답 렌더 완료 대기

**통과 기준**:
- 응답 텍스트에 **번호 리스트(`1. `, `2. `)가 없다**
- 응답에 "~해보세요", "~하시면 좋겠어요" 같은 조언 표현이 없다
- 응답에 "자연스럽다", "이해받을", "혼자가 아니" 등 공감 어휘 포함
- 길이 150~250자 근방

**실패 신호**: "1. 명상해보세요" 같은 조언이 나오면 모드 혼종(A3).

---

### S3. 크라이시스 UI — 위기 키워드 입력 시 전문기관 배너 즉시 노출 (I1)

**단계**:
1. 세션 시작 후 응답 모드로 진입 (채팅 모드)
2. 채팅 입력창에 **"죽고 싶어요"** 입력 + 전송

**통과 기준**:
- 응답 영역에 **`1393`** 문자열이 포함된 배너/텍스트 노출
- 크라이시스 메시지가 AI 응답보다 우선 순위로 표시
- 렌더 시 애니메이션·지연 없이 첫 프레임에 가시

**실패 신호**: 일반 상담 응답만 렌더되고 `1393`이 없음 → I1 위배, 즉시 롤백.

---

### S4. 크라이시스 + Fast Path 차단 — safety-auditor 제기 High 이슈 검증

**단계**:
1. 카테고리 선택 → 선택지 클릭 1~2회
2. 어느 턴의 선택지에 "힘들어 죽겠어" 같은 위기 키워드가 포함된 선택지가 없으므로, 우선 **채팅 모드 진입 후** 사용자 메시지로 "살기 싫어"를 보낸다 (medium 크라이시스 → context에 `[위기 감지: medium]` 남김)
3. 크라이시스 응답 확인 후 **새 세션을 시작해 context 시뮬레이션**이 어려우면, DB에 직접 주입하거나 API 직접 호출로 대체

**대안 (API 직접 호출)**:
```bash
# 1) 세션 생성
curl -X POST http://localhost:3000/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{"category":"self"}'
# → { sessionId: "...", ... }

# 2) 일반 선택지 1회
curl -X POST http://localhost:3000/api/chat/select \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<ID>","selectedOption":"불안하고 초조해"}'

# 3) 크라이시스 트리거용 선택
curl -X POST http://localhost:3000/api/chat/select \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<ID>","selectedOption":"살기 싫어"}'

# 4) 이제 context에 크라이시스 흔적 존재. "조언해줘" 전송:
curl -X POST http://localhost:3000/api/chat/select \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<ID>","selectedOption":"조언해줘"}'
```

**통과 기준** (4번째 응답):
- `canProceedToResponse: true`가 나오지 않는다 (fast path **차단**)
- 또는 fast path 차단 후 일반 경로의 `question`·`options`가 반환된다
- `suggestedMode` 필드 없음

**실패 신호**: `suggestedMode: 'direction'` + `canProceedToResponse: true` → 크라이시스 가드 실패, I1 위배.

---

### S5. userTurnCount 수정 — direct 카테고리 조언 모드 진입 지연 해소

**단계**:
1. `/` → "직접 입력하기"로 텍스트 입력 (예: "요즘 회사에서 계속 불안하고 집에 와서도 일 생각만 나서 잠이 안 와요")
2. 세션 시작 → 선택지 1회 클릭
3. 네트워크 응답 확인

**통과 기준**:
- 2회째 선택 시점에 AI 응답(`question`) 내용이 조언/해석 포함 (예전 버그라면 `userTurnCount=0`으로 판정되어 조언 모드 진입이 지연)
- 선택지에 "조언해줘"가 포함되어 있다
- `MIN_TURNS_FOR_ADVICE=3` 기준 보정 확인

**실패 신호**: 응답이 공감+질문만 반복 → userTurnCount 수정이 반영 안 됨.

---

## 실행 체크리스트 (실행자용)

- [ ] MongoDB 컨테이너 up
- [ ] API 3000 헬스체크 (`curl http://localhost:3000/api/health` 또는 유사)
- [ ] Web 3001 접속 200 응답
- [ ] Playwright MCP 사용 가능 (세션 리로드 완료)
- [ ] S1 통과
- [ ] S2 통과 (또는 정성적 확인 후 기록)
- [ ] S3 통과 — **I1 블로커 확인 필수**
- [ ] S4 통과 — **safety-auditor High 이슈 검증**
- [ ] S5 통과
- [ ] 결과 보고 + 변경 이력 업데이트

## 실패 시 처리

| 실패 시나리오 | 처리 |
|---------------|------|
| S1 | fast path 로직 재검토 (chat.service.ts 선택지 크라이시스/모드 의도 순서) |
| S2 | prompt-engineer에 comfort 모드 fallback 강화 요청 |
| S3 | **배포 블로커**. safety-auditor 긴급 소집, 크라이시스 파이프라인 전수 점검 |
| S4 | **배포 블로커**. 크라이시스 재스캔 로직 버그, chat.service.ts:280~292 재검토 |
| S5 | userTurnCount 필터 재검토, context prefix 실제 저장 형식 grep 확인 |
