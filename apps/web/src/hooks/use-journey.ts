"use client";
import { useCallback, useEffect, useRef } from "react";
import {
  beginTalkJourney,
  type JourneyContext,
  type JourneyEntry,
} from "@/lib/journey";

export function useJourney(entry: Exclude<JourneyEntry, "unselected">) {
  const flow = useRef<JourneyContext | null>(null);
  const expires = useRef(0);
  const current = useCallback(() => {
    if (
      !flow.current ||
      Date.now() >= expires.current ||
      flow.current.entry !== entry
    ) {
      flow.current = beginTalkJourney(entry);
      expires.current = Date.now() + 30 * 60_000;
    }
    return flow.current;
  }, [entry]);
  const restart = useCallback(() => {
    flow.current = null;
  }, []);
  useEffect(() => {
    current();
    window.addEventListener("pagehide", restart);
    return () => window.removeEventListener("pagehide", restart);
  }, [current, restart]);
  return { current, restart };
}
