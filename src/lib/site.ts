/** Site-wide constants for SEO and branding. */
export const SITE = {
  name: "SupportIQ",
  title: "SupportIQ — AI customer support assistant for your website",
  description:
    "Add an AI support assistant to any website with one script tag. SupportIQ answers from your own help content with citations, hands off to your team, and gives you an inbox with an AI copilot.",
  keywords: [
    "AI customer support",
    "AI chatbot for website",
    "support chat widget",
    "RAG chatbot",
    "helpdesk",
    "live chat",
    "knowledge base chatbot",
    "Next.js",
    "OpenRouter",
  ],
};

/**
 * Canonical public URL. Uses NEXT_PUBLIC_APP_URL when it points somewhere
 * real, then Vercel's production domain, then localhost for development.
 */
export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && !/localhost|127\.0\.0\.1/.test(configured)) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return (configured ?? "http://localhost:3000").replace(/\/$/, "");
}
