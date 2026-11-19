import { expect, test } from "@playwright/test";
import { createStartOptions } from "../src/lib/start-options";
import { resolveEntryContext, talkEntryHref } from "../src/lib/entry-context";

const ad =
  "/?utm_source=practicket&utm_medium=banner&utm_campaign=partner-name";

test("entry context accepts only known codes, campaigns and exact referrer hosts", () => {
  const resolve = (query: string, referrer = "") =>
    resolveEntryContext(new URLSearchParams(query), referrer);
  expect(resolve("entry=ticketing")).toBe("ticketing");
  expect(resolve("utm_source=practicket&utm_medium=banner")).toBe("ticketing");
  expect(resolve("", "https://practicket.com/ranking?private=secret")).toBe(
    "ticketing",
  );
  for (const query of [
    "entry=unknown",
    "entry=ticketing&entry=ticketing",
    "entry=__proto__",
    "utm_source=practicket&utm_source=other&utm_medium=banner",
  ])
    expect(resolve(query)).toBeUndefined();
  for (const referrer of [
    "https://practicket.com.attacker.invalid/",
    "https://practicket.com@attacker.invalid/",
    "https://attacker.invalid/practicket.com",
    "not-a-url",
    "",
  ])
    expect(resolve("", referrer)).toBeUndefined();
  expect(talkEntryHref(resolve("entry=<script>"))).toBe("/talk");
});

test.beforeEach(async ({ context }) => {
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:3103") return route.continue();
    if (
      url.hostname === "cdn.jsdelivr.net" &&
      url.pathname.startsWith("/gh/orioncactus/pretendard@")
    )
      return route.continue();
    if (url.hostname === "www.googletagmanager.com")
      return route.fulfill({ contentType: "application/javascript", body: "" });
    if (url.origin !== "http://127.0.0.1:3999") return route.abort();
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization,content-type,x-browser-id",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    };
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (url.pathname === "/ephemeral/start-options") {
      const input = route.request().postDataJSON();
      const ticketing = input.context === "ticketing";
      const first = ticketing
        ? [
            "놓친 티켓이 계속 생각나요",
            "잠깐 쉬어가고 싶어요",
            "다음 티켓팅이 걱정돼요",
            "좋아하는 공연 얘기를 하고 싶어요",
          ]
        : [
            "일이 버겁게 느껴져요",
            "관계에서 신경 쓰이는 일이 있어요",
            "오늘 기분 좋은 일이 있었어요",
            "제 마음을 알아보고 싶어요",
          ];
      const next = ticketing
        ? [
            "기대했던 티켓을 못 구했어요",
            "티켓팅 얘기를 들어주면 좋겠어요",
            "다시 도전할 마음을 찾고 싶어요",
            "아쉬운 마음을 정리하고 싶어요",
          ]
        : [
            "오늘 있었던 일을 털어놓고 싶어요",
            "누군가의 말이 계속 생각나요",
            "그냥 대화를 나누고 싶어요",
            "고민을 차근차근 정리하고 싶어요",
          ];
      return route.fulfill({
        headers,
        json: { options: input.previous.length ? next : first },
      });
    }
    if (url.pathname === "/ephemeral/respond")
      return route.fulfill({
        headers: { ...headers, "Content-Type": "text/event-stream" },
        body: [
          {
            type: "reply",
            reply: "합성 응답입니다. 지금 느끼는 마음을 더 들려주세요.",
          },
          {
            type: "options",
            options: ["지금은 조금 편안해졌어요", "더 이야기할게요"],
          },
          { type: "done" },
        ]
          .map((e) => `data: ${JSON.stringify(e)}\n\n`)
          .join(""),
      });
    return route.fulfill({
      status: 401,
      headers,
      json: { message: "Unauthorized" },
    });
  });
});

