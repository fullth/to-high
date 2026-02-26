import { test, expect } from "@playwright/test";

test.describe("세션 재개", () => {
  test("세션 재개 시 답변 선택지가 표시된다", async ({ page }) => {
    // 1. API 모킹 설정
    await page.route("**/api/chat/start", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          sessionId: "test-session-123",
          question: "직장에서 어떤 고민이 가장 크게 느껴지시나요?",
          options: [
            "업무가 너무 많아요",
            "상사와 갈등 있어요",
            "동료와 어려워요",
            "번아웃 느낌이에요",
            "일이 재미없어요",
            "퇴사 고민 중이에요",
            "일과 삶 균형 문제예요",
            "조언해줘",
          ],
          canProceedToResponse: false,
          counselorType: "F",
        }),
      });
    });

    await page.route("**/api/chat/select/stream", async (route) => {
      const streamData = [
        'data: {"type":"question_chunk","content":"상"}\n\n',
        'data: {"type":"question_chunk","content":"사"}\n\n',
        'data: {"type":"question_chunk","content":"와"}\n\n',
        'data: {"type":"question_chunk","content":"의"}\n\n',
        'data: {"type":"question_chunk","content":" 갈"}\n\n',
        'data: {"type":"question_chunk","content":"등"}\n\n',
        'data: {"type":"question_chunk","content":" 때문에"}\n\n',
        'data: {"type":"question_chunk","content":" 많이"}\n\n',
        'data: {"type":"question_chunk","content":" 힘"}\n\n',
        'data: {"type":"question_chunk","content":"드"}\n\n',
        'data: {"type":"question_chunk","content":"셨"}\n\n',
        'data: {"type":"question_chunk","content":"겠"}\n\n',
        'data: {"type":"question_chunk","content":"어요"}\n\n',
        'data: {"type":"question_chunk","content":".\\n\\n"}\n\n',
        'data: {"type":"question_chunk","content":"그"}\n\n',
        'data: {"type":"question_chunk","content":" 갈"}\n\n',
        'data: {"type":"question_chunk","content":"등"}\n\n',
        'data: {"type":"question_chunk","content":" 상황"}\n\n',
        'data: {"type":"question_chunk","content":"을"}\n\n',
        'data: {"type":"question_chunk","content":" 조금"}\n\n',
        'data: {"type":"question_chunk","content":" 더"}\n\n',
        'data: {"type":"question_chunk","content":" 구"}\n\n',
        'data: {"type":"question_chunk","content":"체"}\n\n',
        'data: {"type":"question_chunk","content":"적으로"}\n\n',
        'data: {"type":"question_chunk","content":" 말씀"}\n\n',
        'data: {"type":"question_chunk","content":"해"}\n\n',
        'data: {"type":"question_chunk","content":" 주"}\n\n',
        'data: {"type":"question_chunk","content":"실"}\n\n',
        'data: {"type":"question_chunk","content":" 수"}\n\n',
        'data: {"type":"question_chunk","content":" 있"}\n\n',
        'data: {"type":"question_chunk","content":"나요"}\n\n',
        'data: {"type":"question_chunk","content":"?"}\n\n',
        'data: {"type":"next","sessionId":"test-session-123","question":"상사와의 갈등 때문에 많이 힘드셨겠어요.\\n\\n그 갈등 상황을 조금 더 구체적으로 말씀해 주실 수 있나요?","options":["정말 속상했어요","어떤 점이 힘들었는지요?","자세히 얘기해줄래요?","마음이 많이 아프셨죠?","그 상황이 계속 부담돼요","말하기 힘든 부분도 있나요?","더 얘기해주시면 좋겠어요","조언해줘"],"canProceedToResponse":false,"canRequestFeedback":true,"contextCount":3}\n\n',
        'data: {"done":true}\n\n',
      ].join("");

      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: streamData,
      });
    });

    await page.route("**/api/chat/sessions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sessions: [
            {
              sessionId: "test-session-123",
              category: "work",
              status: "active",
              summary: "상사와의 갈등 관련 상담",
              turnCount: 2,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.route("**/api/chat/sessions/test-session-123/resume", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          sessionId: "test-session-123",
          question:
            "명상에 관심이 많으시다니 정말 좋으세요.\\n\\n아침에 일어날 때 마음이 편안해지길 바라시는 점, 정말 중요한 부분이네요.\\n\\n지금까지 명상이나 호흡법 외에 아침의 마음을 다스리기 위해 시도해보셨거나 생각해본 다른 방법이 있으신가요?",
          options: [
            "아직 시도한 게 없어요",
            "간단한 스트레칭 해봐요",
            "음악 듣는 걸 좋아해요",
            "일기 쓰기를 생각했어요",
            "산책을 해본 적 있어요",
            "호흡법만 생각했어요",
            "다른 방법을 찾고 있어요",
            "조언해줘",
          ],
          canProceedToResponse: false,
          canRequestFeedback: true,
          previousContext: ["나: 명상에 관심이 많아요", "상담사: 좋은 선택이네요"],
          rollingSummary: "명상과 아침 마음 관리에 관한 대화",
          category: "self",
          turnCount: 3,
          counselorType: "F",
        }),
      });
    });

    // 2. 홈페이지 방문
    await page.goto("/");

    // 3. 카테고리 선택하여 세션 시작
    await page.getByText("직장").click();
    await page.getByText("따스한 공감").click();

    // 4. 세션이 시작되고 질문과 선택지가 표시되는지 확인
    await expect(page.getByText("직장에서 어떤 고민이 가장 크게 느껴지시나요?")).toBeVisible();
    await expect(page.getByText("업무가 너무 많아요")).toBeVisible();

    // 5. 선택지 선택
    await page.getByText("상사와 갈등 있어요").click();

    // 6. 스트리밍 응답 확인
    await expect(page.getByText(/상사와의 갈등/)).toBeVisible({ timeout: 10000 });

    // 7. 스트리밍 완료 후 새 선택지가 표시되는지 확인
    await expect(page.getByText("정말 속상했어요")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("어떤 점이 힘들었는지요?")).toBeVisible();

    // 8. 세션 목록이 있다고 가정하고 재개 테스트
    // 사이드바 열기 (로그인 상태라고 가정)
    await page.evaluate(() => {
      localStorage.setItem("token", "test-token");
    });
    await page.reload();

    // 9. 이전 세션 클릭하여 재개
    await page.getByText("상사와의 갈등 관련 상담").click();

    // 10. 재개된 세션의 선택지가 표시되는지 확인
    await expect(
      page.getByText("명상에 관심이 많으시다니 정말 좋으세요")
    ).toBeVisible({ timeout: 5000 });

    // 11. 가장 중요: 선택지 버튼들이 표시되는지 확인
    await expect(page.getByText("아직 시도한 게 없어요")).toBeVisible();
    await expect(page.getByText("간단한 스트레칭 해봐요")).toBeVisible();
    await expect(page.getByText("음악 듣는 걸 좋아해요")).toBeVisible();
    await expect(page.getByText("일기 쓰기를 생각했어요")).toBeVisible();

    // 12. 선택지 버튼이 클릭 가능한지 확인
    const optionButton = page.getByText("아직 시도한 게 없어요");
    await expect(optionButton).toBeEnabled();
  });
});
