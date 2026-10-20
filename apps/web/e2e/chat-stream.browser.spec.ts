import { expect, test, type Page } from "@playwright/test";
import { createServer, type Server, type ServerResponse } from "node:http";
import { CHAT_ERROR_COPY } from "../src/lib/chat-errors";

type Body = {
  messages: Array<{ role: string; content: string }>;
  summary?: string;
};
let server: Server;
let handler: (body: Body, response: ServerResponse) => void;
let fixtureOrigin: string;

function event(response: ServerResponse, payload: object) {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}
function open(response: ServerResponse) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Access-Control-Allow-Origin": "*",
  });
  response.flushHeaders();
}
function finish(response: ServerResponse, reply = "잘 들었어요") {
  event(response, { type: "reply", reply });
  event(response, { type: "options", options: ["계속 이야기할게요"] });
  event(response, { type: "done" });
  response.end();
}
async function send(page: Page, text: string) {
  await page.getByLabel("전하고 싶은 마음").fill(text);
  await page.getByRole("button", { name: "보내기", exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  server = createServer((request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      });
      response.end();
      return;
    }
    let raw = "";
    request.on("data", (chunk) => {
      raw += String(chunk);
    });
    request.on("end", () => handler(JSON.parse(raw) as Body, response));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("fixture unavailable");
  fixtureOrigin = `http://127.0.0.1:${address.port}`;
  // Replace only the provider address, preserving the real fetch/SSE parser and UI.
  await page.addInitScript((origin) => {
    const fetch = window.fetch.bind(window);
    window.fetch = (input, init) =>
      fetch(
        typeof input === "string" && input.endsWith("/ephemeral/respond")
          ? `${origin}/ephemeral/respond`
          : input,
        init,
      );
  }, fixtureOrigin);
  const appOrigin = new URL(test.info().project.use.baseURL!).origin;
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.origin === appOrigin || url.origin === fixtureOrigin
      ? route.continue()
      : route.abort();
  });
});
test.afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test("partial text is visible before reply choices finish, including split UTF-8 and CRLF", async ({
  page,
}) => {
  let active: ServerResponse | undefined;
  handler = (_body, response) => {
    active = response;
    open(response);
    const frame = Buffer.from(
      `data: ${JSON.stringify({ type: "delta", text: "먼저 도착한 이야기" })}\r\n\r\n`,
    );
    response.write(frame.subarray(0, 33));
    setTimeout(() => response.write(frame.subarray(33, frame.length - 1)), 10);
    setTimeout(() => response.write(frame.subarray(frame.length - 1)), 25);
  };
  await page.goto("/talk");
  await send(page, "합성 입력");
  await expect(
    page.getByText("먼저 도착한 이야기", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "보내기", exact: true }),
  ).toBeDisabled();
  finish(active!, "먼저 도착한 이야기, 이어지는 답변");
  await expect(
    page.getByText("먼저 도착한 이야기, 이어지는 답변", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "계속 이야기할게요", exact: true }),
  ).toBeEnabled();
});

test("summary keeps a long conversation going while the visible transcript stays in RAM only", async ({
  page,
}) => {
  const bodies: Body[] = [];
  handler = (body, response) => {
    bodies.push(body);
    open(response);
    if (body.messages.length >= 13)
      event(response, {
        type: "context",
        summary: "앞서 말한 일 때문에 피곤하며 경청을 원함",
        retainedMessages: 5,
      });
    finish(response, `합성 답변 ${bodies.length}`);
  };
  await page.goto("/talk");
  for (let i = 1; i <= 16; i++) {
    await send(page, `합성 이야기 ${i}`);
    await expect(
      page.getByText(`합성 답변 ${i}`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "계속 이야기할게요", exact: true }),
    ).toBeEnabled();
  }
  expect(Math.max(...bodies.map((body) => body.messages.length))).toBe(13);
  expect(bodies[7].summary).toBe("앞서 말한 일 때문에 피곤하며 경청을 원함");
  expect(
    bodies[7].messages.some((message) => message.content === "합성 이야기 1"),
  ).toBe(false);
  await expect(page.getByText("합성 이야기 1", { exact: true })).toHaveCount(1);
  await expect(
    page.getByRole("region", { name: "대화 맥락 한도" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => ({
      local: JSON.stringify(localStorage),
      session: JSON.stringify(sessionStorage),
    })),
  ).toEqual({ local: "{}", session: "{}" });
  await page.reload();
  await expect(page.getByText("합성 이야기 1", { exact: true })).toHaveCount(0);
  await send(page, "새로고침 후");
  await expect(page.getByText("합성 답변 17", { exact: true })).toBeVisible();
  expect(bodies[16]).not.toHaveProperty("summary");
  expect(bodies[16].messages).toEqual([
    { role: "user", content: "새로고침 후" },
  ]);
  await page.getByRole("button", { name: "상담 종료 후 원문 지우기" }).click();
  await page.getByRole("button", { name: "새 상담 시작", exact: true }).click();
  await send(page, "처음부터");
  await expect(page.getByText("합성 답변 18", { exact: true })).toBeVisible();
  expect(bodies[17]).not.toHaveProperty("summary");
  expect(bodies[17].messages).toEqual([{ role: "user", content: "처음부터" }]);
});

