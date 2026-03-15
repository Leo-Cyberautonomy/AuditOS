"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  Zap,
  UtensilsCrossed,
  HardHat,
  Leaf,
  Flame,
  Factory,
  Building2,
  Globe2,
  Scale,
  Wrench,
  Grid3X3,
  Radio,
  Eye,
  MousePointer,
  FileText,
  Mic,
  Camera,
  Search,
  BookOpen,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */

function useCountUp(target: number, duration = 1800, startDelay = 0) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const timeout = setTimeout(() => {
      const start = performance.now();
      function tick(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [inView, target, duration, startDelay]);

  return { count, ref };
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const HERO_STATS = [
  { label: "Domains", target: 8, icon: Grid3X3, color: "#3B82F6" },
  { label: "Standards", target: 55, icon: Scale, color: "#F59E0B" },
  { label: "Jurisdictions", target: 5, icon: Globe2, color: "#22C55E" },
  { label: "AI Tools", target: 14, icon: Wrench, color: "#A855F7" },
];

const DOMAINS = [
  {
    slug: "energy",
    name: "Energy Audit",
    icon: Zap,
    color: "#F59E0B",
    tier1: ["ISO 50001", "EN 16247-1", "ASHRAE", "DIN 17463"],
    tier2: ["EN 16247-2", "EN 16247-3", "EN 16247-4"],
    equipment: 12,
  },
  {
    slug: "food_safety",
    name: "Food Safety",
    icon: UtensilsCrossed,
    color: "#22C55E",
    tier1: ["HACCP", "FDA FSMA", "SQF", "ISO 22000"],
    tier2: ["BRCGS", "EU Reg. 852/2004", "Codex Alimentarius"],
    equipment: 10,
  },
  {
    slug: "workplace_safety",
    name: "Workplace Safety",
    icon: HardHat,
    color: "#EF4444",
    tier1: ["ISO 45001", "OSHA 1910", "OSHA 1926"],
    tier2: ["EU Dir. 89/391", "HSE (UK)", "ISO 31000"],
    equipment: 10,
  },
  {
    slug: "construction",
    name: "Construction",
    icon: HardHat,
    color: "#8B5CF6",
    tier1: ["IBC"],
    tier2: ["OSHA 1926", "Eurocodes", "CDM (UK)", "ISO 45001", "ANSI A10"],
    equipment: 10,
  },
  {
    slug: "environmental",
    name: "Environmental",
    icon: Leaf,
    color: "#10B981",
    tier1: ["ISO 14001"],
    tier2: ["EPA", "EU EIA", "REACH", "Clean Air Act", "Clean Water Act", "RCRA", "ISO 14040"],
    equipment: 8,
  },
  {
    slug: "fire_safety",
    name: "Fire Safety",
    icon: Flame,
    color: "#F97316",
    tier1: ["NFPA 72", "NFPA 101", "EN 54", "ISO 7240"],
    tier2: ["NFPA 1", "NFPA 25", "BS 5839"],
    equipment: 10,
  },
  {
    slug: "manufacturing_qc",
    name: "Manufacturing QC",
    icon: Factory,
    color: "#6366F1",
    tier1: ["ISO 9001", "ISO 19011"],
    tier2: ["ISO 3834", "IATF 16949", "FDA 21 CFR", "AS9100", "GMP", "Six Sigma"],
    equipment: 10,
  },
  {
    slug: "facility_management",
    name: "Facility Management",
    icon: Building2,
    color: "#14B8A6",
    tier1: ["ASTM E2018", "ISO 41001"],
    tier2: ["RICS", "ADA", "BOMA", "IFMA"],
    equipment: 10,
  },
];

const COVERAGE: Record<string, Record<string, number>> = {
  energy: { US: 1, EU: 5, UK: 0, Intl: 4, Japan: 0 },
  food_safety: { US: 2, EU: 2, UK: 0, Intl: 3, Japan: 0 },
  workplace_safety: { US: 2, EU: 2, UK: 1, Intl: 3, Japan: 0 },
  construction: { US: 2, EU: 2, UK: 1, Intl: 2, Japan: 0 },
  environmental: { US: 4, EU: 3, UK: 0, Intl: 2, Japan: 0 },
  fire_safety: { US: 3, EU: 2, UK: 1, Intl: 2, Japan: 1 },
  manufacturing_qc: { US: 1, EU: 0, UK: 0, Intl: 6, Japan: 0 },
  facility_management: { US: 1, EU: 0, UK: 0, Intl: 3, Japan: 0 },
};

const JURISDICTIONS = ["US", "EU", "UK", "Intl", "Japan"];

const REGIONS = [
  {
    id: "us",
    name: "United States",
    abbr: "US",
    standards: ["OSHA", "ASHRAE", "NFPA", "EPA", "FDA FSMA", "IBC", "ASTM"],
    count: 16,
    color: "#3B82F6",
    x: "18%",
    y: "38%",
    size: 72,
  },
  {
    id: "eu",
    name: "European Union",
    abbr: "EU",
    standards: ["EN 16247", "Eurocodes", "EU Dir. 89/391", "REACH", "EU EIA"],
    count: 16,
    color: "#22C55E",
    x: "52%",
    y: "30%",
    size: 68,
  },
  {
    id: "uk",
    name: "United Kingdom",
    abbr: "UK",
    standards: ["HSE", "CDM", "BS 5839"],
    count: 3,
    color: "#22C55E",
    x: "44%",
    y: "24%",
    size: 36,
  },
  {
    id: "jp",
    name: "Japan",
    abbr: "JP",
    standards: ["JIS (ISO 7240)"],
    count: 1,
    color: "#F59E0B",
    x: "82%",
    y: "36%",
    size: 32,
  },
  {
    id: "intl",
    name: "International",
    abbr: "ISO",
    standards: ["ISO 50001", "ISO 14001", "ISO 45001", "ISO 9001", "ISO 22000", "ISO 41001"],
    count: 19,
    color: "#A855F7",
    x: "50%",
    y: "72%",
    size: 60,
  },
];

interface AiTool {
  name: string;
  fn: string;
  icon: LucideIcon;
}

const FIELD_TOOLS: AiTool[] = [
  { name: "Record Equipment", fn: "record_equipment", icon: Radio },
  { name: "Record Meter Reading", fn: "record_meter_reading", icon: Scale },
  { name: "Flag Issue", fn: "flag_issue", icon: Flame },
  { name: "Capture Evidence", fn: "capture_evidence", icon: Camera },
  { name: "Query Standard", fn: "query_standard", icon: BookOpen },
];

const DESK_TOOLS: AiTool[] = [
  { name: "Navigate To", fn: "navigate_to", icon: ArrowRight },
  { name: "Highlight Finding", fn: "highlight_finding", icon: Eye },
  { name: "Filter Findings", fn: "filter_findings", icon: Search },
  { name: "Explain Item", fn: "explain_item", icon: FileText },
  { name: "Show Regulation", fn: "show_regulation", icon: BookOpen },
  { name: "Read Summary", fn: "read_summary", icon: Mic },
  { name: "Capture Screen", fn: "capture_screen", icon: Camera },
  { name: "Read Page Content", fn: "read_page_content", icon: Eye },
  { name: "Click Element", fn: "click_element", icon: MousePointer },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  target,
  icon: Icon,
  color,
  index,
}: {
  label: string;
  target: number;
  icon: LucideIcon;
  color: string;
  index: number;
}) {
  const { count, ref } = useCountUp(target, 1600, index * 150);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1, duration: 0.5 }}
      className="relative rounded-xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm overflow-hidden"
      style={{
        boxShadow: `0 0 40px ${color}10, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }}
      />
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: color + "1A" }}
        >
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      <span ref={ref} className="text-4xl font-bold text-white tabular-nums">
        {count}
      </span>
      <p className="text-sm text-gray-400 mt-1 font-medium">{label}</p>
    </motion.div>
  );
}

function RegionBlob({
  region,
  index,
}: {
  region: (typeof REGIONS)[number];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 + index * 0.12, duration: 0.6, ease: "easeOut" }}
      className="absolute flex flex-col items-center"
      style={{
        left: region.x,
        top: region.y,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Outer glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: region.size * 1.8,
          height: region.size * 1.8,
          background: `radial-gradient(circle, ${region.color}15 0%, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Inner pulse ring */}
      <motion.div
        className="absolute rounded-full border"
        style={{
          width: region.size,
          height: region.size,
          borderColor: region.color + "40",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.1, 0.4],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.3,
        }}
      />
      {/* Core dot */}
      <div
        className="relative rounded-full z-10"
        style={{
          width: region.size * 0.5,
          height: region.size * 0.5,
          background: `radial-gradient(circle, ${region.color} 0%, ${region.color}80 60%, transparent 100%)`,
          boxShadow: `0 0 20px ${region.color}60, 0 0 40px ${region.color}30`,
        }}
      />
      {/* Label */}
      <div className="relative z-10 mt-2 text-center">
        <p className="text-xs font-bold text-white">{region.abbr}</p>
        <p className="text-[10px] text-gray-400">
          {region.count} std{region.count !== 1 ? "s" : ""}
        </p>
      </div>
    </motion.div>
  );
}

