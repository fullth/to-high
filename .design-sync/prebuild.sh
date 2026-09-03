#!/bin/sh
# design-sync prebuild — regenerate the two build inputs the converter needs.
# Run from repo root before package-build.mjs / resync.mjs.
#
# 1. compiled.css  — globals.css is Tailwind v4 (@import "tailwindcss"); esbuild
#    can't process it, so compile it against the component + preview sources.
# 2. ds-entry.ts   — hand-written barrel of the 6 scoped components, copied into
#    apps/web so PKG_DIR detection resolves to @to-high/web (not repo root).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TW="./.ds-sync/node_modules/.bin/tailwindcss"
[ -x "$TW" ] || TW="npx --yes @tailwindcss/cli@4.1.18"

mkdir -p apps/web/.ds-sync-assets
$TW -i apps/web/src/app/globals.css -o apps/web/.ds-sync-assets/compiled.css \
  --content "apps/web/src/components/**/*.{ts,tsx}" \
  --content ".design-sync/previews/**/*.tsx"
cp .design-sync/ds-entry.ts apps/web/.ds-sync-assets/ds-entry.ts
echo "prebuild: compiled.css + ds-entry.ts refreshed"
