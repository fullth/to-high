#!/bin/bash

echo "=== 스트리밍 API 테스트 ==="
echo ""

# 1. 세션 시작
echo "1. 세션 시작..."
START_RESPONSE=$(curl -s -X POST http://localhost:3000/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{"category": "직장", "counselorType": "F"}')

SESSION_ID=$(echo $START_RESPONSE | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
echo "   세션 ID: $SESSION_ID"
echo "   질문: $(echo $START_RESPONSE | grep -o '"question":"[^"]*"' | cut -d'"' -f4)"
echo ""

if [ -z "$SESSION_ID" ]; then
  echo "   ❌ 세션 시작 실패"
  exit 1
fi

# 2. 선택지 선택 (스트리밍)
echo "2. 선택지 선택 (스트리밍 테스트)..."
echo "   API 호출: /chat/select/stream"
echo ""

STREAM_OUTPUT=$(curl -s -X POST http://localhost:3000/api/chat/select/stream \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"selectedOption\": \"상사와 갈등이 있어요\"}")

# question_chunk 확인
QUESTION_CHUNKS=$(echo "$STREAM_OUTPUT" | grep -c '"type":"question_chunk"')
echo "   ✓ question_chunk 개수: $QUESTION_CHUNKS"

if [ "$QUESTION_CHUNKS" -gt 0 ]; then
  echo "   ✓ 스트리밍 청크 전송 확인"
else
  echo "   ❌ 스트리밍 청크 없음"
fi

# next 타입 확인
HAS_NEXT=$(echo "$STREAM_OUTPUT" | grep -c '"type":"next"')
if [ "$HAS_NEXT" -gt 0 ]; then
  echo "   ✓ next 타입 전송 확인"
else
  echo "   ❌ next 타입 없음"
fi

# done 확인
HAS_DONE=$(echo "$STREAM_OUTPUT" | grep -c '"done":true')
if [ "$HAS_DONE" -gt 0 ]; then
  echo "   ✓ done 신호 확인"
else
  echo "   ❌ done 신호 없음"
fi

echo ""
echo "=== 테스트 완료 ==="

if [ "$QUESTION_CHUNKS" -gt 0 ] && [ "$HAS_NEXT" -gt 0 ] && [ "$HAS_DONE" -gt 0 ]; then
  echo "✅ 모든 테스트 통과"
  exit 0
else
  echo "❌ 일부 테스트 실패"
  echo ""
  echo "=== 전체 응답 ==="
  echo "$STREAM_OUTPUT"
  exit 1
fi
