"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy } from "lucide-react";

type Platform = { id: string; label: string; where: string; lang: string; code: (src: string, key: string) => string };

const PLATFORMS: Platform[] = [
  {
    id: "html",
    label: "HTML",
    where: "Paste just before the closing </body> tag on every page that should show the chat.",
    lang: "html",
    code: (src, key) => `<script src="${src}" data-bot="${key}" async></script>`,
  },
  {
    id: "next",
    label: "Next.js",
    where: "Add it once in your root layout (app/layout.tsx) so it loads on every page.",
    lang: "tsx",
    code: (src, key) => `import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="${src}" data-bot="${key}" strategy="lazyOnload" />
      </body>
    </html>
  );
}`,
  },
  {
    id: "react",
    label: "React / Vite",
    where: "Add it to index.html (public/index.html in Create React App), just before </body>.",
    lang: "html",
    code: (src, key) => `<!-- index.html -->
<body>
  <div id="root"></div>
  <script src="${src}" data-bot="${key}" async></script>
</body>`,
  },
  {
    id: "wordpress",
    label: "WordPress",
    where: "Use a header & footer plugin (e.g. WPCode → Code Snippets → Header & Footer) and paste it into the Footer box.",
    lang: "html",
    code: (src, key) => `<script src="${src}" data-bot="${key}" async></script>`,
  },
  {
    id: "shopify",
    label: "Shopify",
    where: "Online Store → Themes → ⋯ → Edit code → layout/theme.liquid, then paste just before </body>.",
    lang: "html",
    code: (src, key) => `<script src="${src}" data-bot="${key}" async></script>`,
  },
  {
    id: "webflow",
    label: "Webflow",
    where: "Site settings → Custom code → Footer code, then publish the site.",
    lang: "html",
    code: (src, key) => `<script src="${src}" data-bot="${key}" async></script>`,
  },
];

const noop = () => () => {};

/**
 * Platform-specific install snippets. `origin` comes from the server in the
 * dashboard; on public pages it falls back to the browser's own origin so the
 * snippet always points at the deployment the visitor is looking at.
 */
export function InstallGuide({ origin, botKey, dark = false }: { origin?: string; botKey?: string; dark?: boolean }) {
  const [active, setActive] = useState(PLATFORMS[0].id);
  const [copied, setCopied] = useState(false);
  const browserOrigin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const base = origin ?? (browserOrigin || "https://your-supportiq-app.com");
  const platform = PLATFORMS.find((p) => p.id === active)!;
  const code = platform.code(`${base}/widget.js`, botKey ?? "YOUR_BOT_KEY");

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the code is still selectable */
    }
  }

  return (
    <div className={`overflow-hidden rounded-xl ring-1 ${dark ? "bg-white/5 ring-white/10" : "bg-white ring-slate-200"}`}>
      <div role="tablist" aria-label="Platform" className={`flex gap-1 overflow-x-auto border-b p-1.5 ${dark ? "border-white/10" : "border-slate-200 bg-slate-50"}`}>
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={p.id === active}
            onClick={() => setActive(p.id)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              p.id === active
                ? dark
                  ? "bg-white/15 text-white"
                  : "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : dark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className={`px-4 pt-3 text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>{platform.where}</p>
      <div className="relative m-3 mt-2 rounded-lg bg-slate-950">
        <pre className="overflow-x-auto whitespace-pre-wrap p-4 pr-20 font-mono text-[12.5px] leading-relaxed text-slate-100 [overflow-wrap:anywhere]">
          <code>{code}</code>
        </pre>
        <button
          type="button"
          onClick={copy}
          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white hover:bg-white/20"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
