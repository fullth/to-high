import { expect, test, type Page } from "@playwright/test";

const longToken = "synthetic".repeat(30);
const reply = `합성 검증 문장입니다. 긴 주소도 화면 안에서 읽을 수 있어야 해요. https://example.invalid/${longToken}`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("accessToken", "synthetic-admin"),
  );
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:3103") return route.continue();
    if (
      url.hostname === "cdn.jsdelivr.net" &&
      url.pathname.startsWith("/gh/orioncactus/pretendard@")
    )
      return route.continue();
    if (!["localhost", "127.0.0.1"].includes(url.hostname))
      return route.abort();
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization,content-type,x-browser-id",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    };
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    let json: object = {};
    if (url.pathname === "/auth/me")
      json = { userId: "admin", email: "admin@example.invalid" };
    else if (url.pathname === "/admin/budget")
      json = {
        balanceMilliWon: 10000000,
        reservedMilliWon: 1000,
        accounting: {
          startedAt: "2026-11-12T00:00:00Z",
          carryoverMilliWon: 10000000,
          approvedMilliWon: 0,
          settledMilliWon: 0,
        },
        notificationReady: true,
        todayUsage: { countedTurns: 7, signedInAccounts: 2, guestNetworks: 1 },
        credits: [
          {
            amountMilliWon: 10000000,
            at: "2026-11-12T00:00:00Z",
            kind: "manual",
            actor: longToken,
          },
        ],
      };
    else if (url.pathname === "/problem/report") json = { state: "pending" };
    else if (url.pathname === "/saved-sessions") json = { sessions: [] };
    else if (url.pathname === "/ephemeral/respond")
      return route.fulfill({
        headers: { ...headers, "Content-Type": "text/event-stream" },
        body: [
          { type: "reply", reply },
          {
            type: "options",
            options: [
              "오늘은 천천히 마음을 정리하고 싶어요",
              "무엇부터 이야기해야 할지 잘 모르겠어요",
              longToken,
            ],
          },
          { type: "done" },
        ]
          .map((event) => `data: ${JSON.stringify(event)}\n\n`)
          .join(""),
      });
    else
      return route.fulfill({
        status: 410,
        headers,
        json: { message: "이전 기능은 제공하지 않습니다." },
      });
    return route.fulfill({ headers, json });
  });
});

async function ready(page: Page, serviceFont = true) {
  await page.evaluate(async () => {
    await document.fonts.load('400 16px "Pretendard Variable"');
    await document.fonts.load('700 32px "Pretendard Variable"');
    await document.fonts.ready;
  });
  if (serviceFont)
    expect(
      await page.evaluate(() =>
        [...document.fonts].some(
          (font) =>
            font.family.includes("Pretendard") && font.status === "loaded",
        ),
      ),
      `Service font on ${page.url()}`,
    ).toBe(true);
}

async function expectTextFits(page: Page) {
  const overflowing = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return [
      ...document.querySelectorAll("h1,h2,h3,h4,p,button,a,li,input,textarea"),
    ]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        const style = getComputedStyle(element);
        const intentionalClip =
          style.textOverflow === "ellipsis" ||
          element.tagName === "TEXTAREA" ||
          element.tagName === "INPUT";
        return (
          rect.left < -1 ||
          rect.right > width + 1 ||
          (!intentionalClip && element.scrollWidth > element.clientWidth + 2)
        );
      })
      .map((element) => ({
        tag: element.tagName,
        text: element.textContent?.slice(0, 80),
      }));
  });
  expect(overflowing).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

for (const width of [320, 360, 390, 430, 768, 1440]) {
  test(`text fits across the public and budget pages at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    for (const path of [
      "/",
      "/talk",
      "/privacy",
      "/help-now",
      "/problem",
      "/admin/budget",
      "/characters",
      "/sessions",
      "/diary",
      "/subscribe",
      "/admin",
      "/chat/synthetic",
      "/missing",
    ]) {
      await page.goto(path);
      const fallback = ["/missing", "/diary", "/subscribe"].includes(path);
      if (fallback)
        await expect(
          page.getByRole("heading", { name: "404", exact: true }),
        ).toBeVisible();
      await ready(page, !fallback);
      if (path === "/admin/budget")
        await expect(
          page.getByRole("button", { name: "한도 10,000원 추가 승인" }),
        ).toBeVisible();
      await expectTextFits(page);
      if (path === "/" && width <= 430) {
        const spans = page.locator(".hero h1 > span");
        const first = await spans.nth(0).boundingBox();
        const second = await spans.nth(1).boundingBox();
        expect(second!.y).toBeGreaterThan(first!.y);
      }
      if (width === 390 && ["/", "/talk", "/admin/budget"].includes(path)) {
        await page.screenshot({
          path: testInfo.outputPath(
            `${path === "/" ? "home" : path.split("/").pop()}-390.png`,
          ),
          fullPage: true,
        });
      }
    }
  });
}

test("long chat replies, options and enlarged text stay inside a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/talk");
  await ready(page);
  await page
    .getByRole("button", { name: "일 때문에 힘들어요", exact: true })
    .click();
  await expect(page.locator(".ch-bubble.ai").last()).toContainText(
    "합성 검증 문장",
  );
  await expect(
    page.getByRole("button", { name: longToken, exact: true }),
  ).toBeVisible();
  await expectTextFits(page);
  await page.goto("/");
  await ready(page);
  await page.addStyleTag({
    content: ".hero h1 { font-size: 56px; } .btn-chat { font-size: 24px; }",
  });
  await expectTextFits(page);
  await page
    .getByRole("link", { name: "레비와 대화 시작하기" })
    .first()
    .focus();
  await expect(
    page.getByRole("link", { name: "레비와 대화 시작하기" }).first(),
  ).toBeFocused();
});
