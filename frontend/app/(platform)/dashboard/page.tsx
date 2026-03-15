"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
/*  Dot-matrix world map data                                          */
/*  Each row is a string: '1' = land, '0' = water                     */
/*  80 cols x 40 rows, rendered at 10px spacing = 800x400             */
/* ------------------------------------------------------------------ */

const WORLD_DOT_ROWS: string[] = [
  //        0         1         2         3         4         5         6         7
  //        0123456789012345678901234567890123456789012345678901234567890123456789012345678
  /* 0 */ "00000000000000000000000000000000000000000000000000000000000001111100000000000000",
  /* 1 */ "00000000000000001111000000000000000000000000001111100000000011111110000000000000",
  /* 2 */ "00000000000001111111100000000000000000000000011111110000001111111111100000000000",
  /* 3 */ "00000000000011111111110000000000000000000001111111111000011111111111110000000000",
  /* 4 */ "00000000000111111111111000000000000000000011111111111100111111111111111000000000",
  /* 5 */ "00000000001111111111111100000000000000000111111111111101111111111111111100000000",
  /* 6 */ "00000000011111111111111100000000000000001111111111111111111111111111111110000000",
  /* 7 */ "00000000011111111111111110000000000000000011111111111111111111111111111111000000",
  /* 8 */ "00000000001111111111111110000000000000000001111111111111111111111111111111100000",
  /* 9 */ "00000000000011111111111100000000000000000000111111111111111111111111111111100000",
  /*10 */ "00000000000001111111111110000000000000000000011111111111011111111111111111000000",
  /*11 */ "00000000000000111111111111000000000000000000011111111100001111111111111110000000",
  /*12 */ "00000000000000011111111111100000000000000000001111111000000111111111111100000000",
  /*13 */ "00000000000000001111111111110000000000000000001111110000000001111111111000011000",
  /*14 */ "00000000000000000111111111111000000000000000000111100000000000111111100000011100",
  /*15 */ "00000000000000000011111111111000000000000000000111000000000000001111000000001100",
  /*16 */ "00000000000000000001111111111000000000000001111111000000000000000110000000000000",
  /*17 */ "00000000000000000000111111111100000000000011111111110000000000000000000000000000",
  /*18 */ "00000000000000000000011111111100000000000111111111111100000000000000000000000000",
  /*19 */ "00000000000000000000001111111110000000001111111111111110000000000000000000000000",
  /*20 */ "00000000000000000000011111111110000000011111111111111110000000000000000000000000",
  /*21 */ "00000000000000000000011111111111000000111111111111111100000000000000000000000000",
  /*22 */ "00000000000000000000001111111111100001111111111111111000000000000000000000000000",
  /*23 */ "00000000000000000000001111111111100011111111111111110000000000000000000000000000",
  /*24 */ "00000000000000000000000111111111110011111111111111100000000000000000000000000000",
  /*25 */ "00000000000000000000000011111111111011111111111111000000000000000000000000000000",
  /*26 */ "00000000000000000000000001111111110111111111111100000000000000000000000000000000",
  /*27 */ "00000000000000000000000000111111110111111111111000000000000000000000000000000000",
  /*28 */ "00000000000000000000000000011111100011111111100000000000000000000000000000000000",
  /*29 */ "00000000000000000000000000001111000001111111000000000000000000000000001100000000",
  /*30 */ "00000000000000000000000000000110000000111110000000000000000000000000111110000000",
  /*31 */ "00000000000000000000000000000000000000011100000000000000000000000001111111000000",
  /*32 */ "00000000000000000000000000000000000000001100000000000000000000000011111111100000",
  /*33 */ "00000000000000000000000000000000000000000000000000000000000000000111111111100000",
  /*34 */ "00000000000000000000000000000000000000000000000000000000000000000011111111000000",
  /*35 */ "00000000000000000000000000000000000000000000000000000000000000000001111110000000",
  /*36 */ "00000000000000000000000000000000000000000000000000000000000000000000111100000000",
  /*37 */ "00000000000000000000000000000000000000000000000000000000000000000000011000000000",
  /*38 */ "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  /*39 */ "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
];

/* Region bounding boxes in grid coords [colMin, colMax, rowMin, rowMax] */
const REGION_BOUNDS: Record<string, [number, number, number, number]> = {
  us:    [8, 22, 3, 11],
  eu:    [42, 56, 2, 11],
  uk:    [40, 43, 2, 6],
  japan: [69, 73, 4, 9],
  intl:  [-1, -1, -1, -1], // special — no geographic bounds
};

const REGION_COLORS: Record<string, string> = {
  us: "#3B82F6",
  eu: "#22C55E",
  uk: "#22C55E",
  japan: "#F59E0B",
};

