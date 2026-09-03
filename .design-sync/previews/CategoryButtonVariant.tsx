import { CategoryButtonVariant } from "@to-high/web";

const noop = () => {};
const base = {
  label: "일상",
  description: "오늘 있었던 일을 편하게",
  color: "#2e9b6d",
  onClick: noop,
};

export const GradientGlow = () => (
  <div style={{ maxWidth: 260 }}>
    <CategoryButtonVariant {...base} variant="gradient-glow" />
  </div>
);

export const Glassmorphism = () => (
  <div style={{ maxWidth: 260 }}>
    <CategoryButtonVariant {...base} variant="glassmorphism" />
  </div>
);

export const NeonCyber = () => (
  <div style={{ maxWidth: 260 }}>
    <CategoryButtonVariant {...base} variant="neon-cyber" />
  </div>
);

export const MinimalInteractive = () => (
  <div style={{ maxWidth: 260 }}>
    <CategoryButtonVariant {...base} variant="minimal-interactive" />
  </div>
);

export const Card3D = () => (
  <div style={{ maxWidth: 260 }}>
    <CategoryButtonVariant {...base} variant="card-3d" />
  </div>
);
