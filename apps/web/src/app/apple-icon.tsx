import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: "linear-gradient(135deg, #5a8a6e 0%, #4a7a5e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "36px",
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
        >
          {/* 두 손이 감싸는 하트 */}
          <path
            d="M4 14C4 14 5 12 7 12C8 12 9 13 9 14C9 16 7 18 7 18"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M20 14C20 14 19 12 17 12C16 12 15 13 15 14C15 16 17 18 17 18"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M12 8C12 8 9 5 7.5 6.5C6 8 7 10 12 14C17 10 18 8 16.5 6.5C15 5 12 8 12 8Z"
            fill="white"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
