import { expect, test, type Page } from "@playwright/test";
const id = "507f1f77bcf86cd799439011";
async function offline(page: Page, loggedIn = false) {
  if (loggedIn)
    await page.addInitScript(() =>
      localStorage.setItem("accessToken", "offline-jwt"),
    );
  const appOrigin = new URL(test.info().project.use.baseURL!).origin;
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (new URL(url).origin === appOrigin) return route.continue();
    if (url.endsWith("/auth/me"))
      return route.fulfill({
        json: { userId: "owner", name: "테스트", email: null },
      });
    if (url.endsWith("/characters")) return route.fulfill({ json: [] });
    return route.fulfill({ json: {} });
  });
}
async function send(page: Page, value: string) {
  await page.getByLabel("전하고 싶은 마음").fill(value);
  await page.getByRole("button", { name: "보내기", exact: true }).click();
}

test("choices and direct input preserve chronological context without storing counseling content", async ({
  page,
}) => {
  await offline(page);
  const requests: Array<{
    messages: Array<{ role: string; content: string }>;
  }> = [];
  await page.route("**/ephemeral/respond", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      json: {
        reply: `답변 ${requests.length}`,
        options: ["새 선택지", "정리해주세요"],
      },
    });
  });
  await page.goto("/talk");
  await page
    .getByRole("button", { name: "일 때문에 힘들어요", exact: true })
    .click();
  await expect(page.getByText("답변 1", { exact: true })).toBeVisible();
  await send(page, "상담 원문 비밀 테스트");
  await expect(page.getByText("답변 2", { exact: true })).toBeVisible();
  expect(requests[1].messages).toEqual([
    { role: "user", content: "일 때문에 힘들어요" },
    { role: "assistant", content: "답변 1" },
    { role: "user", content: "상담 원문 비밀 테스트" },
  ]);
  expect(requests).toHaveLength(2);
  expect(
    await page.evaluate(async () => ({
      local: JSON.stringify(localStorage),
      session: JSON.stringify(sessionStorage),
      databases: (await indexedDB.databases()).map((db) => db.name),
    })),
  ).toEqual({ local: "{}", session: "{}", databases: [] });
  expect(page.url()).not.toContain("비밀");
});

test("end aborts pending response and cannot resurrect original text", async ({
  page,
}) => {
  await offline(page);
  let release!: () => void;
  const delay = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/ephemeral/respond", async (route) => {
    await delay;
    await route
      .fulfill({ json: { reply: "늦은 답변", options: [] } })
      .catch(() => {});
  });
  await page.goto("/talk");
  await send(page, "지워야 하는 원문");
  await expect(page.getByRole("status")).toContainText("답변을 준비");
  await page.getByRole("button", { name: "상담 종료 후 원문 지우기" }).click();
  release();
  await expect(
    page.getByText("상담을 마쳤어요. 이 화면의 대화 원문과 입력을 지웠어요.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("지워야 하는 원문", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText("늦은 답변", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "새 상담 시작" }).click();
  await expect(page.getByLabel("전하고 싶은 마음")).toHaveValue("");
});

