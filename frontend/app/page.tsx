import Link from "next/link";
import {
  Zap,
  HardHat,
  UtensilsCrossed,
  Leaf,
  Flame,
  Factory,
  Building2,
  ArrowRight,
  Mic,
  Eye,
  MessageSquare,
  ChevronRight,
  Globe,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const DOMAINS = [
  {
    icon: Zap,
    name: "Energy",
    description: "ISO 50001 audits, HVAC efficiency, lighting and motor systems",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
  },
  {
    icon: HardHat,
    name: "Workplace Safety",
    description: "OSHA compliance, PPE checks, hazard identification and risk matrices",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
  {
    icon: UtensilsCrossed,
    name: "Food Safety",
    description: "HACCP critical control points, temperature logs, hygiene practices",
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
  },
  {
    icon: HardHat,
    name: "Construction",
    description: "Fall protection, scaffolding integrity, heavy equipment safety",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  {
    icon: Leaf,
    name: "Environmental",
    description: "ISO 14001 compliance, emissions monitoring, waste management",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  {
    icon: Flame,
    name: "Fire Safety",
    description: "NFPA codes, suppression systems, egress paths, detection equipment",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  {
    icon: Factory,
    name: "Manufacturing QC",
    description: "ISO 9001 quality systems, defect tracking, process deviation analysis",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    icon: Building2,
    name: "Facility Management",
    description: "Building condition assessments, deferred maintenance, system life-cycle",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
  },
] as const;

const STEPS = [
  {
    number: "01",
    label: "Talk",
    icon: Mic,
    description:
      "Describe what you see, ask questions about standards, get real-time guidance",
    accent: "from-blue-500 to-blue-600",
    glow: "bg-blue-500/20",
  },
  {
    number: "02",
    label: "See",
    icon: Eye,
    description:
      "AI reads equipment nameplates, spots defects, identifies violations through your camera",
    accent: "from-amber-500 to-amber-600",
    glow: "bg-amber-500/20",
  },
  {
    number: "03",
    label: "Act",
    icon: MessageSquare,
    description:
      "Findings recorded automatically via function calling, reports generated from evidence",
    accent: "from-emerald-500 to-emerald-600",
    glow: "bg-emerald-500/20",
  },
] as const;

const VOICE_EXAMPLES = [
  {
    command: "Show me the critical findings",
    response: "AI navigates to evidence page, highlights critical items",
  },
  {
    command: "What regulation applies here?",
    response: "AI cites OSHA 1910.147 or HACCP critical limits",
  },
  {
    command: "Read me the audit summary",
    response: "AI speaks the executive summary aloud",
  },
] as const;

const TECH_BADGES = [
  "Google ADK",
  "Gemini 2.5 Flash",
  "Cloud Run",
  "Next.js",
  "FastAPI",
] as const;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0F", color: "#F5F5F5" }}>
      {/* ── Nav ──────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/5" style={{ backgroundColor: "rgba(10,10,15,0.85)", backdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-white">Audit</span>
            <span className="text-blue-500">AI</span>
          </span>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-300 transition-colors hover:text-white"
          >
            Enter Platform <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Gradient glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full opacity-25 blur-3xl" style={{ background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)" }} />

        <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-28 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-400">
            <Globe className="h-3.5 w-3.5" />
            Built with Google ADK + Gemini Live API
          </div>

          <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Your AI Field Inspector
          </h1>

          <p className="mt-4 text-xl font-semibold tracking-wide" style={{ color: "#F59E0B" }}>
            See everything. Miss nothing.
          </p>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-400 sm:text-lg">
            Talk to your AI co-pilot during field inspections. It sees through your camera,
            records findings hands-free, navigates the platform by voice, and generates
            compliance-ready reports.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40"
              style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}
            >
              Enter Platform <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-7 py-3 text-sm font-semibold text-gray-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              View Demo Cases <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-gray-500">
            How It Works
          </h2>
          <p className="mt-2 text-center text-3xl font-bold text-white sm:text-4xl">
            Three steps. Hands-free.
          </p>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-colors hover:border-white/10 hover:bg-white/[0.04]">
                {/* Glow spot */}
                <div className={`absolute -top-px left-1/2 h-px w-24 -translate-x-1/2 bg-gradient-to-r ${step.accent} opacity-60`} />

                <div className="mb-5 flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${step.glow}`}>
                    <step.icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-bold tracking-widest text-gray-600">{step.number}</span>
                </div>

                <h3 className="text-xl font-bold text-white">{step.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Works Across Industries ──────────────────────────────── */}
      <section className="border-t border-white/5 py-24" style={{ backgroundColor: "rgba(255,255,255,0.01)" }}>
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-gray-500">
            Works Across Industries
          </h2>
          <p className="mt-2 text-center text-3xl font-bold text-white sm:text-4xl">
            One platform. Eight domains.
          </p>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DOMAINS.map((domain) => (
              <div
                key={domain.name}
                className={`group rounded-xl border ${domain.border} ${domain.bg} p-5 transition-all hover:scale-[1.02] hover:shadow-lg`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <domain.icon className={`h-5 w-5 ${domain.color}`} />
                  <span className="text-sm font-semibold text-white">{domain.name}</span>
                </div>
                <p className="text-xs leading-relaxed text-gray-400">{domain.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Voice-Controlled Platform ────────────────────────────── */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-gray-500">
            Voice-Controlled Platform
          </h2>
          <p className="mt-2 text-center text-3xl font-bold text-white sm:text-4xl">
            Just say it. AI does the rest.
          </p>

          <div className="mt-16 space-y-6">
            {VOICE_EXAMPLES.map((example) => (
              <div
                key={example.command}
                className="flex flex-col gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-6 sm:flex-row sm:items-center sm:gap-8"
              >
                <div className="flex shrink-0 items-center gap-3 sm:w-80">
                  <Mic className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold text-white">
                    &ldquo;{example.command}&rdquo;
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <ArrowRight className="hidden h-4 w-4 text-gray-600 sm:block" />
                  <span className="text-sm text-gray-400">{example.response}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Architecture ─────────────────────────────────────────── */}
      <section className="border-t border-white/5 py-24" style={{ backgroundColor: "rgba(255,255,255,0.01)" }}>
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-gray-500">
            Architecture
          </h2>
          <p className="mt-2 text-center text-3xl font-bold text-white sm:text-4xl">
            Built on Google Cloud + ADK
          </p>

          {/* Text-based architecture diagram */}
          <div className="mx-auto mt-14 max-w-3xl overflow-x-auto rounded-xl border border-white/10 bg-[#0D0D14] p-8 font-mono text-sm leading-loose text-gray-300">
            <pre className="whitespace-pre text-center">{`
┌─────────────┐     WebSocket      ┌─────────────┐
│             │ ◄────────────────► │             │
│   Next.js   │    Audio + Video   │   FastAPI   │
│  Frontend   │    JSON messages   │   Backend   │
│             │                    │             │
└─────────────┘                    └──────┬──────┘
                                          │
                                   Google ADK Runner
                                          │
                                   ┌──────┴──────┐
                                   │   Gemini    │
                                   │  Live API   │
                                   │  2.5 Flash  │
                                   └─────────────┘

  14 Tools: 5 Field (record equipment, meters, issues, evidence, standards)
          + 9 Desk  (navigate, highlight, filter, explain, regulations, summary, screenshot, read page, click)
`}</pre>
          </div>

          {/* Tech badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {TECH_BADGES.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-gray-300"
              >
                {badge}
              </span>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Deployed on Google Cloud Run
          </p>
        </div>
      </section>

      {/* ── Footer CTA ───────────────────────────────────────────── */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to inspect smarter?
          </h2>
          <p className="mt-3 text-gray-400">
            Open the platform and try a live audit with your camera and voice.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-lg px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40"
            style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}
          >
            Enter Platform <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs text-gray-600">
          AuditAI — AI-powered field inspection platform built with Google ADK and Gemini
        </div>
      </footer>
    </div>
  );
}
