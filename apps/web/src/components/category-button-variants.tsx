"use client";

interface CategoryButtonProps {
  label: string;
  description: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
  variant: "gradient-glow" | "glassmorphism" | "neon-cyber" | "minimal-interactive" | "card-3d";
}

export function CategoryButtonVariant({
  label,
  description,
  color,
  onClick,
  disabled = false,
  variant,
}: CategoryButtonProps) {

  // 1. 그라디언트 글로우 버튼
  if (variant === "gradient-glow") {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="group relative p-6 rounded-2xl overflow-hidden transition-all duration-500 hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${color}20 0%, ${color}40 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
          style={{
            background: `radial-gradient(circle at center, ${color}60 0%, transparent 70%)`,
          }}
        />
        <div className="relative z-10 text-center">
          <div className="text-lg font-bold text-foreground mb-1">{label}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </button>
    );
  }

  // 2. 글래스모피즘 (유리 느낌)
  if (variant === "glassmorphism") {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="group relative p-6 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:pointer-events-none backdrop-blur-md"
        style={{
          background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
          border: `1px solid ${color}30`,
          boxShadow: `0 8px 32px ${color}10`,
        }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `linear-gradient(135deg, ${color}25 0%, ${color}35 100%)`,
          }}
        />
        <div className="relative z-10 text-center">
          <div className="text-lg font-bold text-foreground mb-1">{label}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </button>
    );
  }

  // 3. 네온/사이버 스타일
  if (variant === "neon-cyber") {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="group relative p-3 rounded-xl bg-background transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
        style={{
          border: `2px solid ${color}`,
          boxShadow: `0 0 10px ${color}40, inset 0 0 10px ${color}10`,
        }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl animate-pulse"
          style={{
            boxShadow: `0 0 20px ${color}60, inset 0 0 20px ${color}20`,
          }}
        />
        <div className="relative z-10 text-center">
          <div className="text-sm font-bold text-foreground mb-0.5">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </button>
    );
  }

  // 4. 미니멀 + 인터랙티브
  if (variant === "minimal-interactive") {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="group relative p-6 rounded-2xl border-2 border-border bg-card transition-all duration-300 hover:border-transparent disabled:opacity-50 disabled:pointer-events-none overflow-hidden"
      >
        <div
          className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
          style={{ backgroundColor: color + '15' }}
        />
        <div className="relative z-10 text-center">
          <div className="text-lg font-bold text-foreground mb-1 group-hover:scale-105 transition-transform duration-300">
            {label}
          </div>
          <div className="text-sm text-muted-foreground">{description}</div>
          <div
            className="mt-3 h-0.5 w-0 group-hover:w-full mx-auto transition-all duration-300"
            style={{ backgroundColor: color }}
          />
        </div>
      </button>
    );
  }

  // 5. 3D 카드 효과
  if (variant === "card-3d") {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="group relative p-6 rounded-2xl bg-card border border-border transition-all duration-300 hover:-translate-y-2 disabled:opacity-50 disabled:pointer-events-none"
        style={{
          boxShadow: `0 4px 6px ${color}20, 0 1px 3px ${color}10`,
        }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
          style={{
            boxShadow: `0 20px 25px ${color}30, 0 10px 10px ${color}20`,
          }}
        />
        <div className="relative z-10 text-center">
          <div className="text-lg font-bold text-foreground mb-1">{label}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl"
          style={{ backgroundColor: color }}
        />
      </button>
    );
  }

  return null;
}