test("reload, navigation back and BFCache restore discard counseling RAM", async ({
  page,
}) => {
  await offline(page);
  await page.route("**/ephemeral/respond", async (route) =>
    route.fulfill({ json: { reply: "임시 답변", options: ["정리해주세요"] } }),
  );
  await page.goto("/talk");
  await send(page, "이전 원문");
  await expect(page.getByText("임시 답변", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("이전 원문", { exact: true })).toHaveCount(0);
  await send(page, "뒤로가기 원문");
  await expect(page.getByText("임시 답변", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "위로", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.goBack();
  await expect(page).toHaveURL("/talk");
  await expect(
    page.getByRole("heading", { name: "레비에게 지금 마음을 이야기해요" }),
  ).toBeVisible();
  await expect(page.getByText("뒤로가기 원문", { exact: true })).toHaveCount(0);
  if (await page.getByRole("button", { name: "새 상담 시작" }).isVisible())
    await page.getByRole("button", { name: "새 상담 시작" }).click();
  await page.getByLabel("전하고 싶은 마음").fill("bfcache 초안");
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    ),
  );
  await expect(
    page.getByText("상담을 마쳤어요. 이 화면의 대화 원문과 입력을 지웠어요.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("전하고 싶은 마음")).toHaveCount(0);
});

test("context limit stops with explicit reset rather than silently slicing history", async ({
  page,
}) => {
  await offline(page);
  const lengths: number[] = [];
  await page.route("**/ephemeral/respond", async (route) => {
    lengths.push(route.request().postDataJSON().messages.length);
    await route.fulfill({
      json: { reply: `답변 ${lengths.length}`, options: ["계속 이야기해요"] },
    });
  });
  await page.goto("/talk");
  for (let index = 1; index <= 10; index++) {
    await send(page, `사용자 ${index}`);
    await expect(
      page.getByText(`답변 ${index}`, { exact: true }),
    ).toBeVisible();
  }
  expect(lengths).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19]);
  await expect(
    page.getByRole("region", { name: "대화 맥락 한도" }),
  ).toContainText("맥락 한도");
  await expect(
    page.getByRole("button", { name: "보내기", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText("사용자 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "원문 지우고 마치기" }).click();
  await expect(page.getByText("사용자 1", { exact: true })).toHaveCount(0);
});

test("crisis reply prominently preserves safe help and end deletion", async ({
  page,
}) => {
  await offline(page);
  await page.route("**/ephemeral/respond", async (route) =>
    route.fulfill({
      json: {
        reply: "지금 도움을 받아요",
        options: [],
        isCrisis: true,
        crisisMessage: "안전을 위해 109로 연락해요",
      },
    }),
  );
  await page.goto("/talk");
  await send(page, "위기 테스트");
  await expect(
    page.getByRole("alert").filter({ hasText: "지금 안전" }),
  ).toContainText("109");
  await page.getByRole("button", { name: "상담 종료 후 원문 지우기" }).click();
  await expect(
    page.getByText("안전을 위해 109로 연락해요", { exact: true }),
  ).toHaveCount(0);
});

test("guest character path requires login before any character counseling", async ({
  page,
}) => {
  await offline(page);
  let requests = 0;
  await page.route("**/ephemeral/respond", async (route) => {
    requests++;
    await route.fulfill({ json: { reply: "blocked" } });
  });
  await page.goto(`/talk?characterId=${id}`);
  await expect(
    page.getByText("캐릭터와 상담하려면 먼저 로그인", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "보내기", exact: true }),
  ).toBeDisabled();
  expect(requests).toBe(0);
  await page.goto("/characters");
  await expect(
    page.getByRole("button", { name: "로그인하고 캐릭터 만들기" }),
  ).toBeVisible();
});

test("character and memories save only after direct approval and support edit and delete", async ({
  page,
}) => {
  await offline(page, true);
  let character: {
    id: string;
    displayName: string;
    style: string;
    memories: Array<{ id: string; kind: string; text: string }>;
  } | null = null;
  const writes: Record<string, unknown>[] = [];
  await page.route("**/characters**", async (route) => {
    if (
      new URL(route.request().url()).origin ===
      new URL(test.info().project.use.baseURL!).origin
    )
      return route.fallback();
    const method = route.request().method();
    const path = new URL(route.request().url()).pathname;
    if (method === "GET")
      return route.fulfill({
        json:
          path === "/characters" ? (character ? [character] : []) : character,
      });
    if (method === "POST" && path === "/characters") {
      character = { id, ...route.request().postDataJSON(), memories: [] };
      return route.fulfill({ json: character });
    }
    if (
      (method === "POST" || method === "PATCH") &&
      path.includes("memories")
    ) {
      const body = route.request().postDataJSON();
      writes.push(body);
      const memory = { id: "memory-1", kind: body.kind, text: body.text };
      character!.memories = [memory];
      return route.fulfill({ json: memory });
    }
    if (method === "DELETE" && path.includes("memories"))
      character!.memories = [];
    else if (method === "DELETE") character = null;
    return route.fulfill({ json: { deleted: true } });
  });
  await page.goto("/characters");
  await page.getByLabel("캐릭터 이름").fill("마음 친구");
  await page
    .getByRole("button", { name: "캐릭터 만들기", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "마음 친구", exact: true }),
  ).toBeVisible();
  await page.getByLabel("기억할 내용").fill("짧고 차분한 답변이 좋아요");
  await expect(
    page.getByRole("button", { name: "확인한 기억 저장" }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "확인한 기억 저장" }).click();
  await expect(
    page.getByText("짧고 차분한 답변이 좋아요", { exact: true }),
  ).toBeVisible();
  expect(writes[0]).toEqual({
    kind: "helpfulApproach",
    text: "짧고 차분한 답변이 좋아요",
    approved: true,
  });
  await page.getByRole("button", { name: "수정", exact: true }).click();
  await page.getByLabel("기억할 내용").fill("공감부터 부탁해요");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "확인한 기억 저장" }).click();
  await expect(
    page.getByText("공감부터 부탁해요", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "기억 삭제", exact: true }).click();
  await expect(
    page.getByText("공감부터 부탁해요", { exact: true }),
  ).toHaveCount(0);
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "캐릭터와 기억 삭제" }).click();
  await expect(page.getByLabel("캐릭터 이름")).toBeVisible();
});

