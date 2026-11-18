# SupportIQ — AI customer support platform

SupportIQ adds an AI support assistant to any website with **one script tag**. The assistant answers from your own knowledge base (RAG with citations), **triages** every conversation with an LLM, **hands off** to a human when needed, and gives your team an **inbox with an AI copilot** and analytics.

> Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL + **pgvector** (Neon) · Prisma 7 · OpenRouter (chat + embeddings) · Zod · Vitest · GitHub Actions · Docker

```html
<script src="https://your-supportiq-host/widget.js" data-bot="siq_your_key" async></script>
```

---

## Features

### For website visitors (the widget)
- Floating chat button → isolated **iframe** chat (no CSS/JS collisions with the host page)
- Replies **stream token-by-token** over Server-Sent Events
- Answers cite their sources (`[1]`, `[2]` + source chips); markdown is rendered **with raw HTML disabled** (XSS-safe)
- **Multi-turn context** and conversation restore across page reloads
- "Talk to a human" button (or just ask for a person) → live **agent replies** appear in the widget
- 👍/👎 feedback on answers, end-of-chat **CSAT** rating
- Full-screen on phones, 384px panel on desktop; unread badge when the panel is closed

### For the support team (the dashboard)
- **Assistants**: persona/system prompt, greeting, brand colour, starter questions, allowed websites, handoff toggle, live preview, copy-paste embed code
- **Knowledge base**: paste text or ingest a **URL** → readable-text extraction → chunking → embeddings → pgvector
- **Inbox**: needs-human conversations pinned and sorted by AI priority; take over, reply, hand back to AI, resolve
- **Analytics**: AI containment rate, answer helpfulness, CSAT, average reply latency, conversations/day (AI vs escalated), top topics, sentiment

### Where AI is used
| Feature | What the model does | Fallback without an API key |
|---|---|---|
| **RAG answers** | Answers only from retrieved passages, cites them, admits when it doesn't know | Extractive answer from the best-matching passages |
| **Hybrid retrieval** | Query + chunks embedded via OpenRouter; pgvector cosine search fused with Postgres full-text search (Reciprocal Rank Fusion) | Full-text search only |
| **Auto-triage** | JSON output (validated with Zod): summary, topic, sentiment, priority, `needs_human` → auto-escalation | Rule-based classifier |
| **Agent copilot** | Drafts a grounded reply for the human agent (never sent without approval) | Template + extractive answer |
| **Knowledge-gap loop** | Low-confidence questions are logged; one click writes a draft help article covering them | Article skeleton with `[TODO]`s |

The app is fully usable with **no API key** (offline demo mode), and degrades gracefully if the model is rate-limited mid-stream.

---

## Architecture

```
 Host website ──<script src=widget.js>──▶ Loader (vanilla JS, ~4 KB)
                                            │ floating button + lazy iframe
                                            ▼  postMessage (origin-checked)
                        ┌──────────── Next.js app ─────────────────────────────┐
                        │ /embed/[key]  chat UI (React)                        │
                        │   └─ POST /api/widget/[key]/chat  ──SSE stream──▶    │
                        │        rate limit → retrieve → prompt → stream       │
                        │        after(): AI triage / escalation               │
                        │ /dashboard    inbox · assistants · knowledge · stats │
                        │   └─ Server Actions (authz in a data access layer)   │
                        │ proxy.ts      auth gate + CSP frame-ancestors/bot    │
                        └──────────────┬──────────────────────┬────────────────┘
                                       │ Prisma + raw SQL     │ HTTPS
                                       ▼                      ▼
                        PostgreSQL (Neon) + pgvector     OpenRouter API
                        users · bots · documents ·       chat completions (stream)
                        chunks(vector, GIN fts) ·        embeddings
                        conversations · messages
```

