## TO-HIGH (위로) — design system conventions

위로 is an AI-based psychological counseling service. The visual language is calm
and warm: a sage-green primary on a cream ground, generous rounding, soft shadows.
Copy is Korean, gentle, non-judgmental.

### Setup — no provider needed

Components read their colors from CSS custom properties defined on `:root` in the
bundled stylesheet. Load `styles.css` (its `@import` closure pulls in the token
layer and `_ds_bundle.css`) and the components are styled — there is **no** theme
provider or context wrapper. Fonts (`Geist`, loaded by the host app at runtime)
fall back to the system sans stack when absent; that is expected in previews.

There is a `.dark` class hook in the source but the palette is currently
light-only — treat this as a single light theme.

### Styling idiom — Tailwind v4 utilities backed by semantic tokens

Components are built with Tailwind v4 utility classes that resolve to semantic
CSS variables. When you write layout/spacing glue around these components, use
the same token-backed utilities — never hard-code hex or raw `px` colors.

| Need | Utility (or `var()`) | Token |
|---|---|---|
| brand fill | `bg-primary` / `text-primary-foreground` | `--primary` `#2e9b6d` |
| brand text / links | `text-primary` | `--primary` |
| page ground | `bg-background` / `text-foreground` | `--background` `#faf8f3`, `--foreground` `#213128` |
| surface | `bg-card` / `text-card-foreground` | `--card` `#ffffff` |
| quiet fill | `bg-secondary` (also `bg-muted`) | `--secondary`, `--muted` |
| quiet text | `text-muted-foreground` | `--muted-foreground` `#6f7d75` |
| tinted highlight | `bg-accent` (pair with `text-accent-foreground`) | `--accent` (brand tint) |
| hairline | `border-border` | `--border` `#e5e9e0` |
| focus ring | `ring-ring` | `--ring` (= primary) |
| danger | `bg-destructive` | `--destructive` `#c0392b` |
| rounding | `rounded-xl` (12px) / `rounded-2xl` (16px) | `--radius` `16px` |
| elevation | `shadow-lg` (+ colored `shadow-primary/25` on primary buttons) | — |

Default body text is `font-sans` (`Geist`). `--font-serif` exists in the token
layer but has no Korean face — avoid it for Korean copy.

`CategoryButtonVariant` takes a free-form `color` hex string for its per-category
accent — pick values in the sage/earth family (`#2e9b6d` brand, `#5b8a72`,
`#c0847a`) so it sits with the palette.

### Where the truth lives

- `styles.css` and its `@import`s (`_ds_bundle.css`, the token layer) — the full
  compiled stylesheet; the `:root` block near the top is the token source.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component props + usage
  examples (all examples are real, drawn from the app).
- `components/<group>/<Name>/<Name>.d.ts` — the props contract.

### Build snippet

```jsx
// A mood-check panel: DS Card + DS Button, token utilities for the glue.
<div className="bg-background p-6">
  <Card className="max-w-sm">
    <CardHeader>
      <CardTitle>오늘의 기분</CardTitle>
      <CardDescription>지금 마음에 가장 가까운 걸 골라 주세요.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex gap-2 text-2xl">😔 😐 🙂 😊 😄</div>
    </CardContent>
    <CardFooter>
      <Button className="w-full">기분 저장하기</Button>
    </CardFooter>
  </Card>
</div>
```
