import type { CounselorType } from "./api";
import {
  CHAT_ERROR_COPY,
  ChatRequestError,
  type ChatErrorCode,
} from "./chat-errors";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
export type ResponseMode =
  | "conversation"
  | "comfort"
  | "listen"
  | "organize"
  | "validate"
  | "direction"
  | "similar";
export type TalkMessage = { role: "user" | "assistant"; content: string };
export type CharacterMemory = { id: string; kind: string; text: string };
export type Character = {
  id: string;
  displayName: string;
  style: CounselorType;
  memories?: CharacterMemory[];
};
async function request<T>(
  path: string,
  token?: string | null,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok)
    throw new Error("요청을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.");
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
type TalkResult = {
  character?: Pick<Character, "id" | "displayName" | "style">;
  reply: string;
  options?: string[];
  context?: { summary: string; retainedMessages: number };
};

function isReplyOptions(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 8 &&
    value.every((option) => typeof option === "string" && option.length <= 500)
  );
}

function isCompactContext(
  value: unknown,
  count: number,
): value is NonNullable<TalkResult["context"]> {
  return (
    !!value &&
    typeof value === "object" &&
    "summary" in value &&
    typeof value.summary === "string" &&
    !!value.summary.trim() &&
    value.summary.length <= 2000 &&
    "retainedMessages" in value &&
    typeof value.retainedMessages === "number" &&
    Number.isInteger(value.retainedMessages) &&
    value.retainedMessages > 0 &&
    value.retainedMessages % 2 === 1 &&
    value.retainedMessages <= count
  );
}

