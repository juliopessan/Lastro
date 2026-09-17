import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#14140f",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            background: "#8fcfa6",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24">
            <path
              d="M4 12.5l5 5L20 6"
              stroke="#14140f"
              strokeWidth={4}
              fill="none"
              strokeLinecap="square"
            />
          </svg>
        </div>
      </div>
    ),
    size
  );
}
