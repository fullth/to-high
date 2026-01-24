import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
  onClick?: () => void;
}

export function Logo({ size = "md", showText = true, href = "/", onClick }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: "text-lg" },
    md: { icon: 32, text: "text-xl" },
    lg: { icon: 40, text: "text-2xl" },
  };

  const { icon, text } = sizes[size];

  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      {/* 아이콘 */}
      <div
        className="flex items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80"
        style={{ width: icon + 8, height: icon + 8 }}
      >
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 24 24"
          fill="none"
        >
          {/* 두 손이 감싸는 하트 - 위로와 돌봄을 상징 */}
          {/* 왼쪽 손 */}
          <path
            d="M4 14C4 14 5 12 7 12C8 12 9 13 9 14C9 16 7 18 7 18"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* 오른쪽 손 */}
          <path
            d="M20 14C20 14 19 12 17 12C16 12 15 13 15 14C15 16 17 18 17 18"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* 중앙 하트 */}
          <path
            d="M12 8C12 8 9 5 7.5 6.5C6 8 7 10 12 14C17 10 18 8 16.5 6.5C15 5 12 8 12 8Z"
            fill="white"
          />
        </svg>
      </div>

      {/* 텍스트 */}
      {showText && (
        <span className={`font-bold text-foreground/90 ${text} whitespace-nowrap`}>
          <span className="text-primary">
            <span className="sm:hidden">위로: AI 심리 상담</span>
            <span className="hidden sm:inline">위로(TO-HIGH): AI 기반 심리 상담</span>
          </span>
        </span>
      )}
    </Link>
  );
}