// Content negotiation keeps JSON clients and staggered API releases compatible.
export async function respondEphemeral(
  messages: TalkMessage[],
  style: CounselorType,
  token: string | null,
  signal: AbortSignal,
  characterId?: string,
  mode?: ResponseMode,
  summary?: string,
  onText?: (text: string) => void,
): Promise<TalkResult> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) controller.abort();
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    controller.abort();
  }, 40_000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let text = "";
  try {
    const response = await fetch(`${API_URL}/ephemeral/respond`, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        messages,
        style,
        ...(summary ? { summary } : {}),
        ...(mode ? { mode } : {}),
        ...(characterId ? { characterId } : {}),
      }),
    });
    if (!response.ok) {
      const statusCode: ChatErrorCode =
        response.status === 429
          ? "RATE_LIMITED"
          : response.status === 401 || response.status === 403
            ? "AUTH_REQUIRED"
            : response.status === 400 || response.status === 413
              ? "INVALID_INPUT"
              : "UNAVAILABLE";
      let code: ChatErrorCode = statusCode;
      try {
        const payload: unknown = await response.json();
        if (
          payload &&
          typeof payload === "object" &&
          "code" in payload &&
          typeof payload.code === "string" &&
          Object.hasOwn(CHAT_ERROR_COPY, payload.code)
        )
          code = payload.code as ChatErrorCode;
      } catch {
        /* Only allowlisted codes, never provider error text. */
      }
      throw new ChatRequestError(code);
    }
    if (!response.headers.get("content-type")?.includes("text/event-stream")) {
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new ChatRequestError("UNAVAILABLE");
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("reply" in payload) ||
        typeof payload.reply !== "string" ||
        !payload.reply.trim() ||
        payload.reply.length > 2000
      )
        throw new ChatRequestError("UNAVAILABLE");
      const result: TalkResult = { reply: payload.reply };
      if ("options" in payload) {
        if (!isReplyOptions(payload.options))
          throw new ChatRequestError("UNAVAILABLE");
        result.options = payload.options;
      }
      if ("context" in payload) {
        if (!isCompactContext(payload.context, messages.length))
          throw new ChatRequestError("UNAVAILABLE");
        result.context = payload.context;
      }
      if ("character" in payload)
        result.character = payload.character as TalkResult["character"];
      return result;
    }
    if (!response.body) throw new ChatRequestError("UNAVAILABLE");
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "",
      complete = false,
      replyComplete = false;
    const result: TalkResult = { reply: "" };
    const event = (frame: string) => {
      const data = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) return; // Heartbeats carry no user data.
      let item: unknown;
      try {
        item = JSON.parse(data);
      } catch {
        throw new ChatRequestError("INTERRUPTED");
      }
      if (!item || typeof item !== "object" || !("type" in item))
        throw new ChatRequestError("INTERRUPTED");
      if (
        item.type === "delta" &&
        "text" in item &&
        typeof item.text === "string"
      ) {
        if (replyComplete || text.length + item.text.length > 2000)
          throw new ChatRequestError("INTERRUPTED");
        text += item.text;
        onText?.(text);
      } else if (
        item.type === "reply" &&
        "reply" in item &&
        typeof item.reply === "string" &&
        item.reply.trim() &&
        item.reply.length <= 2000
      ) {
        replyComplete = true;
        text = item.reply;
        result.reply = text;
        onText?.(text);
        if ("character" in item)
          result.character = item.character as TalkResult["character"];
      } else if (
        item.type === "options" &&
        "options" in item &&
        isReplyOptions(item.options)
      ) {
        result.options = item.options;
      } else if (
        item.type === "context" &&
        !replyComplete &&
        !text &&
        isCompactContext(item, messages.length)
      ) {
        result.context = {
          summary: item.summary,
          retainedMessages: item.retainedMessages,
        };
      } else if (
        item.type === "error" &&
        "code" in item &&
        typeof item.code === "string" &&
        Object.hasOwn(CHAT_ERROR_COPY, item.code)
      ) {
        throw new ChatRequestError(item.code as ChatErrorCode);
      } else if (item.type === "done" && replyComplete) complete = true;
      else throw new ChatRequestError("INTERRUPTED");
    };
    while (!complete) {
      const chunk = await reader.read();
      buffer = (
        buffer + decoder.decode(chunk.value, { stream: !chunk.done })
      ).replace(/\r\n/g, "\n");
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        event(frame);
        if (complete) break;
      }
      // Bound only an unfinished frame; a network chunk may contain many valid frames.
      if (buffer.length > 32_000) throw new ChatRequestError("INTERRUPTED");
      if (chunk.done) break;
    }
    if (!complete || !replyComplete) throw new ChatRequestError("INTERRUPTED");
    return result;
  } catch (error) {
    if (signal.aborted) throw error;
    if (error instanceof ChatRequestError) throw error;
    throw new ChatRequestError(
      text ? "INTERRUPTED" : expired ? "TIMEOUT" : "NETWORK",
    );
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
    await reader?.cancel().catch(() => {});
  }
}
export const listCharacters = (token: string) =>
  request<Character[]>("/characters", token);
export const getCharacter = (id: string, token: string, signal?: AbortSignal) =>
  request<Character>(`/characters/${encodeURIComponent(id)}`, token, {
    signal,
  });
export const renameCharacter = (
  id: string,
  displayName: string,
  token: string,
) =>
  request<Character>(`/characters/${encodeURIComponent(id)}`, token, {
    method: "PATCH",
    body: JSON.stringify({ displayName }),
  });
export const createCharacter = (
  displayName: string,
  style: CounselorType,
  token: string,
) =>
  request<Character>("/characters", token, {
    method: "POST",
    body: JSON.stringify({ displayName, style }),
  });
export const saveMemory = (
  id: string,
  kind: string,
  text: string,
  token: string,
  memoryId?: string,
) =>
  request<Character>(
    `/characters/${encodeURIComponent(id)}/memories${memoryId ? `/${encodeURIComponent(memoryId)}` : ""}`,
    token,
    {
      method: memoryId ? "PATCH" : "POST",
      body: JSON.stringify({ kind, text, approved: true }),
    },
  );
export const deleteMemory = (id: string, memoryId: string, token: string) =>
  request<Character>(
    `/characters/${encodeURIComponent(id)}/memories/${encodeURIComponent(memoryId)}`,
    token,
    {
      method: "DELETE",
    },
  );
export const deleteCharacter = (id: string, token: string) =>
  request<{ deleted: boolean }>(
    `/characters/${encodeURIComponent(id)}`,
    token,
    {
      method: "DELETE",
    },
  );
