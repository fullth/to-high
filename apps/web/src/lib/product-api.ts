import type { CounselorType } from "./api";
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
export function respondEphemeral(
  messages: TalkMessage[],
  style: CounselorType,
  token: string | null,
  signal: AbortSignal,
  characterId?: string,
  mode?: ResponseMode,
) {
  return request<{
    character?: Pick<Character, "id" | "displayName" | "style">;
    reply: string;
    options?: string[];
    isCrisis?: boolean;
    crisisMessage?: string;
  }>("/ephemeral/respond", token, {
    method: "POST",
    signal,
    body: JSON.stringify({
      messages,
      style,
      ...(mode ? { mode } : {}),
      ...(characterId ? { characterId } : {}),
    }),
  });
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
