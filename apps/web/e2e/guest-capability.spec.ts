import { expect, test } from "@playwright/test";
import {
  startSession,
  getSessionDetail,
  claimSession,
  selectOptionStream,
  sendMessageStream,
  setResponseModeStream,
} from "../src/lib/api";
const id = "507f1f77bcf86cd799439011",
  token = "a".repeat(64);
const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  "localStorage",
);
test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, descriptor] of [
    ["window", originalWindow],
    ["localStorage", originalStorage],
  ] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});
test("stores proof per session, attaches it to HTTP/SSE, removes it after claim", async () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
  });
  const calls: Array<{ url: string; headers: Headers }> = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), headers: new Headers(init?.headers) });
    if (String(url).endsWith("/chat/start"))
      return Response.json({
        sessionId: id,
        guestAccessToken: token,
        question: "mock",
        options: [],
      });
    if (String(url).endsWith("/claim")) return Response.json({ claimed: true });
    if (String(url).endsWith("/stream"))
      return new Response('data: {"done":true}\n\n', {
        headers: { "Content-Type": "text/event-stream" },
      });
    return Response.json({ context: [] });
  };
  const started = await startSession("daily");
  expect(started).not.toHaveProperty("guestAccessToken");
  await getSessionDetail(id, '');
  await selectOptionStream(id, "힘들어요", undefined, () => {});
  await sendMessageStream(id, "힘들어요", undefined, () => {});
  await setResponseModeStream(id, "comfort", undefined, () => {});
  for (const call of calls.slice(1))
    expect(call.headers.get("X-Guest-Token")).toBe(token);
  await getSessionDetail("507f1f77bcf86cd799439012", "");
  expect(calls.at(-1)?.headers.get("X-Guest-Token")).toBeNull();
  await claimSession(id, "mock-jwt");
  expect(calls.at(-1)?.headers.get("X-Guest-Token")).toBe(token);
  expect(calls.at(-1)?.headers.get("Authorization")).toBe("Bearer mock-jwt");
  expect(data.has(`guestSession:${id}`)).toBe(false);
});
