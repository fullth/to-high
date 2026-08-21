import { expect, test } from "@playwright/test";

test.describe("세션 재개", () => {
  test("저장된 대화와 빠른 답장이 표시된다", async ({ page }) => {
    let detailRequestCount = 0;
    await page.route(/\/auth\/me$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-user",
          email: "test@example.com",
          name: "테스트 사용자",
        }),
      });
    });

    await page.route(/\/chat\/sessions$/, async (route) => {
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

    await page.route(/\/chat\/sessions\/test-session-123$/, async (route) => {
      detailRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sessionId: "test-session-123",
          category: "work",
          status: "active",
          context: [
            "나: 상사와 갈등이 있어요",
            "상담사: 그 일로 마음이 많이 무거우셨겠어요.",
          ],
          fullContext: [
            "카테고리: work",
            "나: 상사와 갈등이 있어요",
            "상담사: 그 일로 마음이 많이 무거우셨겠어요.",
          ],
          summary: "상사와의 갈등 관련 상담",
          turnCount: 2,
          counselorType: "F",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem("accessToken", "test-token");
    });
    await page.goto("/sessions");

    await page.getByText("상사와의 갈등 관련 상담").click();

    await expect.poll(() => detailRequestCount).toBeGreaterThan(0);
    await expect(page.getByText("상사와 갈등이 있어요")).toBeVisible();
    await expect(
      page.getByText("그 일로 마음이 많이 무거우셨겠어요."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "잘 모르겠어요" }),
    ).toBeVisible();
  });
});