/* ------------------------------------------------------------------ */
/*  Dot-matrix world map component                                     */
/* ------------------------------------------------------------------ */

function DotMatrixWorldMap() {
  const dots = useMemo(() => {
    const result: { col: number; row: number; region: string | null }[] = [];
    for (let r = 0; r < WORLD_DOT_ROWS.length; r++) {
      const row = WORLD_DOT_ROWS[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] === "1") {
          let region: string | null = null;
          for (const [key, [cMin, cMax, rMin, rMax]] of Object.entries(REGION_BOUNDS)) {
            if (key === "intl") continue;
            if (c >= cMin && c <= cMax && r >= rMin && r <= rMax) {
              region = key;
              break;
            }
          }
          result.push({ col: c, row: r, region });
        }
      }
    }
    return result;
  }, []);

  const COLS = 80;
  const ROWS = 40;
  const SPACING = 10;
  const DOT_R = 1.8;
  const svgW = COLS * SPACING;
  const svgH = ROWS * SPACING;

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #F3F4F6",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full"
        style={{ display: "block" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Subtle grid background */}
        <defs>
          <pattern id="dotgrid" width={SPACING} height={SPACING} patternUnits="userSpaceOnUse">
            <circle cx={SPACING / 2} cy={SPACING / 2} r={0.5} fill="#E5E7EB" opacity={0.5} />
          </pattern>
        </defs>
        <rect width={svgW} height={svgH} fill="url(#dotgrid)" />

        {/* Land dots */}
        {dots.map(({ col, row, region }) => {
          const cx = col * SPACING + SPACING / 2;
          const cy = row * SPACING + SPACING / 2;
          const color = region ? REGION_COLORS[region] : "#CBD5E1";
          const opacity = region ? 0.75 : 0.35;
          const r = region ? DOT_R + 0.3 : DOT_R;
          return (
            <circle
              key={`${col}-${row}`}
              cx={cx}
              cy={cy}
              r={r}
              fill={color}
              opacity={opacity}
            />
          );
        })}

        {/* Region label backgrounds + text */}
        {REGIONS.filter((rg) => rg.id !== "intl").map((rg) => {
          // Position labels near center of each region bounding box
          const bounds = REGION_BOUNDS[rg.id];
          if (!bounds) return null;
          const [cMin, cMax, rMin, rMax] = bounds;
          const lx = ((cMin + cMax) / 2) * SPACING + SPACING / 2;
          const ly = rMax * SPACING + SPACING * 2.5;
          return (
            <g key={rg.id}>
              {/* Background pill */}
              <rect
                x={lx - 34}
                y={ly - 8}
                width={68}
                height={18}
                rx={9}
                fill="#FFFFFF"
                stroke={rg.color}
                strokeWidth={1}
                opacity={0.95}
              />
              <text
                x={lx}
                y={ly + 4}
                textAnchor="middle"
                fontSize={9}
                fontWeight={600}
                fill={rg.color}
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {rg.abbr} - {rg.count} stds
              </text>
            </g>
          );
        })}

        {/* International label at bottom center */}
        <g>
          <rect
            x={svgW / 2 - 42}
            y={svgH - 32}
            width={84}
            height={20}
            rx={10}
            fill="#FFFFFF"
            stroke="#A855F7"
            strokeWidth={1}
            opacity={0.95}
          />
          <text
            x={svgW / 2}
            y={svgH - 18}
            textAnchor="middle"
            fontSize={9}
            fontWeight={600}
            fill="#A855F7"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            ISO Int&apos;l - 19 stds
          </text>
        </g>

        {/* Pulse rings for highlighted regions */}
        {REGIONS.filter((rg) => rg.id !== "intl").map((rg) => {
          const bounds = REGION_BOUNDS[rg.id];
          if (!bounds) return null;
          const [cMin, cMax, rMin, rMax] = bounds;
          const cx = ((cMin + cMax) / 2) * SPACING + SPACING / 2;
          const cy = ((rMin + rMax) / 2) * SPACING + SPACING / 2;
          return (
            <circle
              key={`pulse-${rg.id}`}
              cx={cx}
              cy={cy}
              r={14}
              fill="none"
              stroke={rg.color}
              strokeWidth={1.5}
              opacity={0.3}
            >
              <animate
                attributeName="r"
                values="10;22;10"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.4;0.05;0.4"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

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
      className="relative rounded-xl overflow-hidden p-6"
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
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: color + "14" }}
        >
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      <span ref={ref} className="text-4xl font-bold tabular-nums" style={{ color: "#0F1117" }}>
        {count}
      </span>
      <p className="text-sm mt-1 font-medium" style={{ color: "#6B7280" }}>{label}</p>
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
      className="relative rounded-xl p-5 group transition-all duration-300"
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

      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: domain.color + "14" }}
        >
          <domain.icon size={18} style={{ color: domain.color }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "#0F1117" }}>{domain.name}</h3>
          <p className="text-[11px]" style={{ color: "#9CA3AF" }}>{domain.equipment} equipment types</p>
        </div>
      </div>

      <div className="flex gap-3 mb-3">
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

      <div className="flex flex-wrap gap-1.5">
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

