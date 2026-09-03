import { Logo } from "@to-high/web";

export const Sizes = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <Logo size="sm" />
    <Logo size="md" />
    <Logo size="lg" />
  </div>
);

export const MarkOnly = () => (
  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
    <Logo size="sm" showText={false} />
    <Logo size="md" showText={false} />
    <Logo size="lg" showText={false} />
  </div>
);
