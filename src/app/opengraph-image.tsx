import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f2efe8",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              background: "#14140f",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                d="M4 12.5l5 5L20 6"
                stroke="#8fcfa6"
                strokeWidth={4}
                fill="none"
                strokeLinecap="square"
              />
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "0.14em",
              color: "#9c988e",
              textTransform: "uppercase",
            }}
          >
            UKode Labs
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 128,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#11110f",
              lineHeight: 1,
            }}
          >
            Lastro
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "#55524b",
              maxWidth: 900,
            }}
          >
            Propostas comerciais com IA — a IA escreve a narrativa, você controla os números.
          </div>
        </div>
      </div>
    ),
    size
  );
}
