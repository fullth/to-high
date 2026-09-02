// Canonical DS barrel — the scoped components only.
// Copied to apps/web/.ds-sync-assets/ds-entry.ts at build time (paths are
// relative to THAT location). A synth-entry `export *` over all of
// src/components/ drags in Next.js (logo.tsx, chat-sidebar.tsx,
// wirocare-landing.tsx import next/*), which breaks the IIFE bundle at
// runtime (`process is not defined`). Keep this list in sync with
// cfg.componentSrcMap.
export { Button, buttonVariants } from "../src/components/ui/button";
export {
  Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent,
} from "../src/components/ui/card";
export { Logo } from "../src/components/logo-ds";
export { CategoryButtonVariant } from "../src/components/category-button-variants";
