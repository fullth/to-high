import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "6px",
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
        >
          {/* 두 손이 감싸는 하트 - 위로와 돌봄을 상징 */}
          {/* 왼쪽 손 */}
          <path
            d="M4 14C4 14 5 12 7 12C8 12 9 13 9 14C9 16 7 18 7 18"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* 오른쪽 손 */}
          <path
            d="M20 14C20 14 19 12 17 12C16 12 15 13 15 14C15 16 17 18 17 18"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* 중앙 하트 */}
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
