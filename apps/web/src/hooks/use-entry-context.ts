"use client";

import { useSyncExternalStore } from "react";
import { resolveEntryContext } from "@/lib/entry-context";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}
function snapshot() {
  return resolveEntryContext(
    new URLSearchParams(window.location.search),
    document.referrer,
  );
}
function serverSnapshot() {
  return undefined;
}

export function useEntryContext() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
