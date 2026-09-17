import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#14140f",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 800,
            color: "#efece4",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          L
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            marginTop: 10,
            background: "#8fcfa6",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24">
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