function CoverageCell({ value }: { value: number; maxInRow: number }) {
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
      className="rounded-lg px-4 py-3 flex items-center gap-3 transition-all"
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
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: accentColor + "10" }}
      >
        <tool.icon size={14} style={{ color: accentColor }} />
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
      {/* ── Section 1: Hero Stats Bar ────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background gradient — subtle light wash */}
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full opacity-[0.06] blur-3xl"
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
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: "#0F1117" }}>
              Platform Capabilities
            </h1>
            <p className="mt-2 text-sm max-w-xl mx-auto" style={{ color: "#6B7280" }}>
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
      <section className="py-16" style={{ borderTop: "1px solid #F3F4F6" }}>
        <div className="mx-auto max-w-6xl px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
              Global Regulatory Coverage
            </h2>
            <p className="mt-2 text-2xl font-bold sm:text-3xl" style={{ color: "#0F1117" }}>
              21 standards with structured clause data
            </p>
            <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
              55 total standards across 5 jurisdictions
            </p>
          </motion.div>

          {/* Dot-matrix world map */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <DotMatrixWorldMap />
          </motion.div>
        </div>
      </section>

      {/* ── Section 3: Domain Grid ───────────────────────────────── */}
      <section className="py-16" style={{ borderTop: "1px solid #F3F4F6" }}>
        <div className="mx-auto max-w-6xl px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
              Audit Domains
            </h2>
            <p className="mt-2 text-2xl font-bold sm:text-3xl" style={{ color: "#0F1117" }}>
              Eight specialized inspection domains
            </p>
            <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
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
      <section className="py-16" style={{ borderTop: "1px solid #F3F4F6" }}>
        <div className="mx-auto max-w-6xl px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
              Coverage Matrix
            </h2>
            <p className="mt-2 text-2xl font-bold sm:text-3xl" style={{ color: "#0F1117" }}>
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
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider w-48"
                      style={{ color: "#9CA3AF" }}
                    >
                      Domain
                    </th>
                    {JURISDICTIONS.map((j) => (
                      <th
                        key={j}
                        className="px-2 py-3 text-xs font-semibold uppercase tracking-wider text-center"
                        style={{ color: "#9CA3AF" }}
                      >
                        {j === "Intl" ? "Int'l" : j}
                      </th>
                    ))}
                    <th
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-center"
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
                    const maxVal = Math.max(...Object.values(row));
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
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <domain.icon size={14} style={{ color: domain.color }} />
                            <span className="text-sm font-medium" style={{ color: "#374151" }}>
                              {domain.name}
                            </span>
                          </div>
                        </td>
                        {JURISDICTIONS.map((j) => (
                          <CoverageCell key={j} value={row[j]} maxInRow={maxVal} />
                        ))}
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-sm font-bold" style={{ color: "#0F1117" }}>{total}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "1px solid #F3F4F6" }}>
                    <td
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
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
                        <td key={j} className="px-2 py-3 text-center">
                          <span className="text-sm font-bold" style={{ color: "#3B82F6" }}>{colTotal}</span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center">
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
          <div className="flex items-center justify-center gap-6 mt-4">
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

      {/* ── Section 5: AI Tools ──────────────────────────────────── */}
      <section className="py-16" style={{ borderTop: "1px solid #F3F4F6" }}>
        <div className="mx-auto max-w-6xl px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
              AI Tool Suite
            </h2>
            <p className="mt-2 text-2xl font-bold sm:text-3xl" style={{ color: "#0F1117" }}>
              14 specialized function-calling tools
            </p>
            <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
              Gemini calls these tools automatically based on voice commands and visual context
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Field Tools */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "#F59E0B14" }}
                >
                  <Camera size={16} style={{ color: "#F59E0B" }} />
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
              <div className="space-y-2">
                {FIELD_TOOLS.map((tool, i) => (
                  <ToolCard key={tool.fn} tool={tool} index={i} accentColor="#F59E0B" />
                ))}
              </div>
            </div>

            {/* Desk Tools */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "#3B82F614" }}
                >
                  <Mic size={16} style={{ color: "#3B82F6" }} />
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
      <section className="py-16" style={{ borderTop: "1px solid #F3F4F6" }}>
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

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
      <div className="h-8" />
    </div>
  );
}
