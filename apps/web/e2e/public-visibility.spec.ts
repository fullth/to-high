import { expect, test } from "@playwright/test";

test.describe("공개 서비스 노출", () => {
  test("로그인 메뉴는 출시되지 않은 계정 및 멤버십 기능을 노출하지 않는다", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("accessToken", "test-token");
    });
    await page.route("http://localhost:3000/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          userId: "test-user",
          name: "테스트 사용자",
          email: "test@example.com",
        }),
      });
    });
    await page.route("http://localhost:3000/chat/sessions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sessions: [] }),
      });
    });

    const search = new URLSearchParams({
      question: "오늘은 어떤 하루였나요?",
      options: JSON.stringify(["괜찮았어요"]),
    });
    await page.goto(`/chat/test-session?${search.toString()}`);
    await page.locator(".ch-sb-userbtn").click();

    await expect(page.getByRole("menuitem", { name: "로그아웃" })).toBeVisible();
    for (const label of ["내 정보", "멤버십 관리", "설정", "업그레이드"]) {
      await expect(page.getByText(label, { exact: true })).toHaveCount(0);
    }
    for (const path of ["/me", "/membership", "/settings"]) {
      await expect(page.locator(`a[href="${path}"]`)).toHaveCount(0);
    }
  });

  test("출시 전 사용자 서비스는 직접 접근해도 404를 반환한다", async ({
    request,
  }) => {
    for (const path of [
      "/diary",
      "/subscribe",
      "/me",
      "/membership",
      "/settings",
    ]) {
      const response = await request.get(path);
      expect(response.status(), `${path} should not be public`).toBe(404);
    }
  });

  test("사이트맵은 실제 공개 페이지에만 연결한다", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    const body = await response.text();

    expect(response.ok()).toBeTruthy();
    expect(body).toContain("/privacy");
    for (const path of ["/diary", "/subscribe", "/admin", "/sessions"]) {
      expect(body).not.toContain(path);
    }
  });

  test("검색 로봇이 운영용 및 개인 경로를 수집하지 않는다", async ({
    request,
  }) => {
    const response = await request.get("/robots.txt");
    const body = await response.text();

    expect(response.ok()).toBeTruthy();
    for (const path of ["/admin", "/auth/", "/chat/", "/sessions"]) {
      expect(body).toContain(`Disallow: ${path}`);
    }
  });
});
