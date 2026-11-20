import path from "node:path";
import { expect, test } from "@playwright/test";

const screenshotDir = path.resolve(
  __dirname,
  "../../../scripts/local-test/.runtime",
);

const initial = [
  "듣고 싶었던 노래가 있어",
  "아직 아쉬운 마음이 커",
  "연습은 어땠는지 궁금해",
  "잠깐 다른 이야기를 할래",
];
const followup = ["그 무대가 많이 기대됐어", "이야기를 더 듣고 싶어"];

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:3103") return route.continue();
    if (url.hostname === "cdn.jsdelivr.net") return route.continue();
    if (url.origin !== "http://127.0.0.1:3999") return route.abort();
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization,content-type,x-browser-id",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    };
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (url.pathname === "/ephemeral/start-options")
      return route.fulfill({ headers, json: { options: initial } });
    if (url.pathname === "/ephemeral/respond")
      return route.fulfill({
        headers: { ...headers, "Content-Type": "text/event-stream" },
        body: [
          {
            type: "reply",
            reply: "합성 시나리오 응답이야. 어떤 무대가 가장 궁금했어?",
          },
          { type: "options", options: followup },
          { type: "done" },
        ]
          .map((e) => `data: ${JSON.stringify(e)}\n\n`)
          .join(""),
      });
    return route.fulfill({ status: 401, headers, json: {} });
  });
});

