"use client";

import { Download } from "lucide-react";

/** Downloads a minimal HTML page with the snippet, for testing locally. */
export function DownloadTestPage({ origin, botKey, botName }: { origin: string; botKey: string; botName: string }) {
  function download() {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${botName.replace(/[<>&"]/g, "")} – SupportIQ test</title>
</head>
<body style="font-family:system-ui,sans-serif;max-width:640px;margin:60px auto;padding:0 20px;color:#334155">
  <h1>SupportIQ test page</h1>
  <p>Click the chat button in the bottom-right corner.</p>

  <!-- SupportIQ widget -->
  <script src="${origin}/widget.js" data-bot="${botKey}" async></script>
</body>
</html>
`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "supportiq-test.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={download} className="btn-secondary">
      <Download className="size-4" /> Download test HTML
    </button>
  );
}