**Request flow for a visitor message**
1. Zod-validate input, rate-limit per visitor+IP (20/min), load bot by public key
2. Find or create the visitor's conversation (visitors can only read their own)
3. If a human owns the conversation → store message, skip AI. If the visitor asks for a person → hand off.
4. Hybrid search over the bot's chunks → confidence score → below threshold = knowledge gap
5. Build the grounded prompt (persona + rules + numbered excerpts + last 10 turns) and stream the reply
6. Save the reply with cited sources, confidence, latency and model; triage runs in `after()` so it never delays the visitor

### Security decisions
- Model calls are server-side only; the API key never reaches the browser
- Per-bot **CSP `frame-ancestors`** restricts which sites may embed the widget
- Loader only trusts `postMessage` events from the SupportIQ iframe's origin
- Sessions: HS256 JWT in an HTTP-only, SameSite cookie; bcrypt password hashes; timing-equalised login
- Every Server Action re-checks ownership (data access layer), not just the UI
- URL ingestion has an **SSRF guard** (blocks private/loopback ranges, re-checks every redirect hop, size + type limits)
- Model output rendered as markdown with HTML disabled

---

## Getting started

```bash
npm install
cp .env.example .env          # add DATABASE_URL / DIRECT_URL (Postgres with pgvector) and AUTH_SECRET
npm run db:migrate            # applies migrations (creates the vector extension + indexes)
npm run db:seed               # demo account, demo assistant, sample conversations
npm run dev
```

- Landing page with the live widget: http://localhost:3000
- Dashboard: http://localhost:3000/login?demo=1 (demo credentials are shown on the page, from `DEMO_EMAIL` / `DEMO_PASSWORD`)
- Add `OPENROUTER_API_KEY` to switch from offline demo mode to live LLM answers. Models are set with `OPENROUTER_CHAT_MODEL` and `OPENROUTER_EMBED_MODEL` (free models work). After changing the embedding model, re-index documents.

| Script | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest unit tests (chunking, RRF, HTML extraction, JSON parsing, rate limiting, triage heuristics, prompts) |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:migrate` / `db:seed` | Prisma migrations / demo data |

### Deploying
- **Database**: Neon (or any Postgres 15+ with pgvector). Use the pooled URL for `DATABASE_URL` and the direct URL for `DIRECT_URL`.
- **App**: Vercel works out of the box (`after()` uses `waitUntil`), or use the included `Dockerfile` (standalone output) on Render/Fly/Railway.
- Set `NEXT_PUBLIC_APP_URL` to the public URL so embed snippets point at it.

## Project structure
```
src/
  app/
    page.tsx                     landing page (embeds its own widget)
    (auth)/                      login, sign-up, server actions
    dashboard/                   overview, inbox, assistants, knowledge base, server actions
    embed/[key]/                 the chat UI loaded inside the iframe
    api/widget/[key]/…           public widget API (chat SSE, history, handoff, feedback, end)
  components/chat/               ChatWidget, safe Markdown renderer
  lib/
    ai/openrouter.ts             chat, streaming, embeddings client
    ai/retrieval.ts              hybrid pgvector + full-text search, RRF, confidence
    ai/prompts.ts                RAG, triage, copilot and article prompts
    ai/triage.ts · copilot.ts    LLM triage + escalation, agent drafts, knowledge gaps
    ai/text.ts · heuristics.ts   pure, unit-tested helpers and offline fallbacks
    ingest.ts                    fetch (SSRF-guarded) → chunk → embed → store
    auth.ts · session.ts         data access layer, JWT sessions
  proxy.ts                       auth gate + per-bot CSP frame-ancestors
public/widget.js                 embeddable loader
prisma/                          schema, migrations, seed
```

## What I'd build next
- Redis-backed rate limiting and a queue for ingestion (multi-instance deployments)
- WebSockets/SSE for the inbox instead of polling
- PDF / sitemap ingestion and scheduled re-crawls
- Answer-quality evals (golden question set run in CI)
- Team members with roles, and email notifications for escalations