for (const gender of ["male", "female"] as const) {
  test(`${gender} selection precedes name and paid preparation, and conversation stays isolated`, async ({
    page,
    browserName,
  }) => {
    const paid: { path: string; body: Record<string, unknown> }[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/ephemeral/") && request.method() === "POST")
        paid.push({
          path: new URL(request.url()).pathname,
          body: request.postDataJSON(),
        });
    });
    await page.goto("/talk?entry=ticketing&private=do-not-send");
    await expect(
      page.getByRole("heading", { name: "누구의 메시지를 받아볼까요?" }),
    ).toBeVisible();
    expect(paid).toHaveLength(0);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(async () => {
        await document.fonts.load('500 16px "Pretendard Variable"');
        await document.fonts.ready;
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      const images = page.locator('img[src*="practicket"]');
      await expect(images).toHaveCount(2);
      expect(
        await images.evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
      ).toBe(true);
      if (width !== 320)
        await page.screenshot({
          path: `${screenshotDir}/scenario-select-${browserName}-${width}.png`,
          fullPage: true,
        });
    }
    await page
      .getByRole("button", {
        name: gender === "male" ? /남자 캐릭터/ : /여자 캐릭터/,
      })
      .click();
    const name = page.getByLabel("캐릭터 이름", { exact: true });
    await expect(name).toHaveValue(gender === "male" ? "서온" : "해린");
    expect(paid).toHaveLength(0);
    await name.fill("<지시>");
    await page.getByRole("button", { name: "이 이름으로 이야기 시작" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "이름은 한글" }),
    ).toBeVisible();
    expect(paid).toHaveLength(0);
    await name.fill("합성뮤지션");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: `${screenshotDir}/scenario-name-${gender}-${browserName}-390.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "이 이름으로 이야기 시작" }).click();
    await expect(
      page.getByRole("button", { name: initial[0], exact: true }),
    ).toBeVisible();
    expect(paid).toHaveLength(1);
    expect(paid[0].body).toEqual({
      context: "ticketing",
      previous: [],
      scenario: {
        source: "practicket",
        kind: "ticketing",
        gender,
        name: "합성뮤지션",
      },
    });
    await page
      .getByRole("button", { name: "직접 입력할게요", exact: true })
      .click();
    await page
      .getByRole("button", { name: "선택지로 돌아가기", exact: true })
      .click();
    expect(paid).toHaveLength(1);
    await page.getByRole("button", { name: initial[0], exact: true }).click();
    await expect(
      page.getByRole("button", { name: followup[0], exact: true }),
    ).toBeVisible();
    expect(paid[1].body).toMatchObject({
      messages: [{ role: "user", content: initial[0] }],
      scenario: {
        source: "practicket",
        kind: "ticketing",
        gender,
        name: "합성뮤지션",
      },
    });
    expect(JSON.stringify(paid)).not.toContain("do-not-send");
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      if (width !== 320)
        await page.screenshot({
          path: `${screenshotDir}/scenario-chat-${gender}-${browserName}-${width}.png`,
          fullPage: true,
        });
    }
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
      "TEXTAREA",
    );
    expect(
      await page.evaluate(() =>
        Object.keys(localStorage).filter((k) =>
          /scenario|name|messages|summary/i.test(k),
        ),
      ),
    ).toEqual([]);
    await page
      .getByRole("button", {
        name: "이야기 지우고 레비와 상담하기",
        exact: true,
      })
      .click();
    await page.getByRole("dialog").getByRole("button", { name: "레비와 상담하기", exact: true }).click();
    await expect(
      page.getByText(
        "티켓팅을 놓쳐서 속상하셨나요? 아쉬운 마음, 제가 들어드릴게요.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText("합성 시나리오 응답이야. 어떤 무대가 가장 궁금했어?", {
        exact: true,
      }),
    ).toHaveCount(0);
    await page.locator(".ch-options button").first().click();
    await expect(
      page.getByRole("button", { name: followup[0], exact: true }),
    ).toBeVisible();
    const last = paid.at(-1)!.body;
    expect(last).not.toHaveProperty("scenario");
    expect(last.messages).toEqual([{ role: "user", content: initial[0] }]);
    expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(
      0,
    );
  });
}

test("ordinary and unknown entry never offer the scenario", async ({
  page,
}) => {
  for (const url of [
    "/talk",
    "/talk?entry=unknown",
    "/talk?utm_source=other&utm_medium=banner",
  ]) {
    await page.goto(url);
    await expect(
      page.getByText(
        "어디서부터 말해야 할지 몰라도 괜찮아요. 선택지만 눌러도 괜찮아요.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /남자 캐릭터/ })).toHaveCount(
      0,
    );
  }
});

test("failed preparation allows fallback and resets names and context on character change", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/ephemeral/start-options", (route) => {
    if (route.request().method() === "OPTIONS") return route.fallback();
    calls++;
    return route.fulfill({
      status: 503,
      headers: { "Access-Control-Allow-Origin": "*" },
      json: {},
    });
  });
  await page.goto("/talk?entry=ticketing");
  await page.getByRole("button", { name: /남자 캐릭터/ }).click();
  await page.getByLabel("캐릭터 이름", { exact: true }).fill("합성서온");
  await page.getByRole("button", { name: "이 이름으로 이야기 시작" }).click();
  await expect(
    page.getByText("기본 선택지로도 이야기를 시작할 수 있어요.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "듣고 싶었던 무대가 있어", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: followup[0], exact: true }),
  ).toBeVisible();
  expect(calls).toBe(1);
  await page
    .getByRole("button", {
      name: "이야기 지우고 캐릭터 다시 선택",
      exact: true,
    })
    .click();
  await page.getByRole("dialog").getByRole("button", { name: "캐릭터 다시 선택", exact: true }).click();
  await page.getByRole("button", { name: /여자 캐릭터/ }).click();
  await expect(page.getByLabel("캐릭터 이름", { exact: true })).toHaveValue(
    "해린",
  );
  await expect(page.getByText("합성서온", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("합성 시나리오 응답이야. 어떤 무대가 가장 궁금했어?", {
      exact: true,
    }),
  ).toHaveCount(0);
});

test("changing character aborts the previous scene and ignores its late reply", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  let started = false;
  await page.route("**/ephemeral/respond", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fallback();
    started = true;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route
      .fulfill({
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/event-stream",
        },
        body: 'data: {"type":"reply","reply":"이전 인물의 늦은 응답"}\n\ndata: {"type":"done"}\n\n',
      })
      .catch(() => {});
  });
  await page.goto("/talk?entry=ticketing");
  await page.getByRole("button", { name: /남자 캐릭터/ }).click();
  await page.getByRole("button", { name: "이 이름으로 이야기 시작" }).click();
  await page.getByRole("button", { name: initial[0], exact: true }).click();
  await expect.poll(() => started).toBe(true);
  await page
    .getByRole("button", {
      name: "이야기 지우고 캐릭터 다시 선택",
      exact: true,
    })
    .click();
  await page.getByRole("dialog").getByRole("button", { name: "캐릭터 다시 선택", exact: true }).click();
  await page.getByRole("button", { name: /여자 캐릭터/ }).click();
  await page.getByRole("button", { name: "이 이름으로 이야기 시작" }).click();
  await expect(
    page.getByRole("heading", { name: "해린", exact: true }),
  ).toBeVisible();
  release?.();
  await expect(
    page.getByText("이전 인물의 늦은 응답", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: initial[0], exact: true }),
  ).toBeEnabled();
});

test("leaving the page erases the name and conversation before a cached restore", async ({
  page,
}) => {
  await page.goto("/talk?entry=ticketing");
  await page.getByRole("button", { name: /남자 캐릭터/ }).click();
  await page.getByLabel("캐릭터 이름", { exact: true }).fill("합성기억없음");
  await page.getByRole("button", { name: "이 이름으로 이야기 시작" }).click();
  await page.getByRole("button", { name: initial[0], exact: true }).click();
  await expect(
    page.getByRole("button", { name: followup[0], exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true }),
    );
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    );
  });
  await expect(
    page.getByRole("heading", { name: "누구의 메시지를 받아볼까요?" }),
  ).toBeVisible();
  await expect(page.getByText("합성기억없음", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("합성 시나리오 응답이야. 어떤 무대가 가장 궁금했어?", {
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /여자 캐릭터/ }).click();
  await expect(page.getByLabel("캐릭터 이름", { exact: true })).toHaveValue(
    "해린",
  );
});

test("lobby New entry opens the scenario without rewriting it to Levi counseling", async ({
  page,
  browserName,
}) => {
  const preparations: Record<string, unknown>[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/ephemeral/start-options") && r.method() === "POST")
      preparations.push(r.postDataJSON());
  });
  await page.goto("/");
  const entry = page.getByRole("link", { name: /시나리오 모드 New/ });
  await expect(entry).toBeVisible();
  await expect(entry.locator(".scenario-new")).toHaveText("New");
  await expect(entry).toHaveAttribute("href", "/talk?scenario=ticketing");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(async () => {
      await document.fonts.load('500 16px "Pretendard Variable"');
      await document.fonts.ready;
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await entry.scrollIntoViewIfNeeded();
    await expect(entry).toBeVisible();
    if (width !== 320)
      await page.screenshot({
        path: `${screenshotDir}/lobby-scenario-${browserName}-${width}.png`,
        fullPage: true,
      });
  }
  expect(preparations).toHaveLength(0);
  await entry.click();
  await expect(page).toHaveURL(/\/talk\?scenario=ticketing$/);
  await expect(
    page.getByRole("heading", { name: "누구의 메시지를 받아볼까요?" }),
  ).toBeVisible();
  await expect(page.getByText("프랙티켓 전용", { exact: true })).toHaveCount(0);
  expect(preparations).toHaveLength(0);
  await page.getByRole("button", { name: /여자 캐릭터/ }).click();
  await page.getByRole("button", { name: "이 이름으로 이야기 시작" }).click();
  await expect(
    page.getByRole("button", { name: initial[0], exact: true }),
  ).toBeVisible();
  expect(preparations[0]).toMatchObject({
    context: "ticketing",
    scenario: {
      source: "lobby",
      kind: "ticketing",
      gender: "female",
      name: "해린",
    },
  });
  await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);
  await page
    .getByRole("button", { name: "이야기 지우고 레비와 상담하기", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("button", { name: "레비와 상담하기", exact: true }).click();
  await expect(
    page.getByText(
      "어디서부터 말해야 할지 몰라도 괜찮아요. 선택지만 눌러도 괜찮아요.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("unknown and duplicated scenario codes keep the ordinary counseling entry", async ({
  page,
}) => {
  for (const query of [
    "scenario=unknown",
    "scenario=ticketing&scenario=ticketing",
  ]) {
    await page.goto(`/talk?${query}`);
    await expect(
      page.getByText(
        "어디서부터 말해야 할지 몰라도 괜찮아요. 선택지만 눌러도 괜찮아요.",
        { exact: true },
      ),
    ).toBeVisible();
  }
});

test("scenario confirmation preserves the conversation and restores focus on cancel", async ({ page, browserName }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/talk?scenario=ticketing");
  await page.getByRole("button", { name: /여자 캐릭터/ }).click();
  await page.getByRole("button", { name: "이 이름으로 이야기 시작" }).click();
  const trigger = page.getByRole("button", { name: "이야기 지우고 레비와 상담하기", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "레비와 상담할까요?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveClass("ch-limit-dialog");
  expect(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.screenshot({ path: `${screenshotDir}/scenario-dialog-${browserName}-320.png`, fullPage: true });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("heading", { name: "해린", exact: true })).toBeVisible();
  await trigger.click();
  await page.getByRole("dialog").getByRole("button", { name: "계속 이야기하기" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("heading", { name: "해린", exact: true })).toBeVisible();
});

for (const code of ["DAILY_GUEST_LIMIT", "DAILY_USER_LIMIT"] as const) {
  test(`scenario reuses the existing ${code} dialog`, async ({ page }) => {
    await page.route("**/ephemeral/respond", route => {
      if (route.request().method() === "OPTIONS") return route.fallback();
      return route.fulfill({ status: 429, headers: { "Access-Control-Allow-Origin": "*" }, json: { code } });
    });
    await page.goto("/talk?scenario=ticketing");
    await page.getByRole("button", { name: /남자 캐릭터/ }).click();
    await page.getByRole("button", { name: "이 이름으로 이야기 시작" }).click();
    await page.getByRole("button", { name: initial[0], exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveClass("ch-limit-dialog");
    await expect(dialog.getByRole("link", { name: "109", exact: true })).toHaveAttribute("href", "tel:109");
    await expect(dialog.getByRole("button", { name: "로그인하기" })).toHaveCount(code === "DAILY_GUEST_LIMIT" ? 1 : 0);
    await dialog.getByRole("button", { name: "확인", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "서온", exact: true })).toBeVisible();
  });
}
