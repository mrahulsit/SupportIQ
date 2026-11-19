import Link from "next/link";
import Script from "next/script";
import { ArrowRight, BookOpen, Check, FileText, Headset, Inbox, Lightbulb, MousePointerClick, Sparkles, UserPlus } from "lucide-react";
import { Logo } from "@/components/Logo";
import { InstallGuide } from "@/components/InstallGuide";
import { OpenDemoButton } from "@/components/OpenDemoButton";
import AnimatedButton from "@/components/ui/animated-button";
import { BorderBeam } from "@/components/ui/border-beam";
import { FaqAccordion } from "@/components/ui/faq-accordion";
import { PerspectiveGrid } from "@/components/ui/perspective-grid";
import StaggerText from "@/components/ui/stagger-text";
import { DEMO_BOT_KEY } from "@/lib/demo";
import { SITE, siteUrl } from "@/lib/site";

const steps = [
  {
    icon: UserPlus,
    title: "Create an assistant",
    body: "Sign up and you get an assistant right away. Give it a name, greeting and brand colour.",
  },
  {
    icon: FileText,
    title: "Teach it your answers",
    body: "Paste your FAQs and policies, or add a help-centre URL. It only answers from what you give it.",
  },
  {
    icon: MousePointerClick,
    title: "Add one line to your site",
    body: "Copy the script tag from the dashboard into your site. A chat button appears on every page.",
  },
];

const features = [
  { icon: BookOpen, title: "Answers with sources", body: "Replies are grounded in your content and cite the article they came from." },
  { icon: Headset, title: "Hand-off to a human", body: "Visitors can ask for a person; frustrated customers are escalated automatically." },
  { icon: Inbox, title: "A sorted inbox", body: "Every chat is summarised and tagged with topic, sentiment and priority." },
  { icon: Lightbulb, title: "Fills its own gaps", body: "Questions it couldn’t answer are collected and drafted into new articles." },
];

const faqs = [
  {
    q: "The chat button doesn’t appear",
    a: "Check that the script tag is on the page and that data-bot is your assistant’s key (it starts with siq_). Open the browser console — SupportIQ logs a clear message if the key is wrong.",
  },
  {
    q: "The chat says “The chat couldn’t load”",
    a: "Your assistant has an Allowed websites list and this site isn’t on it. Add your site’s address (e.g. https://www.example.com) in Settings, or leave the list empty while you test.",
  },
  {
    q: "It keeps saying it doesn’t know",
    a: "It only answers from your knowledge base. Add the missing content under Knowledge base — unanswered questions are listed there under Knowledge gaps to show you what’s missing.",
  },
  {
    q: "Can I test it before touching my real site?",
    a: "Yes. Each assistant has a Test page link in the dashboard that shows the widget on a blank page, and the Settings page has a live preview.",
  },
];

