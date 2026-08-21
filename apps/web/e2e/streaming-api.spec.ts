import { afterEach, expect, test } from "@playwright/test";
import {
  selectOptionStream,
  sendMessageStream,
  setResponseModeStream,
} from "../src/lib/api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockSseResponse(chunks: string[]) {
  globalThis.fetch = async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });

    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  };
}

test.describe("스트리밍 API 오류 처리", () => {
  for (const [name, invoke] of [
    [
      "선택지",
      () => selectOptionStream("session", "선택", undefined, () => {}),
    ],
    [
      "응답 모드",
      () => setResponseModeStream("session", "comfort", undefined),
    ],
    [
      "메시지",
      () => sendMessageStream("session", "안녕하세요", undefined),
    ],
  ] as const) {
    test(`${name} 스트림의 error 이벤트를 호출자에게 전파한다`, async () => {
      mockSseResponse([
        'data: {"error":"이미 처리 중인 요청이 있어요."}\n\n',
      ]);

      await expect(invoke()).rejects.toThrow("이미 처리 중인 요청이 있어요.");
    });
  }

  test("분할된 SSE 메시지를 다음 reader 청크와 이어서 처리한다", async () => {
    mockSseResponse([
      'data: {"cont',
      'ent":"안녕하세요"}\n\ndata: {"done":true}\n\n',
    ]);

    await expect(
      sendMessageStream("session", "안녕하세요", undefined),
    ).resolves.toBe("안녕하세요");
  });

  test("파싱할 수 없는 이벤트만 건너뛰고 다음 정상 이벤트는 처리한다", async () => {
    const received: unknown[] = [];
    mockSseResponse([
      "data: not-json\n\n",
      'data: {"type":"next","question":"다음 질문","done":false}\n\n',
    ]);

    await selectOptionStream("session", "선택", undefined, (event) => {
      received.push(event);
    });

    expect(received).toEqual([
      { type: "next", question: "다음 질문", done: false },
    ]);
  });
});