function DomainCard({
  domain,
  index,
}: {
  domain: (typeof DOMAINS)[number];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.06, duration: 0.45 }}
      className="relative rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm group hover:border-white/20 hover:bg-white/[0.05] transition-all duration-300"
      style={{
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: `linear-gradient(90deg, transparent, ${domain.color}60, transparent)`,
        }}
      />

      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: domain.color + "1A" }}
        >
          <domain.icon size={18} style={{ color: domain.color }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{domain.name}</h3>
          <p className="text-[11px] text-gray-500">{domain.equipment} equipment types</p>
        </div>
      </div>

      <div className="flex gap-3 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: domain.color }} />
          <span className="text-xs text-gray-300">
            {domain.tier1.length} detailed
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: domain.color + "60" }}
          />
          <span className="text-xs text-gray-400">
            +{domain.tier2.length} knowledge
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {domain.tier1.map((std) => (
          <span
            key={std}
            className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border"
            style={{
              color: domain.color,
              borderColor: domain.color + "30",
              backgroundColor: domain.color + "10",
            }}
          >
            {std}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function CoverageCell({ value, maxInRow }: { value: number; maxInRow: number }) {
  const intensity =
    value === 0
      ? 0
      : value >= 4
        ? 1
        : value >= 2
          ? 0.65
          : 0.35;

  return (
    <td className="px-2 py-2.5 text-center">
      <div
        className="mx-auto w-10 h-10 rounded-lg flex items-center justify-center text-xs font-semibold transition-all"
        style={{
          backgroundColor:
            value === 0
              ? "rgba(255,255,255,0.03)"
              : `rgba(59, 130, 246, ${intensity * 0.35})`,
          color: value === 0 ? "rgba(255,255,255,0.15)" : `rgba(255,255,255, ${0.5 + intensity * 0.5})`,
          border: value === 0 ? "1px solid rgba(255,255,255,0.05)" : `1px solid rgba(59, 130, 246, ${intensity * 0.4})`,
          boxShadow: value >= 4 ? "0 0 12px rgba(59,130,246,0.2)" : "none",
        }}
      >
        {value}
      </div>
    </td>
  );
}

function ToolCard({ tool, index, accentColor }: { tool: AiTool; index: number; accentColor: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center gap-3 hover:border-white/15 hover:bg-white/[0.05] transition-all"
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: accentColor + "15" }}
      >
        <tool.icon size={14} style={{ color: accentColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white truncate">{tool.name}</p>
        <p className="text-[10px] text-gray-500 font-mono truncate">{tool.fn}</p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#0A0A0F",
        color: "#F5F5F5",
        marginLeft: -0,
      }}
    >
      {/* ── Section 1: Hero Stats Bar ────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-8 pt-12 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 text-center"
          >
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Platform Capabilities
            </h1>
            <p className="mt-2 text-sm text-gray-400 max-w-xl mx-auto">
              Real-time AI-powered field inspections across 8 audit domains, backed by 55
              regulatory standards and 14 specialized AI tools.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {HERO_STATS.map((stat, i) => (
              <StatCard key={stat.label} index={i} {...stat} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 2: World Coverage Map ────────────────────────── */}
      <section className="border-t border-white/5 py-16">
        <div className="mx-auto max-w-6xl px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
              Global Regulatory Coverage
            </h2>
            <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              21 standards with structured clause data
            </p>
            <p className="mt-1 text-sm text-gray-400">
              55 total standards across 5 jurisdictions
            </p>
          </motion.div>

          {/* Radar-style map */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative rounded-2xl border border-white/10 overflow-hidden"
            style={{
              backgroundColor: "rgba(10, 10, 20, 0.8)",
              height: 380,
            }}
          >
            {/* Grid background */}
            <svg
              className="absolute inset-0 w-full h-full opacity-[0.07]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Horizontal scan line */}
            <motion.div
              className="absolute left-0 right-0 h-px pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.3) 20%, rgba(59,130,246,0.5) 50%, rgba(59,130,246,0.3) 80%, transparent 100%)",
              }}
              animate={{ top: ["10%", "90%", "10%"] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />

            {/* Region blobs */}
            {REGIONS.map((region, i) => (
              <RegionBlob key={region.id} region={region} index={i} />
            ))}

            {/* Connection lines (subtle) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
              <line x1="18%" y1="38%" x2="44%" y2="24%" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="44%" y1="24%" x2="52%" y2="30%" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="52%" y1="30%" x2="82%" y2="36%" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="50%" y1="72%" x2="18%" y2="38%" stroke="#A855F7" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="50%" y1="72%" x2="52%" y2="30%" stroke="#A855F7" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="50%" y1="72%" x2="82%" y2="36%" stroke="#A855F7" strokeWidth="0.5" strokeDasharray="4 4" />
            </svg>
          </motion.div>
        </div>
      </section>

      {/* ── Section 3: Domain Grid ───────────────────────────────── */}
      <section
        className="border-t border-white/5 py-16"
        style={{ backgroundColor: "rgba(255,255,255,0.01)" }}
      >
        <div className="mx-auto max-w-6xl px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
              Audit Domains
            </h2>
            <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Eight specialized inspection domains
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Each with dedicated equipment profiles, regulatory mappings, and AI prompts
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DOMAINS.map((domain, i) => (
              <DomainCard key={domain.slug} domain={domain} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Coverage Matrix ───────────────────────────── */}
      <section className="border-t border-white/5 py-16">
        <div className="mx-auto max-w-6xl px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
              Coverage Matrix
            </h2>
            <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Standards by domain and jurisdiction
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden backdrop-blur-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 w-48">
                      Domain
                    </th>
                    {JURISDICTIONS.map((j) => (
                      <th
                        key={j}
                        className="px-2 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center"
                      >
                        {j === "Intl" ? "Int'l" : j}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {DOMAINS.map((domain) => {
                    const row = COVERAGE[domain.slug];
                    const total = Object.values(row).reduce((a, b) => a + b, 0);
                    const maxVal = Math.max(...Object.values(row));
                    return (
                      <tr
                        key={domain.slug}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <domain.icon size={14} style={{ color: domain.color }} />
                            <span className="text-sm font-medium text-gray-200">
                              {domain.name}
                            </span>
                          </div>
                        </td>
                        {JURISDICTIONS.map((j) => (
                          <CoverageCell key={j} value={row[j]} maxInRow={maxVal} />
                        ))}
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-sm font-bold text-white">{total}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10">
                    <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Total
                    </td>
                    {JURISDICTIONS.map((j) => {
                      const colTotal = Object.values(COVERAGE).reduce(
                        (sum, row) => sum + (row[j] || 0),
                        0
                      );
                      return (
                        <td key={j} className="px-2 py-3 text-center">
                          <span className="text-sm font-bold text-blue-400">{colTotal}</span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold text-blue-400">
                        {Object.values(COVERAGE).reduce(
                          (sum, row) => sum + Object.values(row).reduce((a, b) => a + b, 0),
                          0
                        )}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.15)" }} />
              <span className="text-[11px] text-gray-500">1 standard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(59,130,246,0.23)", border: "1px solid rgba(59,130,246,0.26)" }} />
              <span className="text-[11px] text-gray-500">2-3 standards</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(59,130,246,0.35)", border: "1px solid rgba(59,130,246,0.4)" }} />
              <span className="text-[11px] text-gray-500">4+ standards</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: AI Tools ──────────────────────────────────── */}
      <section
        className="border-t border-white/5 py-16"
        style={{ backgroundColor: "rgba(255,255,255,0.01)" }}
      >
        <div className="mx-auto max-w-6xl px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
              AI Tool Suite
            </h2>
            <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              14 specialized function-calling tools
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Gemini calls these tools automatically based on voice commands and visual context
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Field Tools */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/15">
                  <Camera size={16} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Field Tools</h3>
                  <p className="text-[11px] text-gray-500">
                    Used during live inspection with camera
                  </p>
                </div>
                <span className="ml-auto text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-0.5">
                  {FIELD_TOOLS.length} tools
                </span>
              </div>
              <div className="space-y-2">
                {FIELD_TOOLS.map((tool, i) => (
                  <ToolCard key={tool.fn} tool={tool} index={i} accentColor="#F59E0B" />
                ))}
              </div>
            </div>

            {/* Desk Tools */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/15">
                  <Mic size={16} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Desk Tools</h3>
                  <p className="text-[11px] text-gray-500">
                    Voice-controlled platform navigation
                  </p>
                </div>
                <span className="ml-auto text-xs font-medium text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-full px-2.5 py-0.5">
                  {DESK_TOOLS.length} tools
                </span>
              </div>
              <div className="space-y-2">
                {DESK_TOOLS.map((tool, i) => (
                  <ToolCard key={tool.fn} tool={tool} index={i} accentColor="#3B82F6" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: Quick Actions ─────────────────────────────── */}
      <section className="border-t border-white/5 py-16">
        <div className="mx-auto max-w-6xl px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to start?
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Open an existing case or start a new live audit with your camera and voice.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/cases"
                className="inline-flex items-center gap-2 rounded-lg px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40"
                style={{
                  background: "linear-gradient(135deg, #3B82F6, #2563EB)",
                }}
              >
                View Cases <ArrowRight size={16} />
              </Link>
              <Link
                href="/cases"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-7 py-3 text-sm font-semibold text-gray-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Start Live Audit <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
