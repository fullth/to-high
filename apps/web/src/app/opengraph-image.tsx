import { ImageResponse } from "next/og";

export const alt = "To high; 위로 - AI 심리 상담";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f1f15 0%, #1a2f23 50%, #243d2e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* 배경 장식 원 */}
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 70%)",
            top: -50,
            right: -50,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 70%)",
            bottom: -30,
            left: -30,
            display: "flex",
          }}
        />

        {/* 아이콘 */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "linear-gradient(135deg, #34d399 0%, #6ee7b7 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
            boxShadow: "0 8px 32px rgba(52,211,153,0.3)",
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 14C4 14 5 12 7 12C8 12 9 13 9 14C9 16 7 18 7 18"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M20 14C20 14 19 12 17 12C16 12 15 13 15 14C15 16 17 18 17 18"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M12 8C12 8 9 5 7.5 6.5C6 8 7 10 12 14C17 10 18 8 16.5 6.5C15 5 12 8 12 8Z"
              fill="white"
            />
          </svg>
        </div>

        {/* 타이틀 */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -1,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span>To high;</span>
          <span style={{ color: "#34d399" }}>위로</span>
        </div>

        {/* 설명 */}
        <div
          style={{
            fontSize: 24,
            color: "#9ca3af",
            marginTop: 16,
            display: "flex",
          }}
        >
          선택지를 통해 점진적으로 함께 이야기하는 AI 심리 상담
        </div>

        {/* 하단 태그 */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            gap: 12,
          }}
        >
          {["마음 치유", "고민 상담", "AI 위로"].map((tag) => (
            <div
              key={tag}
              style={{
                padding: "8px 20px",
                borderRadius: 999,
                border: "1px solid #2d4a3a",
                color: "#6ee7b7",
                fontSize: 16,
                display: "flex",
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
