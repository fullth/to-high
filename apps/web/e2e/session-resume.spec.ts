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

  for (const status of ["active", "completed"] as const) {
    test(`${status} 기록의 상담사 서식은 복원하고 사용자 입력은 그대로 표시한다`, async ({
      page,
    }) => {
      const imageUrl = "https://render-fixture.invalid/pixel.png";
      const content = [
        "**확인용강조**",
        "진단·치료&#x20;검토",
        `![확인용이미지](${imageUrl})`,
        "[확인용링크](javascript:alert(1))",
        "<script>window.__renderScriptExecuted = true;</script>",
      ].join("\n\n");
      const now = new Date().toISOString();
      let imageRequests = 0;

      await page.route(imageUrl, (route) => {
        imageRequests += 1;
        return route.abort();
      });

      await page.route(/\/auth\/me$/, (route) =>
        route.fulfill({
          json: {
            id: "test-user",
            email: "test@example.com",
            name: "테스트 사용자",
          },
        }),
      );
      await page.route(/\/chat\/sessions$/, (route) =>
        route.fulfill({ json: { sessions: [] } }),
      );
      await page.route(/\/chat\/sessions\/formatted-session$/, (route) =>
        route.fulfill({
          json: {
            sessionId: "formatted-session",
            category: "daily",
            status,
            context: [],
            fullContext: [
              "카테고리: daily",
              `나: ${content}`,
              `상담사: ${content}`,
            ],
            summary: "표시 형식 확인",
            turnCount: 1,
            counselorType: "F",
            createdAt: now,
            updatedAt: now,
          },
        }),
      );
      await page.addInitScript(() => {
        localStorage.setItem("accessToken", "test-token");
      });

      await page.goto("/chat/formatted-session");

      const assistant = page.locator(".ch-row.no-anim .ch-bubble.ai");
      await expect(assistant.locator("strong")).toHaveText("확인용강조");
      await expect(assistant).toContainText("진단·치료 검토");
      await expect(assistant).not.toContainText("**");
      await expect(assistant).not.toContainText("&#x20;");
      await expect(assistant).toContainText("확인용이미지");
      await expect(assistant.locator("img, script")).toHaveCount(0);
      await expect(assistant.locator('a[href^="javascript:"]')).toHaveCount(0);
      expect(imageRequests).toBe(0);
      expect(
        await page.evaluate(() => "__renderScriptExecuted" in window),
      ).toBe(false);

      const user = page.locator(".ch-row.no-anim .ch-bubble.user");
      await expect(user).toHaveText(content);
      await expect(user.locator("strong, img, script, a")).toHaveCount(0);
    });
  }
});