test("an interrupted stream restores input and excludes partial text from the next request", async ({
  page,
}) => {
  let first: ServerResponse | undefined;
  const bodies: Body[] = [];
  handler = (body, response) => {
    bodies.push(body);
    open(response);
    if (bodies.length === 1) {
      first = response;
      event(response, { type: "delta", text: "미완성 답변" });
    } else finish(response, "다시 받은 답변");
  };
  await page.goto("/talk");
  await send(page, "다시 보낼 입력");
  await expect(page.getByText("미완성 답변", { exact: true })).toBeVisible();
  first!.end(); // End without a reply/done boundary.
  await expect(page.locator(".ch-talk-error")).toHaveText(
    CHAT_ERROR_COPY.INTERRUPTED,
  );
  await expect(page.getByLabel("전하고 싶은 마음")).toHaveValue(
    "다시 보낼 입력",
  );
  await expect(page.getByText("미완성 답변", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "보내기", exact: true }).click();
  await expect(page.getByText("다시 받은 답변", { exact: true })).toBeVisible();
  expect(bodies[1].messages).toEqual([
    { role: "user", content: "다시 보낼 입력" },
  ]);
});

for (const [code, status] of [
  ["RATE_LIMITED", 429],
  ["BUSY", 429],
  ["AUTH_REQUIRED", 401],
  ["INVALID_INPUT", 400],
  ["UNAVAILABLE", 503],
  ["TIMEOUT", 200],
  ["SUMMARY_FAILED", 200],
] as const) {
  test(`approved ${code} copy preserves the input`, async ({ page }) => {
    handler = (_body, response) => {
      if (status === 200) {
        open(response);
        event(response, { type: "error", code });
        response.end();
      } else {
        response.writeHead(status, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({ code, message: "private-provider-error-marker" }),
        );
      }
    };
    await page.goto("/talk");
    await send(page, "보존할 초안");
    await expect(page.locator(".ch-talk-error")).toContainText(
      CHAT_ERROR_COPY[code],
    );
    await expect(page.getByLabel("전하고 싶은 마음")).toHaveValue(
      "보존할 초안",
    );
    await expect(page.getByText("private-provider-error-marker")).toHaveCount(
      0,
    );
    if (code === "SUMMARY_FAILED") {
      await page
        .getByRole("button", { name: "새 상담 시작", exact: true })
        .click();
      await expect(page.getByLabel("전하고 싶은 마음")).toHaveValue("");
    }
  });
}

test("a silent network has a client deadline and uses approved timeout copy", async ({
  page,
}) => {
  await page.clock.install();
  handler = (_body, response) => {
    open(response);
    response.write(": waiting\n\n");
  };
  await page.goto("/talk");
  await send(page, "연결 대기");
  await page.clock.fastForward(40_001);
  await expect(page.locator(".ch-talk-error")).toContainText(
    CHAT_ERROR_COPY.TIMEOUT,
  );
  await expect(page.getByLabel("전하고 싶은 마음")).toHaveValue("연결 대기");
});

test("network failure uses approved connection copy", async ({ page }) => {
  handler = (_body, response) => response.destroy();
  await page.goto("/talk");
  await send(page, "네트워크 재시도");
  await expect(page.locator(".ch-talk-error")).toHaveText(
    CHAT_ERROR_COPY.NETWORK,
  );
  await expect(page.getByLabel("전하고 싶은 마음")).toHaveValue(
    "네트워크 재시도",
  );
});

test("invalid successful JSON uses service-error copy instead of breaking the chat", async ({
  page,
}) => {
  handler = (_body, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ reply: "본문", options: "invalid-list" }));
  };
  await page.goto("/talk");
  await send(page, "보존할 내용");
  await expect(page.locator(".ch-talk-error")).toContainText(
    CHAT_ERROR_COPY.UNAVAILABLE,
  );
  await expect(page.getByLabel("전하고 싶은 마음")).toHaveValue("보존할 내용");
});

test("mobile error and retry input stay usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  handler = (_body, response) => {
    open(response);
    event(response, { type: "error", code: "RATE_LIMITED" });
    response.end();
  };
  await page.goto("/talk");
  await send(page, "오늘 조금 지쳤어요");
  await expect(page.locator(".ch-talk-error")).toContainText(
    CHAT_ERROR_COPY.RATE_LIMITED,
  );
  await expect(page.getByLabel("전하고 싶은 마음")).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/workspace/artifacts/chat-streaming/mobile-error.png",
  });
});

test("ending an active stream clears raw text and summary without late resurrection", async ({
  page,
}) => {
  let active: ServerResponse | undefined;
  handler = (_body, response) => {
    active = response;
    open(response);
    event(response, {
      type: "context",
      summary: "합성 요약 비밀",
      retainedMessages: 1,
    });
    event(response, { type: "delta", text: "늦은 대화 일부" });
  };
  await page.goto("/talk");
  await send(page, "지울 원문");
  await expect(page.getByText("늦은 대화 일부", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "상담 종료 후 원문 지우기" }).click();
  if (!active!.destroyed) finish(active!, "늦은 완성 답변");
  await expect(page.getByText("지울 원문", { exact: true })).toHaveCount(0);
  await expect(page.getByText("늦은 완성 답변", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "새 상담 시작", exact: true }),
  ).toBeVisible();
});
