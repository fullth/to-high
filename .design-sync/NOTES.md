# design-sync notes — @to-high/web

## Shape

- This is a **Next.js app**, not a component library. No `dist/`, no `module`/`main`/`exports`, no `.d.ts` tree. `shape: package` with a **hand-written entry** (`.design-sync/ds-entry.ts`).
- Scope is deliberately narrow: 4 reusable presentation components (`Button`, `Card`, `Logo`, `CategoryButtonVariant`). App-coupled pieces (`chat/*`, `landing/*`, `channel-talk`, `coffee-support`, `logo.tsx`) are excluded via `componentSrcMap` nulls.
- `TopicButton` and `MindfulnessCard` were also excluded (2026-09-02, user call): unused in the current app, built against a removed dark theme. `TopicButton` hard-codes a `#0a0a0a` icon-chip background; `MindfulnessCard` leans on `font-serif` which has no Korean face. Both looked off-brand on the current sage-green light DS. Re-add to `ds-entry.ts` + `componentSrcMap` + `dtsPropsFor` + a preview if they get a light-theme pass.

## Build inputs — run `sh .design-sync/prebuild.sh` first (it is `cfg.buildCmd`)

1. **compiled.css** — `globals.css` is Tailwind v4 (`@import "tailwindcss"`). esbuild cannot process it (Tailwind's `exports` map has no importable `.` entry, and `@import "tailwindcss"` needs the Tailwind engine). `prebuild.sh` compiles it with `@tailwindcss/cli@4.1.18` (pinned to match `@tailwindcss/postcss` in the repo) against the component + preview sources → `apps/web/.ds-sync-assets/compiled.css`. `cfg.cssEntry` points there. **Recompile whenever a preview uses new utility classes** — `prebuild.sh` includes `.design-sync/previews/**` in `--content`.
2. **ds-entry.ts** — canonical copy is `.design-sync/ds-entry.ts` (committed). `prebuild.sh` copies it to `apps/web/.ds-sync-assets/ds-entry.ts` (gitignored). It **must** live inside `apps/web` so the converter's PKG_DIR walk-up stops at `apps/web/package.json` (name `@to-high/web`, v0.1.0) rather than the repo-root `to-high` package — a wrong PKG_DIR makes `srcDir`/`cssEntry` resolve against repo root and drops `.d.ts` enrichment.

## Why not synth-entry

The converter's `[NO_DIST]` synth mode does `export *` over **every** `.tsx` under `srcDir` (regex-filtered only, `componentSrcMap` nulls do NOT prune it). That drags in `logo.tsx` / `chat-sidebar.tsx` / `wirocare-landing.tsx`, which import `next/link`, `next/image`, `next/og` → the IIFE bundle then throws `ReferenceError: process is not defined` at render (Next code reads `process.env.__NEXT_MANUAL_CLIENT_BASE_PATH`). The hand-written `ds-entry.ts` is the fix.

## Build command

```sh
sh .design-sync/prebuild.sh
node .ds-sync/package-build.mjs --config .design-sync/config.json \
  --node-modules ./node_modules \
  --entry ./apps/web/.ds-sync-assets/ds-entry.ts --out ./ds-bundle
node .ds-sync/package-validate.mjs ./ds-bundle
```

`--node-modules ./node_modules` (repo root) — `react`/`react-dom` are hoisted there, not in `apps/web/node_modules`.

## `.d.ts` props

No shipped types, so `cfg.dtsPropsFor` hand-writes the props body for every component. **Update it when a component's source props change** — nothing else will catch drift. `Card` is a `div` passthrough.

## Fonts

- `Geist` loads at runtime via `next/font/google` (layout.tsx) — no `@font-face` to ship. `runtimeFontPrefixes` suppresses `[FONT_MISSING]`.
- `Cambria` (in `--font-serif` fallback stack) and `Pretendard` are also in `runtimeFontPrefixes` — system/fallback fonts, not real webfonts the DS ships. Accepted as substitutes (DS pane renders them with the next fallback).

## Playwright / render check

Repo pins `@playwright/test` 1.58.2 → `playwright-core` pins chromium build **1208**, which is in `~/Library/Caches/ms-playwright/`. `playwright` package resolves from repo root. No install needed.

## Known render warns

- `[FONT_MISSING]` for `Cambria` / `Pretendard` / `Geist` — all suppressed via `runtimeFontPrefixes`. Not real webfonts the DS ships (Geist loads at runtime, Cambria/Pretendard are fallback-stack entries). If validate ever re-lists one of these, it's still expected.
- No `bad`/`thin`/`variantsIdentical` flags on any of the 4 components as of the first sync (2026-09-02).

## Re-sync risks

- **compiled.css is a generated snapshot.** If `globals.css` tokens/theme change, or Tailwind is upgraded, re-run `prebuild.sh` (the driver does via `buildCmd`) and eyeball the token diff. A stale `@tailwindcss/cli` pin in `prebuild.sh` vs the repo's `@tailwindcss/postcss` will drift the output — keep them equal.
- **ds-entry.ts is maintained by hand.** A new reusable component added to the DS must be added here AND to `componentSrcMap` AND to `dtsPropsFor`. Discovery will not find it.
- **dtsPropsFor is hand-written** — drifts silently from source. Re-check against the 6 component files on any re-sync.
- **PKG_DIR fragility** — if `--entry` is ever pointed outside `apps/web`, PKG_DIR flips to repo root and the build silently degrades (`no src/`, weak `.d.ts`, wrong version string). Always `--entry ./apps/web/.ds-sync-assets/ds-entry.ts`.
- The `@/` alias in `button.tsx`/`card.tsx` (`@/lib/utils`) resolves via `cfg.tsconfig` = `apps/web/tsconfig.json` (has `paths` but `moduleResolution: bundler`, no `baseUrl`). esbuild's tsconfig-paths plugin handles it. If resolution breaks, that's the place to look.
