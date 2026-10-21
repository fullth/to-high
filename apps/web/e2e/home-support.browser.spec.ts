import { openComposer } from "./chat-helpers";
import { expect, test, type Page } from "@playwright/test";

type SupportWindow = Window & {
  __testDocumentId?: string;
  __testChannelBoot?: { pluginKey: string };
  __testMessengerOpened?: boolean;
  __testCoffeeBoot?: { kakaoPayUrl: string; name?: string; siteKey: string };
  ChannelIO?: unknown;
  SMTC?: unknown;
};

// Stub only the external SDKs. Real page effects must load and configure them.
const channelSdk = `
  const queued = window.ChannelIO.q || [];
  window.ChannelIO = (command, options) => {
    const launcher = document.getElementById('channel-test-launcher');
    if (command === 'hideChannelButton' && launcher) launcher.style.display = 'none';
    if (command === 'showChannelButton' && launcher) launcher.style.display = 'block';
    if (command === 'showMessenger') window.__testMessengerOpened = true;
    if (command !== 'boot') return;
    window.__testChannelBoot = options;
    const button = document.createElement('button');
    button.id = 'channel-test-launcher';
    button.textContent = '문의하기';
    button.style.cssText = 'position:fixed;right:24px;bottom:25px;width:55px;height:55px;z-index:1000';
    if (options.hideChannelButtonOnBoot) button.style.display = 'none';
    document.body.appendChild(button);
  };
  queued.forEach(args => window.ChannelIO(...args));
`;
const coffeeSdk = `
  window.SMTC = (command, options) => {
    if (command !== 'boot') return;
    window.__testCoffeeBoot = options;
    const host = document.createElement('div');
    host.id = 'smtc-root';
    host.style.cssText = 'position:fixed;right:var(--smtc-offset-x,24px);bottom:var(--smtc-offset-y,24px);z-index:1000';
    const root = host.attachShadow({mode:'open'});
    const button = document.createElement('button');
    button.className = 'fab';
    button.textContent = options.label;
    button.style.cssText = 'width:100px;height:48px';
    root.appendChild(button);
    document.body.appendChild(host);
  };
`;

async function mockProviders(page: Page) {
  const sdkRequests: string[] = [];
  const origin = new URL(test.info().project.use.baseURL!).origin;
  await page.addInitScript(() => {
    (window as SupportWindow).__testDocumentId = crypto.randomUUID();
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (url.href === "https://cdn.channel.io/plugin/ch-plugin-web.js") {
      sdkRequests.push("channel");
      return route.fulfill({
        contentType: "application/javascript",
        body: channelSdk,
      });
    }
    if (
      url.href ===
      "https://cdn.jsdelivr.net/npm/show-me-the-coffee@0.1.3/dist/show-me-the-coffee.js"
    ) {
      sdkRequests.push("coffee");
      return route.fulfill({
        contentType: "application/javascript",
        body: coffeeSdk,
      });
    }
    if (url.pathname === "/ephemeral/respond") {
      return route.fulfill({ json: { reply: "테스트 답변", options: [] } });
    }
    return route.fulfill({ contentType: "text/plain", body: "" });
  });
  return sdkRequests;
}

async function documentId(page: Page) {
  const id = await page.evaluate(() => (window as SupportWindow).__testDocumentId);
  expect(id).toBeTruthy();
  return id;
}

async function expectNoWidgets(page: Page) {
  await expect(
    page.locator(
      'script[src*="channel.io"], script[src*="show-me-the-coffee"]',
    ),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => ({
      channel: typeof (window as SupportWindow).ChannelIO,
      coffee: typeof (window as SupportWindow).SMTC,
    })),
  ).toEqual({ channel: "undefined", coffee: "undefined" });
  await expect(page.getByRole("button", { name: "커피 후원" })).toHaveCount(0);
}