test("ad context crosses every home link and GA navigation without forwarding raw queries", async ({
  page,
}) => {
  await page.goto(ad + "&entry=ticketing");
  const links = page.locator('a[href="/talk?entry=ticketing"]');
  await expect(links).toHaveCount(3);
  await expect
    .poll(() =>
      page.evaluate(() => typeof (window as Window & { gtag?: unknown }).gtag),
    )
    .toBe("function");
  const layer = await page.evaluate(() =>
    (window as Window & { dataLayer?: IArguments[] }).dataLayer?.map((a) =>
      Array.from(a),
    ),
  );
  const config = layer?.find((a) => a[0] === "config")?.[2] as {
    page_location: string;
  };
  expect(config.page_location).not.toContain("entry=");
  expect(config.page_location).not.toContain("partner-name");
  await links.first().click();
  await expect(page).toHaveURL(/\/talk\?entry=ticketing$/);
  await expect(
    page.getByText(
      "티켓팅을 놓쳐서 속상하셨나요? 아쉬운 마음, 제가 들어드릴게요.",
    ),
  ).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(
    0,
  );
  await page.goto("/talk");
  await expect(
    page.getByText(
      "어디서부터 말해야 할지 몰라도 괜찮아요. 선택지만 눌러도 괜찮아요.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("referrer context is a hint and another topic can be chosen without starting a conversation", async ({
  page,
}) => {
  await page.goto("/", {
    referer: "https://practicket.com/ranking?private=secret",
  });
  await expect(page.locator('a[href="/talk?entry=ticketing"]')).toHaveCount(3);
  await page.goto("/talk?entry=ticketing");
  let calls = 0;
  page.on("request", (req) => {
    if (req.url().endsWith("/ephemeral/respond")) calls++;
  });
  await page
    .getByRole("button", { name: "다른 이야기로 시작할게요", exact: true })
    .click();
  expect(calls).toBe(0);
  await page.locator(".ch-options button").first().click();
  await expect(
    page.getByRole("button", { name: "지금은 조금 편안해졌어요", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "놓친 자리가 계속 생각나요",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(calls).toBe(1);
});

test("ticketing entry fits mobile and desktop and sends only the user's chosen message", async ({
  page,
  browserName,
}) => {
  await page.goto("/talk?entry=ticketing&private=do-not-forward");
  await expect(page.locator(".ch-options button")).toHaveCount(5);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(async () => {
      await document.fonts.load('500 16px "Pretendard Variable"');
      await document.fonts.ready;
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    if (width !== 320)
      await page.screenshot({
        path: `../../scripts/local-test/.runtime/ticketing-entry-${browserName}-${width}.png`,
        fullPage: true,
      });
  }
  const request = page.waitForRequest((r) =>
    r.url().endsWith("/ephemeral/respond"),
  );
  const chosen = await page.locator(".ch-options button").first().innerText();
  await page.locator(".ch-options button").first().click();
  const body = (await request).postDataJSON();
  expect(body.messages).toEqual([{ role: "user", content: chosen }]);
  expect(JSON.stringify(body)).not.toMatch(/entry|practicket|do-not-forward/);
  await expect(
    page.getByRole("button", { name: "지금은 조금 편안해졌어요", exact: true }),
  ).toBeVisible();
});

test("existing ad analytics remain canonical and unknown query data prevents GA loading", async ({
  page,
}) => {
  await page.goto(ad);
  await expect
    .poll(() =>
      page.evaluate(() => typeof (window as Window & { gtag?: unknown }).gtag),
    )
    .toBe("function");
  const events = await page.evaluate(() =>
    (window as Window & { dataLayer?: IArguments[] }).dataLayer?.map((a) =>
      Array.from(a),
    ),
  );
  const view = events?.find(
    (a) => a[0] === "event" && a[1] === "page_view",
  )?.[2] as { page_location: string; page_referrer: string };
  expect(view.page_location).toBe(
    new URL(
      "/?utm_source=practicket&utm_medium=banner&utm_campaign=%EC%9C%84%EB%A1%9C",
      page.url(),
    ).href,
  );
  expect(view.page_referrer).toBe("");
  await page.goto(ad + "&entry=ticketing&email=private");
  await expect(page.locator('a[href="/talk?entry=ticketing"]')).toHaveCount(3);
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(
    0,
  );
  await page.locator('a[href="/talk?entry=ticketing"]').first().click();
  await expect(page).toHaveURL(/\/talk\?entry=ticketing$/);
  await page.goto("/talk?entry=unknown");
  await expect(
    page.getByText(
      "어디서부터 말해야 할지 몰라도 괜찮아요. 선택지만 눌러도 괜찮아요.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("fallback choices vary in content and omit the previous set without changing during renders", () => {
  for (const context of [undefined, "ticketing"] as const) {
    const variants = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const before = createStartOptions({ context, seed });
      expect(before).toHaveLength(5);
      expect(new Set(before).size).toBe(5);
      expect(createStartOptions({ context, seed })).toEqual(before);
      const after = createStartOptions({
        context,
        seed: seed + 1,
        previous: before,
      });
      const repeated = after.filter(
        (text) => text !== "다른 이야기로 시작할게요" && before.includes(text),
      );
      expect(repeated).toEqual([]);
      variants.add([...before].sort().join("|"));
    }
    expect(variants.size).toBeGreaterThan(5);
  }
});

test("a fresh conversation rotates choices and ordinary UI actions do not reroll them", async ({
  page,
}) => {
  await page.goto("/talk?entry=ticketing");
  await expect(page.locator(".ch-options button")).toHaveCount(5);
  await expect(page.locator(".ch-options button").first()).toBeEnabled();
  const before = await page.locator(".ch-options button").allTextContents();
  await page
    .getByRole("button", { name: "직접 입력할게요", exact: true })
    .click();
  await page
    .getByRole("button", { name: "선택지로 돌아가기", exact: true })
    .click();
  expect(await page.locator(".ch-options button").allTextContents()).toEqual(
    before,
  );
  await page.locator(".ch-options button").first().click();
  await expect(
    page.getByRole("button", { name: "지금은 조금 편안해졌어요", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "상담 종료", exact: true }).click();
  await page
    .getByRole("button", { name: "대화 내용 지우기", exact: true })
    .click();
  await page.getByRole("button", { name: "새 상담 시작", exact: true }).click();
  await expect(page.locator(".ch-options button")).toHaveCount(5);
  const after = await page.locator(".ch-options button").allTextContents();
  expect(
    after.filter(
      (text) => text !== "다른 이야기로 시작할게요" && before.includes(text),
    ),
  ).toEqual([]);
});

test("initial choices come from the model endpoint and are not regenerated by UI toggles", async ({
  page,
}) => {
  const requests: Record<string, unknown>[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/ephemeral/start-options") && r.method() === "POST")
      requests.push(r.postDataJSON());
  });
  await page.goto("/talk?entry=ticketing&private=secret");
  await expect(
    page.getByRole("button", {
      name: "놓친 티켓이 계속 생각나요",
      exact: true,
    }),
  ).toBeVisible();
  expect(requests).toEqual([{ context: "ticketing", previous: [] }]);
  await page
    .getByRole("button", { name: "직접 입력할게요", exact: true })
    .click();
  await page
    .getByRole("button", { name: "선택지로 돌아가기", exact: true })
    .click();
  expect(requests).toHaveLength(1);
});

test("failed initial generation falls back without retrying or preventing a conversation", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/ephemeral/start-options", (route) => {
    if (route.request().method() === "OPTIONS") return route.fallback();
    calls++;
    return route.fulfill({
      status: 503,
      headers: { "Access-Control-Allow-Origin": "*" },
      json: { code: "UNAVAILABLE" },
    });
  });
  await page.goto("/talk?entry=ticketing");
  await expect(
    page.getByText("기본 선택지로도 편하게 시작할 수 있어요.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ch-options button")).toHaveCount(5);
  await page.locator(".ch-options button").first().click();
  await expect(
    page.getByRole("button", { name: "지금은 조금 편안해졌어요", exact: true }),
  ).toBeVisible();
  expect(calls).toBe(1);
});

test("an initial generation response cannot replace the choices of an ongoing conversation", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  await page.route("**/ephemeral/start-options", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fallback();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route
      .fulfill({
        headers: { "Access-Control-Allow-Origin": "*" },
        json: {
          options: [
            "늦게 도착한 선택지예요",
            "처음부터 다시 말할게요",
            "다른 주제로 말하고 싶어요",
            "잠깐 쉬고 싶어요",
          ],
        },
      })
      .catch(() => {});
  });
  await page.goto("/talk?entry=ticketing");
  await expect(
    page.getByRole("status").filter({ hasText: "이야기를 시작할 선택지" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "직접 입력할게요", exact: true })
    .click();
  await page.locator("textarea").fill("합성 검증을 위한 첫 이야기예요");
  await page.locator("textarea").press("Enter");
  await expect(
    page.getByRole("button", { name: "지금은 조금 편안해졌어요", exact: true }),
  ).toBeVisible();
  release?.();
  await expect(
    page.getByRole("button", { name: "늦게 도착한 선택지예요", exact: true }),
  ).toHaveCount(0);
});
