import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "SupportIQ — an AI support assistant for your website, in one line of code";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card used by Open Graph and Twitter (rendered at build time). */
export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "logo-mark.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #ffffff 0%, #eef2ff 55%, #e0e7ff 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={88} height={88} alt="" />
          <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: "#0f172a" }}>
            Support<span style={{ color: "#4f46e5" }}>IQ</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.08, color: "#0f172a", letterSpacing: -1.5, maxWidth: 980 }}>
            An AI support assistant for your website, in one line of code.
          </div>
          <div style={{ fontSize: 30, color: "#475569", maxWidth: 940 }}>
            Answers from your docs with citations · human handoff · team inbox with an AI copilot
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {["Next.js", "PostgreSQL + pgvector", "OpenRouter"].map((t) => (
            <div key={t} style={{ display: "flex", padding: "10px 20px", borderRadius: 999, background: "#ffffff", border: "2px solid #c7d2fe", fontSize: 24, color: "#4338ca" }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