for (const width of [320, 390, 1440]) {
  test(`home restores both widgets and isolates counseling at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const requests = await mockProviders(page);
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "레비에게 마음을 털어놔보세요",
      }),
    ).toBeVisible();
    const channel = page.getByRole("button", { name: "문의하기" }).filter({ visible: true });
    const coffee = page.getByRole("button", { name: "커피 후원" });
    await expect(channel).toBeVisible();
    await expect(coffee).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator("#smtc-root")
          .evaluate((host) => host.style.getPropertyValue("--smtc-offset-x")),
      )
      .toBe(width < 768 ? "80px" : "95px");
    expect(
      await page.evaluate(
        () => (window as SupportWindow).__testChannelBoot?.pluginKey,
      ),
    ).toBeTruthy();
    expect(
      await page.evaluate(() => (window as SupportWindow).__testCoffeeBoot),
    ).toMatchObject({
      kakaoPayUrl: "https://qr.kakaopay.com/Ej84nMWnw",
      hideQrOnMobile: true,
      siteKey: "fin-term",
    });
    expect(
      await page.evaluate(() => (window as SupportWindow).__testCoffeeBoot),
    ).not.toHaveProperty("name");
    const channelBox = (await channel.boundingBox())!;
    const coffeeBox = (await coffee.boundingBox())!;
    expect(coffeeBox.x).toBeGreaterThanOrEqual(0);
    expect(coffeeBox.x + coffeeBox.width).toBeLessThan(channelBox.x);
    expect(channelBox.x + channelBox.width).toBeLessThanOrEqual(width);
    expect(900 - channelBox.y - channelBox.height).toBeGreaterThanOrEqual(20);
    expect(900 - coffeeBox.y - coffeeBox.height).toBeGreaterThanOrEqual(20);
    expect(
      Math.abs(
        coffeeBox.y +
          coffeeBox.height / 2 -
          channelBox.y -
          channelBox.height / 2,
      ),
    ).toBeLessThan(1);
    expect(requests.sort()).toEqual(["channel", "coffee"]);

    if (width < 768) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const copyright = page.getByText("© 2026 위로.", { exact: false });
      await expect.poll(async () => {
        const textBox = (await copyright.boundingBox())!;
        const buttonBox = (await coffee.boundingBox())!;
        return buttonBox.y - textBox.y - textBox.height;
      }).toBeGreaterThanOrEqual(12);
      await page.setViewportSize({ width: 844, height: 390 });
      await expect(page.locator("#support-channel-launcher")).toBeVisible();
      await expect(page.locator("#support-channel-launcher")).toHaveCSS("width", "55px");
      await expect(page.locator("#channel-test-launcher")).toBeHidden();
      await expect.poll(() => page.locator("#smtc-root").evaluate(host => host.style.getPropertyValue("--smtc-offset-x"))).toBe("95px");
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator("#channel-test-launcher")).toBeHidden();
      await expect.poll(() => page.locator("#smtc-root").evaluate(host => host.style.getPropertyValue("--smtc-offset-x"))).toBe("80px");
    }

    await channel.click();
    expect(await page.evaluate(() => (window as SupportWindow).__testMessengerOpened)).toBe(true);
    const homeDocument = await documentId(page);
    await page.locator('a[href="/talk"]').nth(1).click();
    await expect(page).toHaveURL(/\/talk$/);
    await expect(page.getByLabel("전하고 싶은 마음")).toBeHidden();
    expect(await documentId(page)).not.toBe(homeDocument);
    await expectNoWidgets(page);
    await openComposer(page);
    await page
      .getByLabel("전하고 싶은 마음")
      .fill("외부 위젯에 남기지 않을 상담 원문");
    await page.getByRole("button", { name: "보내기", exact: true }).click();
    await expect(page.getByText("테스트 답변", { exact: true })).toBeVisible();
    expect(requests).toHaveLength(2);
  });
}

test("counseling to home and browser back cannot retain support SDKs or the conversation", async ({
  page,
}) => {
  const requests = await mockProviders(page);
  await page.goto("/talk");
  await expectNoWidgets(page);
  expect(requests).toHaveLength(0);
  await openComposer(page);
  await page
    .getByLabel("전하고 싶은 마음")
    .fill("뒤로가기 후에도 남지 않을 원문");
  await page.getByRole("button", { name: "보내기", exact: true }).click();
  await expect(page.getByText("테스트 답변", { exact: true })).toBeVisible();
  const talkDocument = await documentId(page);
  await page.locator(".ch-header a.ch-logo").click();
  await expect(page.getByRole("button", { name: "문의하기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "커피 후원" })).toBeVisible();
  expect(await documentId(page)).not.toBe(talkDocument);
  await page.goBack();
  await expect(page).toHaveURL(/\/talk$/);
  await expect(
    page.getByText("뒤로가기 후에도 남지 않을 원문", { exact: true }),
  ).toHaveCount(0);
  const restart = page.getByRole("button", { name: "새 상담 시작", exact: true });
  if (await restart.isVisible()) await restart.click();
  await expect(page.getByLabel("전하고 싶은 마음")).toHaveValue("");
  await expectNoWidgets(page);
  expect(requests).toHaveLength(2);
});

test("home and privacy use separate documents in both directions", async ({
  page,
}) => {
  await mockProviders(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "문의하기" })).toBeVisible();
  const homeDocument = await documentId(page);
  await page.getByRole("link", { name: "개인정보 처리 안내" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  const privacyDocument = await documentId(page);
  expect(privacyDocument).not.toBe(homeDocument);
  await expectNoWidgets(page);
  await page.getByRole("link", { name: "위로", exact: true }).click();
  await expect(page.getByRole("button", { name: "문의하기" })).toBeVisible();
  expect(await documentId(page)).not.toBe(privacyDocument);
  await page.goBack();
  await expect(page).toHaveURL(/\/privacy$/);
  await expectNoWidgets(page);
});
