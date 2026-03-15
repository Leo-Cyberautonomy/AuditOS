"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
import WorldMap from "@/components/dashboard/WorldMap";

/* ------------------------------------------------------------------ */
/*  Animated counter hook — starts on mount, no IntersectionObserver   */
/* ------------------------------------------------------------------ */

function useCountUp(target: number, duration = 1500, delay = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        setCount(Math.round((1 - Math.pow(1 - progress, 3)) * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return count;
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
  const count = useCountUp(target, 1600, index * 150);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1, duration: 0.5 }}
      className="relative rounded-xl overflow-hidden p-5"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #F3F4F6",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <div className="flex items-center justify-between mb-2">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: color + "14" }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <span className="text-3xl font-bold tabular-nums" style={{ color: "#0F1117" }}>
        {count}
      </span>
      <p className="text-sm mt-0.5 font-medium" style={{ color: "#6B7280" }}>{label}</p>
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
      className="relative rounded-xl p-4 group transition-all duration-300"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #F3F4F6",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,0.1), 0 0 0 1px ${domain.color}30`;
        e.currentTarget.style.borderColor = domain.color + "40";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)";
        e.currentTarget.style.borderColor = "#F3F4F6";
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: `linear-gradient(90deg, transparent, ${domain.color}, transparent)`,
        }}
      />

      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: domain.color + "14" }}
        >
          <domain.icon size={16} style={{ color: domain.color }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "#0F1117" }}>{domain.name}</h3>
          <p className="text-[11px]" style={{ color: "#9CA3AF" }}>{domain.equipment} equipment types</p>
        </div>
      </div>

      <div className="flex gap-3 mb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: domain.color }} />
          <span className="text-xs" style={{ color: "#374151" }}>
            {domain.tier1.length} detailed
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: domain.color + "60" }}
          />
          <span className="text-xs" style={{ color: "#6B7280" }}>
            +{domain.tier2.length} knowledge
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {domain.tier1.map((std) => (
          <span
            key={std}
            className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border"
            style={{
              color: domain.color,
              borderColor: domain.color + "30",
              backgroundColor: domain.color + "0A",
            }}
          >
            {std}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function CoverageCell({ value }: { value: number }) {
  const intensity =
    value === 0
      ? 0
      : value >= 4
        ? 1
        : value >= 2
          ? 0.65
          : 0.35;

  return (
    <td className="px-2 py-1.5 text-center">
      <div
        className="mx-auto w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold transition-all"
        style={{
          backgroundColor:
            value === 0
              ? "#F9FAFB"
              : `rgba(59, 130, 246, ${intensity * 0.15})`,
          color: value === 0 ? "#D1D5DB" : `rgba(37, 99, 235, ${0.5 + intensity * 0.5})`,
          border: value === 0 ? "1px solid #F3F4F6" : `1px solid rgba(59, 130, 246, ${intensity * 0.3})`,
          boxShadow: value >= 4 ? "0 0 8px rgba(59,130,246,0.12)" : "none",
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
      className="rounded-lg px-3 py-2.5 flex items-center gap-2.5 transition-all"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #F3F4F6",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accentColor + "40";
        e.currentTarget.style.boxShadow = `0 2px 8px ${accentColor}15`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#F3F4F6";
        e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)";
      }}
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: accentColor + "10" }}
      >
        <tool.icon size={13} style={{ color: accentColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: "#0F1117" }}>{tool.name}</p>
        <p className="text-[10px] font-mono truncate" style={{ color: "#9CA3AF" }}>{tool.fn}</p>
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
        backgroundColor: "#FAFAFA",
        color: "#0F1117",
      }}
    >
      {/* -- Section 1: Hero Stats Bar (OVERVIEW — aggregate numbers) -- */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full opacity-[0.06] blur-3xl"
          style={{
            background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-8 pt-10 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 text-center"
          >
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: "#0F1117" }}>
              Platform Capabilities
            </h1>
            <p className="mt-2 text-sm max-w-xl mx-auto" style={{ color: "#6B7280" }}>
              Real-time AI-powered field inspections across 8 audit domains, backed by 55
              regulatory standards and 14 specialized AI tools.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {HERO_STATS.map((stat, i) => (
              <StatCard key={stat.label} index={i} {...stat} />
            ))}
          </div>
        </div>
      </section>

      {/* -- Section 2: World Coverage Map (WHERE — geographic distribution) -- */}
      <section className="py-8" style={{ borderTop: "1px solid #F3F4F6" }}>
        <div className="mx-auto max-w-6xl px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
              Global Regulatory Coverage
            </h2>
            <p className="mt-1.5 text-2xl font-bold sm:text-3xl" style={{ color: "#0F1117" }}>
              21 standards with structured clause data
            </p>
            <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
              55 total standards across 5 jurisdictions
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <WorldMap />
          </motion.div>
        </div>
      </section>

      {/* -- Section 3: Domain Grid (WHAT — per-domain detail + standards) -- */}
      <section className="py-8" style={{ borderTop: "1px solid #F3F4F6" }}>
        <div className="mx-auto max-w-6xl px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
              Audit Domains
            </h2>
            <p className="mt-1.5 text-2xl font-bold sm:text-3xl" style={{ color: "#0F1117" }}>
              Eight specialized inspection domains
            </p>
            <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
              Each with dedicated equipment profiles, regulatory mappings, and AI prompts
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DOMAINS.map((domain, i) => (
              <DomainCard key={domain.slug} domain={domain} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* -- Section 4: Coverage Matrix (WHERE x WHAT — domain/jurisdiction cross-ref) -- */}
      <section className="py-8" style={{ borderTop: "1px solid #F3F4F6" }}>
        <div className="mx-auto max-w-6xl px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
              Coverage Matrix
            </h2>
            <p className="mt-1.5 text-2xl font-bold sm:text-3xl" style={{ color: "#0F1117" }}>
              Standards by domain and jurisdiction
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #F3F4F6",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <th
                      className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider w-48"
                      style={{ color: "#9CA3AF" }}
                    >
                      Domain
                    </th>
                    {JURISDICTIONS.map((j) => (
                      <th
                        key={j}
                        className="px-2 py-2.5 text-xs font-semibold uppercase tracking-wider text-center"
                        style={{ color: "#9CA3AF" }}
                      >
                        {j === "Intl" ? "Int'l" : j}
                      </th>
                    ))}
                    <th
                      className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-center"
                      style={{ color: "#9CA3AF" }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {DOMAINS.map((domain) => {
                    const row = COVERAGE[domain.slug];
                    const total = Object.values(row).reduce((a, b) => a + b, 0);
                    return (
                      <tr
                        key={domain.slug}
                        className="transition-colors"
                        style={{ borderBottom: "1px solid #F9FAFB" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#F9FAFB";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <td className="px-4 py-1.5">
                          <div className="flex items-center gap-2.5">
                            <domain.icon size={14} style={{ color: domain.color }} />
                            <span className="text-sm font-medium" style={{ color: "#374151" }}>
                              {domain.name}
                            </span>
                          </div>
                        </td>
                        {JURISDICTIONS.map((j) => (
                          <CoverageCell key={j} value={row[j]} />
                        ))}
                        <td className="px-4 py-1.5 text-center">
                          <span className="text-sm font-bold" style={{ color: "#0F1117" }}>{total}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "1px solid #F3F4F6" }}>
                    <td
                      className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#9CA3AF" }}
                    >
                      Total
                    </td>
                    {JURISDICTIONS.map((j) => {
                      const colTotal = Object.values(COVERAGE).reduce(
                        (sum, row) => sum + (row[j] || 0),
                        0
                      );
                      return (
                        <td key={j} className="px-2 py-2.5 text-center">
                          <span className="text-sm font-bold" style={{ color: "#3B82F6" }}>{colTotal}</span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-sm font-bold" style={{ color: "#3B82F6" }}>
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
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.1)" }} />
              <span className="text-[11px]" style={{ color: "#9CA3AF" }}>1 standard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }} />
              <span className="text-[11px]" style={{ color: "#9CA3AF" }}>2-3 standards</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }} />
              <span className="text-[11px]" style={{ color: "#9CA3AF" }}>4+ standards</span>
            </div>
          </div>
        </div>
      </section>

      {/* -- Section 5: AI Tools (HOW — tool capabilities, stacked layout) -- */}
      <section className="py-8" style={{ borderTop: "1px solid #F3F4F6" }}>
        <div className="mx-auto max-w-6xl px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
              AI Tool Suite
            </h2>
            <p className="mt-1.5 text-2xl font-bold sm:text-3xl" style={{ color: "#0F1117" }}>
              14 specialized function-calling tools
            </p>
            <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
              Gemini calls these tools automatically based on voice commands and visual context
            </p>
          </motion.div>

          {/* Field Tools — stacked, responsive grid */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "#F59E0B14" }}
              >
                <Camera size={14} style={{ color: "#F59E0B" }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "#0F1117" }}>Field Tools</h3>
                <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
                  Used during live inspection with camera
                </p>
              </div>
              <span
                className="ml-auto text-xs font-medium rounded-full px-2.5 py-0.5"
                style={{
                  color: "#D97706",
                  backgroundColor: "#FEF3C7",
                  border: "1px solid #FDE68A",
                }}
              >
                {FIELD_TOOLS.length} tools
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FIELD_TOOLS.map((tool, i) => (
                <ToolCard key={tool.fn} tool={tool} index={i} accentColor="#F59E0B" />
              ))}
            </div>
          </div>

          {/* Desk Tools — stacked, responsive grid */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "#3B82F614" }}
              >
                <Mic size={14} style={{ color: "#3B82F6" }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "#0F1117" }}>Desk Tools</h3>
                <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
                  Voice-controlled platform navigation
                </p>
              </div>
              <span
                className="ml-auto text-xs font-medium rounded-full px-2.5 py-0.5"
                style={{
                  color: "#2563EB",
                  backgroundColor: "#DBEAFE",
                  border: "1px solid #BFDBFE",
                }}
              >
                {DESK_TOOLS.length} tools
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DESK_TOOLS.map((tool, i) => (
                <ToolCard key={tool.fn} tool={tool} index={i} accentColor="#3B82F6" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -- Section 6: Quick Actions (CTAs — what to do next) -- */}
      <section className="py-10" style={{ borderTop: "1px solid #F3F4F6" }}>
        <div className="mx-auto max-w-6xl px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: "#0F1117" }}>
              Ready to start?
            </h2>
            <p className="mt-2 text-sm" style={{ color: "#6B7280" }}>
              Open an existing case or start a new live audit with your camera and voice.
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/cases"
                className="inline-flex items-center gap-2 rounded-lg px-7 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #3B82F6, #2563EB)",
                  boxShadow: "0 4px 14px rgba(59,130,246,0.3)",
                }}
              >
                View Cases <ArrowRight size={16} />
              </Link>
              <Link
                href="/cases"
                className="inline-flex items-center gap-2 rounded-lg px-7 py-3 text-sm font-semibold transition-colors"
                style={{
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#FFFFFF",
                  color: "#374151",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                Start Live Audit <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bottom spacer */}
      <div className="h-4" />
    </div>
  );
}
