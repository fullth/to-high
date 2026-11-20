"use client";

import { SCENARIO_FALLBACK_OPTIONS, type TicketingScenario } from "@/lib/ticketing-scenario";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { EntryContext } from "@/lib/entry-context";
import { generateStartOptions } from "@/lib/product-api";
import { OTHER_TOPIC } from "@/lib/entry-context";
import { createStartOptions } from "@/lib/start-options";

// Local fallback variation only; generated content is never persisted in browser storage.
const visitSeed =
  typeof window === "undefined"
    ? 0
    : window.crypto.getRandomValues(new Uint32Array(1))[0];
const subscribe = () => () => {};
const snapshot = () => visitSeed;
const serverSnapshot = () => 0;

export function useStartOptions(
  context: EntryContext | undefined,
  token: string | null,
  active: boolean,
  scenario?: TicketingScenario,
) {
  const seed = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [generation, setGeneration] = useState<{
    round: number;
    previous: string[];
  }>({ round: 0, previous: [] });
  const fallback = useMemo(
    () =>
      scenario ? SCENARIO_FALLBACK_OPTIONS : createStartOptions({
        context,
        seed: seed + generation.round,
        previous: generation.previous,
      }),
    [context, seed, generation, scenario],
  );
  const key = `${context ?? "general"}:${generation.round}:${scenario?.gender ?? ""}:${scenario?.name ?? ""}`;
  const [result, setResult] = useState<{
    key: string;
    options: string[];
    status: "loading" | "ready" | "fallback";
  } | null>(null);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let cancelled = false;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    // Coalesce React's mount replay before reserving any paid model work.
    const start = setTimeout(() => {
      setResult({ key, options: [], status: "loading" });
      deadline = setTimeout(() => controller.abort(), 10000);
      void generateStartOptions(
        context ?? "general",
        generation.previous,
        token,
        controller.signal,
        scenario,
      )
        .then((options) => {
          if (options.includes(OTHER_TOPIC))
            throw new Error("Invalid generated control");
          if (!cancelled && !controller.signal.aborted)
            setResult({
              key,
              options:
                context === "ticketing" && !scenario ? [...options, OTHER_TOPIC] : options,
              status: "ready",
            });
        })
        .catch(() => {
          if (!cancelled) setResult({ key, options: [], status: "fallback" });
        })
        .finally(() => {
          if (deadline) clearTimeout(deadline);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(start);
      if (deadline) clearTimeout(deadline);
      controller.abort();
    };
  }, [context, key, generation.previous, token, active, scenario]);
  const status = result?.key === key ? result.status : "loading";
  const options =
    result?.key === key && result.status === "ready"
      ? result.options
      : fallback;
  const restart = () =>
    setGeneration({ round: generation.round + 1, previous: options });
  return {
    options,
    restart,
    loading: status === "loading",
    fallback: status === "fallback",
  };
}