test("legacy URLs redirect without retrieving original sessions", async ({
  page,
}) => {
  await offline(page);
  let oldCalls = 0;
  await page.route("**/chat/**", async (route) => {
    if (
      new URL(route.request().url()).origin ===
      new URL(test.info().project.use.baseURL!).origin
    )
      return route.fallback();
    oldCalls++;
    return route.fulfill({ json: {} });
  });
  await page.goto(`/chat/${id}`);
  await expect(page).toHaveURL("/talk");
  await page.goto("/sessions");
  await expect(page).toHaveURL("/characters");
  expect(oldCalls).toBe(0);
});

test("launch chat focuses on choices and input without response type controls", async ({
  page,
}) => {
  await offline(page);
  const bodies: Array<{
    mode?: string;
    style: string;
    messages: Array<{ role: string; content: string }>;
  }> = [];
  await page.route("**/ephemeral/respond", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({
      json: {
        reply: `대화 답변 ${bodies.length}`,
        options: ["더 이야기할게요"],
      },
    });
  });
  await page.goto("/talk");
  await expect(page.getByLabel("대화 스타일")).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: "원하는 응답 방식" }),
  ).toHaveCount(0);
  await expect(page.locator("button[aria-pressed]")).toHaveCount(0);
  await page
    .getByRole("button", { name: "일 때문에 힘들어요", exact: true })
    .click();
  await expect(page.getByText("대화 답변 1", { exact: true })).toBeVisible();
  await send(page, "직접 이어가는 이야기");
  await expect(page.getByText("대화 답변 2", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "더 이야기할게요", exact: true })
    .click();
  await expect(page.getByText("대화 답변 3", { exact: true })).toBeVisible();
  expect(bodies.map((body) => body.style)).toEqual(["F", "F", "F"]);
  // The server chooses the conversational default, including during staggered deployments.
  for (const body of bodies) expect(body).not.toHaveProperty("mode");
  expect(bodies.map((body) => body.messages.length)).toEqual([1, 3, 5]);
  expect(bodies[2].messages[0]).toEqual({
    role: "user",
    content: "일 때문에 힘들어요",
  });
  expect(bodies[2].messages[2]).toEqual({
    role: "user",
    content: "직접 이어가는 이야기",
  });
});

test("pending request disables choices and duplicate input while end still clears RAM", async ({
  page,
}) => {
  await offline(page);
  let requests = 0,
    release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/ephemeral/respond", async (route) => {
    requests++;
    await delayed;
    await route
      .fulfill({ json: { reply: "늦은 모드 답변", options: [] } })
      .catch(() => {});
  });
  await page.goto("/talk");
  // Two synchronous clicks must still acquire only one in-flight request.
  await page
    .getByRole("button", { name: "일 때문에 힘들어요", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(page.getByRole("status")).toContainText("답변을 준비");
  await expect(
    page.getByRole("button", { name: "일 때문에 힘들어요", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "보내기", exact: true }),
  ).toBeDisabled();
  expect(requests).toBe(1);
  await page.getByRole("button", { name: "상담 종료 후 원문 지우기" }).click();
  release();
  await expect(page.getByText("늦은 모드 답변", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("일 때문에 힘들어요", { exact: true }),
  ).toHaveCount(0);
});

test("choice requests and typed input keep their content without hidden mode switches", async ({
  page,
}) => {
  await offline(page);
  const bodies: Array<{
    mode?: string;
    messages: Array<{ role: string; content: string }>;
  }> = [];
  await page.route("**/ephemeral/respond", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({
      json: {
        reply: `행동 답변 ${bodies.length}`,
        options: ["조언해 주세요", "정리해줘"],
      },
    });
  });
  await page.goto("/talk");
  await page.getByRole("button", { name: "정리해주세요", exact: true }).click();
  await expect(page.getByText("행동 답변 1", { exact: true })).toBeVisible();
  expect(bodies[0]).not.toHaveProperty("mode");
  expect(bodies[0].messages).toEqual([
    { role: "user", content: "정리해주세요" },
  ]);
  await page
    .getByRole("button", { name: "조언해 주세요", exact: true })
    .click();
  await expect(page.getByText("행동 답변 2", { exact: true })).toBeVisible();
  expect(bodies[1]).not.toHaveProperty("mode");
  expect(bodies[1].messages).toHaveLength(3);
  await send(page, "정리해줘라는 말을 들었지만 위로가 필요해요");
  await expect(page.getByText("행동 답변 3", { exact: true })).toBeVisible();
  expect(bodies[2]).not.toHaveProperty("mode");
  expect(bodies[2].messages).toHaveLength(5);
});

