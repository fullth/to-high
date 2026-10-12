"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { CHARACTER_MEMORY_AVAILABLE } from "@/lib/product-features";
import {
  listCharacters,
  getCharacter,
  createCharacter,
  renameCharacter,
  saveMemory,
  deleteMemory,
  deleteCharacter,
  type Character,
  type CharacterMemory,
} from "@/lib/product-api";

function CharactersContent() {
  const { token, isLoading, login } = useAuth();
  const [character, setCharacter] = useState<Character | null>(null);
  const [name, setName] = useState("레비");
  const [rename, setRename] = useState("");
  const [kind, setKind] = useState("helpfulApproach");
  const [text, setText] = useState("");
  const [approved, setApproved] = useState(false);
  const [editing, setEditing] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!token) return;
    const characters = await listCharacters(token);
    setCharacter(
      characters[0] ? await getCharacter(characters[0].id, token) : null,
    );
    setLoaded(true);
  }, [token]);
  useEffect(() => {
    let active = true;
    if (
      new URL(window.location.href).searchParams.get("error") === "auth_failed"
    )
      queueMicrotask(() => {
        if (active)
          setError("로그인을 완료하지 못했어요. 다시 로그인해 주세요.");
      });
    if (token) {
      listCharacters(token)
        .then(async (items) =>
          items[0] ? getCharacter(items[0].id, token) : null,
        )
        .then((item) => {
          if (active) {
            setCharacter(item);
            setLoaded(true);
          }
        })
        .catch(() => {
          if (active)
            setError("캐릭터를 불러오지 못했어요. 다시 시도해 주세요.");
        });
    }
    return () => {
      active = false;
    };
  }, [token]);
  const act = async (action: () => Promise<unknown>) => {
    if (busy || !token) return;
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
    } catch {
      setError("변경을 완료하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };
  const edit = (memory: CharacterMemory) => {
    setEditing(memory.id);
    setKind(memory.kind);
    setText(memory.text);
    setApproved(false);
  };
  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <nav className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/">위로</Link>
        <Link href="/talk">바로 상담하기</Link>
      </nav>
      <h1 className="text-2xl font-semibold">나만의 레비</h1>
      <p className="text-muted-foreground">
        현재는 캐릭터 하나를 만들 수 있어요. 상담 원문은 저장하지 않고, 여기서
        직접 작성하고 승인한 짧은 기억만 계정에 저장해요. 저장한 기억은 다음
        캐릭터 상담에 서버와 AI 처리 맥락으로 전달돼요. 언제든 수정하거나 삭제할
        수 있어요.
      </p>
      {error && <p role="alert">{error}</p>}
      {isLoading ? (
        <p>로그인 확인 중...</p>
      ) : !token ? (
        <section className="p-4 border rounded-xl">
          <p>캐릭터와 승인한 기억은 계정에 연결돼요. 먼저 로그인해 주세요.</p>
          <button className="min-h-11 border rounded-lg px-4" onClick={login}>
            로그인하고 캐릭터 만들기
          </button>
        </section>
      ) : (
        <>
          {!loaded ? (
            <section>
              <p>캐릭터를 불러오는 중...</p>
              {error && (
                <button
                  className="min-h-11 underline"
                  onClick={() =>
                    void load().catch(() => setError("다시 불러오지 못했어요."))
                  }
                >
                  다시 불러오기
                </button>
              )}
            </section>
          ) : !character ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void act(() => createCharacter(name.trim(), "F", token));
              }}
            >
              <label className="block">
                캐릭터 이름
                <input
                  aria-label="캐릭터 이름"
                  className="block w-full p-3 bg-card border rounded-lg"
                  maxLength={40}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <button
                className="min-h-11 px-5 rounded-lg bg-primary text-primary-foreground"
                disabled={busy || !name.trim()}
              >
                캐릭터 만들기
              </button>
            </form>
          ) : (
            <>
              <section className="p-4 bg-card rounded-xl space-y-3">
                <Image
                  src="/characters/levi.png"
                  alt={`${character.displayName} AI 캐릭터`}
                  width={64}
                  height={64}
                  className="object-contain"
                />
                <h2 className="text-lg break-words">{character.displayName}</h2>
                <p className="break-words">
                  {character.displayName}는 AI 캐릭터이며 사람 상담사가
                  아니에요.
                </p>
                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void act(async () => {
                      await renameCharacter(character.id, rename.trim(), token);
                      setRename("");
                    });
                  }}
                >
                  <label className="block">
                    새 캐릭터 이름
                    <input
                      aria-label="새 캐릭터 이름"
                      className="block w-full p-3 bg-card border rounded-lg"
                      maxLength={40}
                      value={rename}
                      onChange={(event) => setRename(event.target.value)}
                      placeholder={character.displayName}
                    />
                  </label>
                  <button
                    className="min-h-11 px-4 border rounded-lg"
                    disabled={
                      busy ||
                      !rename.trim() ||
                      rename.trim() === character.displayName
                    }
                  >
                    이름 변경
                  </button>
                  <p className="text-sm text-muted-foreground">
                    캐릭터 이름만 변경해요. 승인한 기억과 다른 탭에서 진행 중인
                    상담은 지우지 않아요.
                  </p>
                </form>
                <Link
                  className="inline-block min-h-11 p-3 rounded-lg bg-primary text-primary-foreground"
                  href={`/talk?characterId=${character.id}`}
                >
                  이 캐릭터와 상담하기
                </Link>
                <button
                  className="block min-h-11 underline"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm("캐릭터와 승인한 기억을 모두 삭제할까요?")
                    )
                      void act(async () => {
                        await deleteCharacter(character.id, token);
                        setText("");
                        setEditing(undefined);
                        setApproved(false);
                      });
                  }}
                >
                  캐릭터와 기억 삭제
                </button>
              </section>
              <section className="space-y-3">
                <h2 className="text-lg font-semibold break-words">
                  {character.displayName}의 승인한 기억
                </h2>
                <p className="text-sm text-muted-foreground">
                  대화 방식, 관심 주제, 도움이 된 접근을 짧게 적어주세요. 상담
                  원문이나 민감한 개인정보를 복사할 필요는 없어요. 자동
                  추출하거나 자동 저장은 하지 않아요.
                </p>
                {(character.memories || []).map((memory) => (
                  <article className="p-4 border rounded-xl" key={memory.id}>
                    <p className="whitespace-pre-wrap">{memory.text}</p>
                    <button
                      className="min-h-11 mr-4 underline"
                      disabled={busy}
                      onClick={() => edit(memory)}
                    >
                      수정
                    </button>
                    <button
                      className="min-h-11 underline"
                      disabled={busy}
                      onClick={() =>
                        void act(() =>
                          deleteMemory(character.id, memory.id, token),
                        )
                      }
                    >
                      기억 삭제
                    </button>
                  </article>
                ))}
              </section>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!approved) return;
                  void act(async () => {
                    await saveMemory(
                      character.id,
                      kind,
                      text.trim(),
                      token,
                      editing,
                    );
                    setText("");
                    setEditing(undefined);
                    setApproved(false);
                  });
                }}
              >
                <h2 className="text-lg break-words">
                  {editing ? "기억 수정 후 다시 승인" : "기억 직접 작성"}
                </h2>
                <label>
                  기억 종류
                  <select
                    aria-label="기억 종류"
                    className="ml-3 p-2 bg-card border rounded-lg"
                    value={kind}
                    onChange={(event) => {
                      setKind(event.target.value);
                      setApproved(false);
                    }}
                  >
                    <option value="helpfulApproach">도움이 된 접근</option>
                    <option value="style">대화 방식</option>
                    <option value="topic">관심 주제</option>
                  </select>
                </label>
                <label className="block">
                  기억할 내용
                  <textarea
                    aria-label="기억할 내용"
                    className="block w-full p-3 bg-card border rounded-xl"
                    maxLength={200}
                    value={text}
                    onChange={(event) => {
                      setText(event.target.value);
                      setApproved(false);
                    }}
                  />
                </label>
                <p className="text-sm">
                  {text.length}/200자, 최대 20개, 전체 2,000자
                </p>
                <label className="block">
                  <input
                    type="checkbox"
                    checked={approved}
                    onChange={(event) => setApproved(event.target.checked)}
                  />{" "}
                  이 내용만 계정에 저장하고 다음 상담에 사용하는 것을
                  확인했어요.
                </label>
                <button
                  className="min-h-11 px-5 rounded-lg bg-primary text-primary-foreground"
                  disabled={busy || !text.trim() || !approved}
                >
                  확인한 기억 저장
                </button>
                {editing && (
                  <button
                    type="button"
                    className="ml-4 min-h-11 underline"
                    onClick={() => {
                      setEditing(undefined);
                      setText("");
                      setApproved(false);
                    }}
                  >
                    수정 취소
                  </button>
                )}
              </form>
            </>
          )}
        </>
      )}
    </main>
  );
}

export default function CharactersPage() {
  if (!CHARACTER_MEMORY_AVAILABLE) {
    return (
      <main className="max-w-xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">이 기능은 준비 중이에요</h1>
        <p>지금은 레비와 바로 대화할 수 있어요.</p>
        <Link className="underline" href="/talk">레비와 이야기하기</Link>
      </main>
    );
  }
  return <CharactersContent />;
}