export default function Home() {
  return (
    <div className="bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#how-it-works" className="btn-ghost hidden sm:inline-flex">How it works</a>
            <a href="#setup" className="btn-ghost hidden sm:inline-flex">Setup</a>
            <Link href="/login" className="btn-ghost">Log in</Link>
            <Link href="/signup" className="btn-primary">Get started</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        {/* Vengeance UI perspective grid; tiles light up under the cursor */}
        <PerspectiveGrid className="absolute inset-0 -z-10 h-full bg-white" gridSize={32} fadeRadius={70} />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_55%_at_75%_20%,rgba(99,102,241,.14),transparent)]" />
        <div className="pointer-events-none mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100 backdrop-blur">
              <Sparkles className="size-3.5" /> AI answers · human handoff · team inbox
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
              <StaggerText>An AI support assistant for your website, in one line of code.</StaggerText>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              SupportIQ answers your customers from your own help content, and passes the conversation to your team when a person is needed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <AnimatedButton as="a" href="/signup" className="h-11 rounded-lg px-5 text-[15px] shadow-lg shadow-indigo-600/25">
                Create your assistant <ArrowRight className="size-4" />
              </AnimatedButton>
              <OpenDemoButton className="btn-secondary h-11 px-5 text-[15px]" />
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              {["Free to self-host", "Works with any website", "Set up in about 5 minutes"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-600" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <ChatPreview />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-16 border-t border-slate-100 bg-slate-50/60 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow="How it works" title="Live on your site in three steps" />
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="relative rounded-2xl bg-white p-6 ring-1 ring-slate-200">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-semibold text-indigo-600">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Setup guide */}
      <section id="setup" className="scroll-mt-16 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.35fr]">
          <div>
            <SectionTitle eyebrow="Setup" title="Add it to your website" align="left" />
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
              After you sign up, open your assistant’s <b>Settings</b> page. The snippet there already contains your bot key — pick your platform and paste it in.
            </p>
            <ol className="mt-6 space-y-4 text-[15px]">
              {[
                ["Copy your snippet", "Dashboard → Assistants → your assistant → Install."],
                ["Paste it into your site", "Before the closing </body> tag, or in your platform’s footer code box."],
                ["Publish and check", "Reload your site — the chat button appears in the bottom-right corner."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">{i + 1}</span>
                  <span>
                    <b className="font-semibold">{t}</b>
                    <span className="block text-slate-600">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-6 rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
              Tip: open or close the chat from your own buttons with <code className="font-mono">window.SupportIQ.open()</code>.
            </p>
          </div>
          <div className="min-w-0 lg:pt-2">
            <InstallGuide />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 bg-slate-50/60 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow="What you get" title="More than a chat bubble" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
                <Icon className="size-6 text-indigo-600" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section id="help" className="scroll-mt-16 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionTitle eyebrow="Troubleshooting" title="If something isn’t working" />
          <FaqAccordion title="" className="mt-6 py-0" items={faqs.map((f) => ({ question: f.q, answer: f.a }))} />
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 rounded-3xl bg-slate-950 px-6 py-14 text-center text-white">
          <h2 className="text-3xl font-semibold tracking-tight">Ready to answer customers instantly?</h2>
          <p className="max-w-lg text-slate-300">Create an assistant, add your content, and paste one line of code.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <AnimatedButton as="a" href="/signup" className="h-11 rounded-lg border-indigo-500 bg-indigo-500 px-5 text-sm">
              Get started free <ArrowRight className="size-4" />
            </AnimatedButton>
            <Link href="/login?demo=1" className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white ring-1 ring-white/25 hover:bg-white/10">
              Explore the demo dashboard
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 pb-24 pt-6 text-sm text-slate-500 sm:flex-row sm:px-6 sm:pb-6 sm:pr-24">
          <Logo />
          <p>Built with Next.js, PostgreSQL + pgvector and OpenRouter</p>
        </div>
      </footer>

      {/* Structured data so search engines understand what the product is. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: SITE.name,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: SITE.description,
            url: siteUrl(),
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            author: { "@type": "Person", name: "Rahul Mishra", url: "https://www.mrahuls.in" },
          }).replace(/</g, "\\u003c"),
        }}
      />

      {/* Dogfooding: this page embeds its own widget exactly like a customer site would. */}
      <Script src="/widget.js" data-bot={DEMO_BOT_KEY} strategy="afterInteractive" />
    </div>
  );
}

function SectionTitle({ eyebrow, title, align = "center" }: { eyebrow: string; title: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

/** Static illustration of the widget: an answer with a citation, then a hand-off. */
function ChatPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-200/50 to-emerald-100/40 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <BorderBeam size={140} duration={9} colorFrom="#818cf8" colorTo="#34d399" borderWidth={2} />
        <div className="flex items-center gap-3 bg-indigo-600 px-4 py-3 text-white">
          <span className="grid size-8 place-items-center rounded-full bg-white/20">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Acme Support</p>
            <p className="text-[11px] text-white/80">AI assistant · replies instantly</p>
          </div>
        </div>
        <div className="space-y-3 bg-slate-50 p-4 text-[13.5px]">
          <div className="flex justify-end">
            <p className="max-w-[80%] rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2 text-white">How long do refunds take?</p>
          </div>
          <div className="max-w-[88%] space-y-1.5">
            <p className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 leading-relaxed ring-1 ring-slate-200">
              Refunds go back to your original payment method within <b>5 business days</b> of us receiving the return [1].
            </p>
            <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200">
              <BookOpen className="size-3" /> [1] Refund policy
            </span>
          </div>
          <div className="flex justify-end">
            <p className="max-w-[80%] rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2 text-white">Mine is late — can I talk to someone?</p>
          </div>
          <div className="max-w-[88%]">
            <p className="mb-1 pl-1 text-[11px] font-medium text-slate-500">Priya · team</p>
            <p className="rounded-2xl rounded-bl-md bg-emerald-50 px-3.5 py-2.5 ring-1 ring-emerald-200">
              Hi! I’m checking your order now — one moment.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 text-[13px] text-slate-400">
          Ask a question…
          <span className="ml-auto grid size-7 place-items-center rounded-lg bg-indigo-600 text-white">
            <ArrowRight className="size-3.5 -rotate-90" />
          </span>
        </div>
      </div>
    </div>
  );
}