test("named AI character renames in settings and updates another talk tab without losing history or memory", async ({
  page,
  context,
}) => {
  await offline(page, true);
  const memory = { id: "memory-1", kind: "style", text: "짧은 설명이 좋아요" };
  const character = {
    id,
    displayName: "마음 친구",
    style: "T",
    memories: [memory],
  };
  const apiBodies: Array<{
    style: string;
    characterId: string;
    messages: Array<{ role: string; content: string }>;
  }> = [];
  const mockIdentity = async (tab: Page) => {
    await tab.route("**/characters**", async (route) => {
      if (
        new URL(route.request().url()).origin ===
        new URL(test.info().project.use.baseURL!).origin
      )
        return route.fallback();
      if (route.request().method() === "PATCH") {
        expect(route.request().postDataJSON()).toEqual({
          displayName: "새 이름",
        });
        character.displayName = route.request().postDataJSON().displayName;
      }
      return route.fulfill({
        json:
          new URL(route.request().url()).pathname === "/characters"
            ? [character]
            : character,
      });
    });
    await tab.route("**/ephemeral/respond", async (route) => {
      apiBodies.push(route.request().postDataJSON());
      return route.fulfill({
        json: {
          reply: `캐릭터 답변 ${apiBodies.length}`,
          options: ["더 이야기할게요"],
          character: {
            id,
            displayName: character.displayName,
            style: character.style,
          },
        },
      });
    });
  };
  await mockIdentity(page);
  await page.goto(`/talk?characterId=${id}`);
  await expect(
    page.getByRole("heading", { name: "마음 친구에게 지금 마음을 이야기해요" }),
  ).toBeVisible();
  await send(page, "보존할 상담 원문");
  await expect(page.getByText("캐릭터 답변 1", { exact: true })).toBeVisible();
  await expect(page.getByText("마음 친구 · AI", { exact: true })).toBeVisible();
  const settings = await context.newPage();
  await offline(settings, true);
  await mockIdentity(settings);
  await settings.goto("/characters");
  await expect(settings.getByText(memory.text, { exact: true })).toBeVisible();
  await settings.getByLabel("새 캐릭터 이름").fill("새 이름");
  await settings
    .getByRole("button", { name: "이름 변경", exact: true })
    .click();
  await expect(
    settings.getByRole("heading", { name: "새 이름", exact: true }),
  ).toBeVisible();
  await expect(settings.getByText(memory.text, { exact: true })).toBeVisible();
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("heading", { name: "새 이름에게 지금 마음을 이야기해요" }),
  ).toBeVisible();
  await expect(
    page.getByText("보존할 상담 원문", { exact: true }),
  ).toBeVisible();
  await send(page, "이어지는 상담 원문");
  await expect(page.getByText("캐릭터 답변 2", { exact: true })).toBeVisible();
  expect(apiBodies[1]).toMatchObject({ style: "T", characterId: id });
  expect(apiBodies[1].messages).toHaveLength(3);
  await expect(page.getByText("새 이름 · AI", { exact: true })).toHaveCount(2);
  await page.screenshot({
    path: "/tmp/to-high-ing-named-character.png",
    fullPage: true,
  });
});

