"use client";

import { MessageCircle } from "lucide-react";

declare global {
  interface Window {
    SupportIQ?: { open: () => void; close: () => void };
  }
}

/** Opens the live widget embedded on this page (the demo assistant). */
export function OpenDemoButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={() => window.SupportIQ?.open()} className={className}>
      {children ?? (
        <>
          <MessageCircle className="size-4" /> Try the live demo
        </>
      )}
    </button>
  );
}