test("HTML-like character names are escaped as text and latest response name updates UI", async ({
  page,
}) => {
  await offline(page, true);
  const displayName = '<img src=x onerror="alert(1)">';
  await page.route(`**/characters/${id}`, async (route) =>
    route.fulfill({ json: { id, displayName, style: "F", memories: [] } }),
  );
  await page.route("**/ephemeral/respond", async (route) =>
    route.fulfill({
      json: {
        reply: "평문 답변",
        options: [],
        character: { id, displayName: "응답 시점 이름", style: "F" },
      },
    }),
  );
  await page.goto(`/talk?characterId=${id}`);
  await expect(
    page.getByRole("heading", {
      name: `${displayName}에게 지금 마음을 이야기해요`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('main img[src="x"]')).toHaveCount(0);
  await expect(page.locator("main [onerror]")).toHaveCount(0);
  await send(page, "이름 테스트");
  await expect(page.getByText("평문 답변", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "응답 시점 이름에게 지금 마음을 이야기해요",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("응답 시점 이름 · AI", { exact: true }),
  ).toBeVisible();
});

test("character lookup failure blocks counseling without default identity fallback and retry resolves owner", async ({
  page,
}) => {
  await offline(page, true);
  let allowLookup = false;
  let responses = 0;
  await page.route(`**/characters/${id}`, async (route) => {
    return route.fulfill(
      !allowLookup
        ? { status: 404, json: {} }
        : {
            json: {
              id,
              displayName: "확인한 캐릭터",
              style: "listening",
              memories: [],
            },
          },
    );
  });
  await page.route("**/ephemeral/respond", async (route) => {
    responses++;
    return route.fulfill({ json: { reply: "경청 답변", options: [] } });
  });
  await page.goto(`/talk?characterId=${id}`);
  await expect(
    page.getByRole("button", { name: "캐릭터 다시 확인" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "일 때문에 힘들어요", exact: true }),
  ).toBeDisabled();
  expect(responses).toBe(0);
  await expect(
    page.getByText("레비 · AI 상담 캐릭터", { exact: true }),
  ).toHaveCount(0);
  allowLookup = true;
  await page.getByRole("button", { name: "캐릭터 다시 확인" }).click();
  await expect(
    page.getByRole("heading", {
      name: "확인한 캐릭터에게 지금 마음을 이야기해요",
    }),
  ).toBeVisible();
});

test("40-character name and brand wrap on a narrow viewport without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await offline(page, true);
  const displayName = "A".repeat(40);
  await page.route(`**/characters/${id}`, async (route) =>
    route.fulfill({ json: { id, displayName, style: "F", memories: [] } }),
  );
  await page.route("**/ephemeral/respond", async (route) =>
    route.fulfill({ json: { reply: "화면 확인 답변", options: [] } }),
  );
  await page.goto(`/talk?characterId=${id}`);
  await expect(
    page.getByRole("heading", {
      name: `${displayName}에게 지금 마음을 이야기해요`,
      exact: true,
    }),
  ).toBeVisible();
  await send(page, "모바일 이름 확인");
  await expect(page.getByText("화면 확인 답변", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/to-high-ing-named-character-mobile.png",
    fullPage: true,
  });
});

test("focus rename during an in-flight response cannot roll the latest character name backward", async ({
  page,
}) => {
  await offline(page, true);
  let displayName = "요청 전 이름";
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/characters/${id}`, async (route) =>
    route.fulfill({ json: { id, displayName, style: "F", memories: [] } }),
  );
  await page.route("**/ephemeral/respond", async (route) => {
    const oldName = displayName;
    await delayed;
    return route.fulfill({
      json: {
        reply: "늦은 상담 답변",
        options: [],
        character: { id, displayName: oldName, style: "F" },
      },
    });
  });
  await page.goto(`/talk?characterId=${id}`);
  await expect(
    page.getByRole("heading", {
      name: "요청 전 이름에게 지금 마음을 이야기해요",
    }),
  ).toBeVisible();
  await send(page, "이름 변경 중에도 유지할 원문");
  await expect(page.getByRole("status")).toContainText("답변을 준비");
  displayName = "새로 확인한 이름";
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("heading", {
      name: "새로 확인한 이름에게 지금 마음을 이야기해요",
    }),
  ).toBeVisible();
  release();
  await expect(page.getByText("늦은 상담 답변", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "새로 확인한 이름에게 지금 마음을 이야기해요",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("이름 변경 중에도 유지할 원문", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("새로 확인한 이름 · AI", { exact: true }),
  ).toBeVisible();
});

test("malformed character query cannot traverse an API path or trigger OAuth", async ({
  page,
}) => {
  await offline(page, true);
  const requests: string[] = [];
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (
      new URL(url).origin !== new URL(test.info().project.use.baseURL!).origin
    )
      requests.push(new URL(url).pathname);
    return route.fallback();
  });
  await page.goto(`/talk?characterId=${encodeURIComponent("../auth/google")}`);
  await expect(
    page.getByRole("button", { name: "캐릭터 다시 확인" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "일 때문에 힘들어요", exact: true }),
  ).toBeDisabled();
  expect(
    requests.filter(
      (path) =>
        path !== "/auth/me" && !path.endsWith("/pretendardvariable.min.css"),
    ),
  ).toEqual([]);
});

test("Levi original image loads on landing and guest counseling", async ({
  page,
}) => {
  await offline(page);
  await page.goto("/");
  await expect(page).toHaveTitle("위로 | AI 심리 상담");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "레비에게 마음을 털어놔보세요",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "위로", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(
      "내 상황을 이해하는 AI 상담사 '레비'",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "지금, 레비와 이야기해볼까요?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "나만의 레비", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("어떤 대화 방식을 선호하세요?", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("그냥 위로받고 싶어요", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("정리되지 않은 말이어도 괜찮아요.", { exact: true }),
  ).toHaveCount(0);
  const primaryCta = page.getByRole("link", { name: "레비와 대화 시작하기", exact: true }).first();
  await expect(primaryCta).toHaveCSS("color", "rgb(255, 255, 255)");
  const hero = page.getByRole("img", { name: "레비 AI 캐릭터" });
  await expect
    .poll(() =>
      hero.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect
    .poll(() =>
      page
        .locator("main img")
        .evaluateAll((images) =>
          images
            .filter((image) => image.getClientRects().length > 0)
            .every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page.screenshot({
    path: "/tmp/levi-landing-restored-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/levi-landing-restored-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({
    path: "/tmp/to-high-ing-levi-landing.png",
    fullPage: true,
  });
  await expect(
    page.locator("section.final").getByRole("link", { name: "레비와 대화 시작하기", exact: true }),
  ).toHaveAttribute("href", "/talk");
  await page.locator("section.final").screenshot({
    path: "/tmp/levi-conversation-invite.png",
  });
  await primaryCta.click();
  await expect(
    page.getByRole("heading", {
      name: "레비에게 지금 마음을 이야기해요",
      exact: true,
    }),
  ).toBeVisible();
  const avatar = page.getByRole("img", { name: "레비 AI 캐릭터" }).first();
  await expect
    .poll(() =>
      avatar.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.screenshot({
    path: "/tmp/to-high-ing-levi-talk.png",
    fullPage: true,
  });
});

test("Levi creation default preserves existing custom names", async ({
  page,
}) => {
  await offline(page, true);
  await page.goto("/characters");
  await expect(page.getByLabel("캐릭터 이름", { exact: true })).toHaveValue(
    "레비",
  );
  await page.route("http://127.0.0.1:3999/characters", (route) =>
    route.fulfill({
      json: [{ id, displayName: "내 이름", style: "F", memories: [] }],
    }),
  );
  await page.route(`**/characters/${id}`, (route) =>
    route.fulfill({
      json: { id, displayName: "내 이름", style: "F", memories: [] },
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "내 이름", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "내 이름 AI 캐릭터" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "이 캐릭터와 상담하기" }).click();
  await expect(
    page.getByRole("heading", {
      name: "내 이름에게 지금 마음을 이야기해요",
      exact: true,
    }),
  ).toBeVisible();
});

test("character state feedback preserves keyboard focus and reduced-motion semantics", async ({
  page,
}) => {
  await offline(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  let pending: import("@playwright/test").Route | undefined;
  await page.route("**/ephemeral/respond", (route) => {
    pending = route;
  });
  await page.goto("/talk");
  const presence = page.locator('[aria-label="AI 캐릭터 상태"]');
  const input = page.getByLabel("전하고 싶은 마음");
  await expect(presence).toHaveAttribute("data-character-state", "idle");
  await input.fill("마음을 적고 있어요");
  await expect(presence).toHaveAttribute("data-character-state", "listening");
  const option = page.getByRole("button", {
    name: "일 때문에 힘들어요",
    exact: true,
  });
  await option.focus();
  await page.keyboard.press("Enter");
  await expect(presence).toHaveAttribute("data-character-state", "thinking");
  await expect(page.getByRole("status")).toHaveCount(1);
  await expect.poll(() => !!pending).toBe(true);
  await pending!.fulfill({
    json: { reply: "상태 모의 답변", options: ["더 이야기할게요"] },
  });
  await expect(presence).toHaveAttribute("data-character-state", "arrived");
  await expect(input).toBeFocused();
  await expect(
    page.getByRole("log", { name: "현재 상담 대화" }),
  ).toHaveAttribute("aria-live", "polite");
  await expect(page.locator('article img[aria-hidden="true"]')).toHaveAttribute(
    "alt",
    "",
  );
  expect(
    await presence
      .locator('img[aria-hidden="false"]')
      .evaluate((img) => getComputedStyle(img).animationName),
  ).toBe("none");
  await page.screenshot({
    path: "/tmp/levi-presence-desktop.png",
    fullPage: true,
  });
  await expect(page.getByText("상태 모의 답변", { exact: true })).toBeVisible();
  await page.waitForTimeout(1900);
  await expect(presence).toHaveAttribute("data-character-state", "idle");
  await input.fill("실패 입력");
  await page.getByRole("button", { name: "보내기", exact: true }).click();
  await expect(presence).toHaveAttribute("data-character-state", "thinking");
  await expect
    .poll(() => pending!.request().postDataJSON().messages.at(-1).content)
    .toBe("실패 입력");
  await pending!.fulfill({ status: 503, json: {} });
  await expect(presence).toHaveAttribute("data-character-state", "error");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("실패 입력");
  await page.getByRole("button", { name: "상담 종료 후 원문 지우기" }).click();
  await expect(presence).toHaveAttribute("data-character-state", "ended");
  await expect(page.locator("article")).toHaveCount(0);
  await page.waitForTimeout(1900);
  await expect(presence).toHaveAttribute("data-character-state", "ended");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/levi-presence-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Levi expression assets switch without layout jumps and use finite motion", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    reducedMotion: "no-preference",
    recordVideo: {
      dir: "/tmp/levi-expression-video",
      size: { width: 1280, height: 720 },
    },
  });
  const page = await context.newPage();
  try {
    await offline(page);
    let pending: import("@playwright/test").Route | undefined;
    await page.route("**/ephemeral/respond", (route) => {
      pending = route;
    });
    await page.goto("/talk");
    const presence = page.locator('[aria-label="AI 캐릭터 상태"]');
    const active = presence.locator('img[aria-hidden="false"]');
    await expect
      .poll(() =>
        presence
          .locator("img")
          .evaluateAll(
            (images) =>
              images.length === 4 &&
              images.every(
                (image) => (image as HTMLImageElement).naturalWidth > 0,
              ),
          ),
      )
      .toBe(true);
    const frame = await active.boundingBox();
    async function check(visual: string, file: string, animated: boolean) {
      await expect(presence).toHaveAttribute("data-character-visual", visual);
      expect(decodeURIComponent((await active.getAttribute("src"))!)).toContain(
        `/characters/${file}`,
      );
      await expect(active).toHaveCSS("width", "64px");
      await expect(active).toHaveCSS("height", "64px");
      const current = await active.boundingBox();
      // The fixed canvas occupies the same space; transforms can change the painted bounds.
      const canvas = await active.locator("..").boundingBox();
      expect(canvas!.width).toBe(64);
      expect(canvas!.height).toBe(64);
      if (page.viewportSize()!.width === 1280)
        expect(Math.abs(current!.x - frame!.x)).toBeLessThan(5);
      const animation = await active.evaluate((img) => ({
        name: getComputedStyle(img).animationName,
        iterations: getComputedStyle(img).animationIterationCount,
      }));
      expect(animation.name === "none").toBe(!animated);
      expect(animation.iterations).not.toContain("infinite");
    }
    await check("idle", "levi.png", false);
    await page.getByLabel("전하고 싶은 마음").fill("짧은 입력");
    await check("listening", "levi-listening.png", true);
    await page.screenshot({
      path: "/tmp/levi-expression-listening.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "일 때문에 힘들어요", exact: true })
      .click();
    await check("thinking", "levi-thinking.png", true);
    await expect.poll(() => !!pending).toBe(true);
    await page.screenshot({
      path: "/tmp/levi-expression-thinking.png",
      fullPage: true,
    });
    await pending!.fulfill({
      json: {
        reply: "모의 답변이 모두 도착했어요.",
        options: ["더 이야기할게요"],
      },
    });
    await check("responding", "levi-responding.png", true);
    await page.screenshot({
      path: "/tmp/levi-expression-responding.png",
      fullPage: true,
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(active).toHaveCSS("animation-name", "none");
    await expect(active).toHaveCSS("transition-property", "none");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "/tmp/levi-expression-mobile.png",
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.waitForTimeout(1900);
    await expect(presence).toHaveAttribute("data-character-state", "idle");
    await expect(presence).toHaveAttribute("data-character-visual", "idle");
    await page.getByRole("button", { name: "상담 종료 후 원문 지우기" }).click();
    await check("idle", "levi.png", false);
    await page.waitForTimeout(1900);
    await expect(presence).toHaveAttribute("data-character-state", "ended");
    await expect(presence).toHaveAttribute("data-character-visual", "idle");
  } finally {
    await context.close();
  }
});

for (const loggedIn of [false, true]) {
  test(`unreleased memory entry points stay hidden (${loggedIn ? "signed in" : "guest"})`, async ({ page }) => {
    await offline(page, loggedIn);
    let characterReads = 0;
    await page.route("**/characters**", async (route) => {
      if (new URL(route.request().url()).origin === new URL(test.info().project.use.baseURL!).origin) {
        return route.continue();
      }
      characterReads++;
      return route.fulfill({ json: [] });
    });
    await page.goto("/");
    await expect(page.locator(".features .feature")).toHaveCount(2);
    await expect(page.getByText("기억은 내가 정해요", { exact: true })).toHaveCount(0);
    await expect(page.locator('a[href="/characters"]')).toHaveCount(0);
    await expect(page.getByText("나만의 레비", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "로그인", exact: true })).toHaveCount(loggedIn ? 0 : 1);
    await page.goto("/characters");
    await expect(page.getByRole("heading", { name: "이 기능은 준비 중이에요" })).toBeVisible();
    await expect(page.getByRole("button", { name: /기억.*저장|캐릭터 만들기/ })).toHaveCount(0);
    await page.getByRole("link", { name: "레비와 대화 시작하기", exact: true }).first().click();
    await expect(page.getByLabel("전하고 싶은 마음")).toBeVisible();
    await expect(page.getByText(/기억 설정|기억 만들기/)).toHaveCount(0);
    await page.goto(`/talk?characterId=${id}`);
    await expect(page.getByLabel("전하고 싶은 마음")).toBeEnabled();
    let body: Record<string, unknown> | undefined;
    await page.route("**/ephemeral/respond", async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ json: { reply: "잘 들었어요", options: ["더 이야기할게요"] } });
    });
    await send(page, "일반 상담 확인");
    await expect(page.getByText("잘 들었어요", { exact: true })).toBeVisible();
    expect(body?.characterId).toBeUndefined();
    expect(characterReads).toBe(0);
  });
}

test("assistant Markdown uses plain text emphasis while preserving lists and safe links", async ({ page }) => {
  await offline(page);
  let externalImages = 0;
  await page.route("https://example.invalid/**", async (route) => {
    externalImages++;
    await route.abort();
  });
  await page.route("**/ephemeral/respond", (route) =>
    route.fulfill({
      json: {
        reply: [
          "**천천히** *편하게* `짧게` 이야기해요.",
          "- 첫 번째 이야기\n- 두 번째 이야기",
          "[도움 안내](https://example.org/help)",
          "![마음 그림](https://example.invalid/private.png)",
        ].join("\n\n"),
        options: ["계속 이야기할게요"],
      },
    }),
  );
  await page.goto("/talk");
  const userInput = "**그대로** *남겨요*";
  await send(page, userInput);
  await expect(page.locator("article.user")).toContainText(userInput);
  const reply = page.locator("article .ch-bubble.ai");
  const paragraph = reply.locator("p.ch-md-p").first();
  await expect(paragraph).toHaveText("천천히 편하게 짧게 이야기해요.");
  await expect(reply.locator("strong, em, code, .ch-md-strong, .ch-md-code")).toHaveCount(0);
  await expect(paragraph).toHaveCSS("font-weight", "400");
  await expect(paragraph).toHaveCSS("font-style", "normal");
  await expect(paragraph).toHaveCSS(
    "color",
    await reply.evaluate((element) => getComputedStyle(element).color),
  );
  await expect(reply.getByRole("listitem")).toHaveText([
    "첫 번째 이야기",
    "두 번째 이야기",
  ]);
  await expect(reply.getByRole("link", { name: "도움 안내" })).toHaveAttribute("href", "https://example.org/help");
  await expect(reply).toContainText("마음 그림");
  await expect(page.locator('article img[src*="example.invalid"]')).toHaveCount(0);
  expect(externalImages).toBe(0);
});
