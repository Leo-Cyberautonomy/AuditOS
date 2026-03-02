"use client";

import { useRef, useCallback, useState } from "react";
import { toPng } from "html-to-image";
import {
  FileText, Table2, Image, Zap, ScanSearch, FileOutput,
  Brain, BookOpen, Calculator, Database, ClipboardCheck, Cog,
  FileBarChart, Upload, LayoutTemplate, Lock, ShieldCheck, Users,
  Download, ChevronDown, Eye, EyeOff, Fingerprint, HardDrive,
  FolderLock, KeyRound, ArrowRight, AlertTriangle, CheckCircle2,
  XCircle, Scale, GitBranch, FileSearch, UserCheck, ShieldAlert,
  Gauge, Workflow, CircleDot,
} from "lucide-react";

const FONT = "'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif";
const BG = "#FFFFFF";
const T1 = "#1D1D1F";
const T2 = "#6E6E73";
const T3 = "#AEAEB2";

const C = {
  blue:   { a: "#0071E3", bg: "#F0F5FF", bd: "#D0E2FF", lt: "#EBF3FE" },
  teal:   { a: "#00796B", bg: "#E8F5F3", bd: "#B2DFDB", lt: "#F0FAF8" },
  purple: { a: "#6B21A8", bg: "#F5F0FF", bd: "#DDD6FE", lt: "#FAF5FF" },
  amber:  { a: "#B45309", bg: "#FFF8EB", bd: "#FDE68A", lt: "#FFFBF0" },
  green:  { a: "#15803D", bg: "#F0FDF4", bd: "#BBF7D0", lt: "#F5FFF8" },
  red:    { a: "#B91C1C", bg: "#FEF2F2", bd: "#FECACA", lt: "#FFF5F5" },
};

/* ── Shared ──────────────────────────────────────────────────────── */

function Btn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1D1D1F] hover:bg-[#333] text-white font-semibold text-[15px] transition-colors disabled:opacity-50 cursor-pointer shadow-lg">
      <Download size={18} />{loading ? "Exporting..." : "Export PNG (3x)"}
    </button>
  );
}

function Footer() {
  return (
    <div className="flex justify-between items-center mt-12 pt-5" style={{ borderTop: "1px solid #E5E5EA" }}>
      <span className="text-[20px]" style={{ color: T3 }}>adatwin.com | AuditOS</span>
      <span className="text-[20px]" style={{ color: T3 }}>Confidential</span>
    </div>
  );
}

function useExp(ref: React.RefObject<HTMLDivElement | null>, name: string) {
  const [l, setL] = useState(false);
  const run = useCallback(async () => {
    if (!ref.current) return;
    setL(true);
    try {
      const u = await toPng(ref.current, { pixelRatio: 3, backgroundColor: BG });
      const a = document.createElement("a"); a.href = u; a.download = name; a.click();
    } finally { setL(false); }
  }, [ref, name]);
  return { run, l };
}

/* ================================================================ *
 *  1. TECHNICAL STACK                                               *
 *  Canvas: 1600px fixed width. Text: 1.5× original. Height: auto.  *
 * ================================================================ */

const layers = [
  { title: "Input Layer", tag: "Untrusted input", c: C.blue,
    icons: [{ i: <FileText size={36}/>, l: "PDF" }, { i: <Table2 size={36}/>, l: "Spreadsheet" }, { i: <Image size={36}/>, l: "Image" }, { i: <Zap size={36}/>, l: "Meter" }],
    items: ["Audit documents", "Technical files", "Energy & load data"] },
  { title: "Processing Layer", tag: "Case-scoped processing", c: C.teal,
    icons: [{ i: <ScanSearch size={36}/>, l: "OCR" }, { i: <FileOutput size={36}/>, l: "Extract" }],
    items: ["OCR & document parsing", "Structured field extraction"] },
  { title: "AI & Logic Layer", tag: "AI assists — rules decide", c: C.purple,
    icons: [{ i: <Brain size={36}/>, l: "LLM" }, { i: <BookOpen size={36}/>, l: "RAG" }, { i: <Calculator size={36}/>, l: "Engine" }],
    items: ["Local LLM (Ollama) — extraction & drafting", "RAG — templates & approved knowledge only", "Deterministic engine — KPIs, units, compliance logic"] },
  { title: "Core Platform", tag: "Audit-grade truth layer", c: C.amber,
    icons: [{ i: <Database size={36}/>, l: "Ledger" }, { i: <ClipboardCheck size={36}/>, l: "Review" }, { i: <Cog size={36}/>, l: "Calc" }],
    items: ["Evidence Ledger (source of truth)", "Review Queue (expert validation)", "Calculation engine"] },
  { title: "Output Layer", tag: "Reproducible & defensible", c: C.green,
    icons: [{ i: <FileBarChart size={36}/>, l: "Report" }, { i: <Upload size={36}/>, l: "Export" }, { i: <LayoutTemplate size={36}/>, l: "Template" }],
    items: ["Controlled report drafts", "Standards-aligned exports", "Versioned templates"] },
];

function D1({ r }: { r: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={r} className="w-[1600px] rounded-3xl p-14" style={{ fontFamily: FONT, background: BG }}>
      <p className="text-[21px] font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: T3 }}>Platform Architecture</p>
      <h1 className="text-[64px] font-bold mb-4 tracking-tight" style={{ color: T1 }}>AuditOS Technical Stack</h1>
      <div className="w-20 h-[5px] rounded-full mb-12" style={{ background: C.amber.a }} />

      {layers.map((ly, i) => (
        <div key={ly.title}>
          <div className="rounded-2xl px-8 py-6 flex items-start gap-8" style={{ background: ly.c.bg, border: `2px solid ${ly.c.bd}` }}>
            <div className="flex gap-4 pt-1 shrink-0">
              {ly.icons.map(ic => (
                <div key={ic.l} className="flex flex-col items-center gap-2">
                  <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center" style={{ background: BG, color: ly.c.a, boxShadow: `0 2px 6px ${ly.c.bd}` }}>{ic.i}</div>
                  <span className="text-[18px] font-semibold" style={{ color: ly.c.a }}>{ic.l}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h3 className="text-[33px] font-bold mb-2" style={{ color: ly.c.a }}>{ly.title}</h3>
              <div className="flex flex-col gap-1">
                {ly.items.map(item => (
                  <p key={item} className="text-[26px] leading-relaxed" style={{ color: T2 }}>{item}</p>
                ))}
              </div>
            </div>
            <div className="shrink-0 self-start mt-2 px-6 py-2.5 rounded-full text-[20px] font-bold whitespace-nowrap"
                 style={{ background: BG, color: ly.c.a, border: `2px solid ${ly.c.bd}` }}>{ly.tag}</div>
          </div>
          {i < layers.length - 1 && <div className="flex justify-center py-2"><ChevronDown size={30} style={{ color: T3 }} /></div>}
        </div>
      ))}

      <div className="mt-5 rounded-2xl px-8 py-6 flex items-center gap-8" style={{ background: C.red.bg, border: `2px solid ${C.red.bd}` }}>
        <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center shrink-0" style={{ background: BG, color: C.red.a, boxShadow: `0 2px 6px ${C.red.bd}` }}><Lock size={36} /></div>
        <h3 className="text-[30px] font-bold shrink-0" style={{ color: C.red.a }}>Security & Compliance</h3>
        <div className="flex items-center gap-10 text-[24px]" style={{ color: T2 }}>
          <span className="flex items-center gap-3"><ShieldCheck size={26} style={{ color: C.red.a }} />Case isolation</span>
          <span className="flex items-center gap-3"><Lock size={26} style={{ color: C.red.a }} />Tenant-scoped encryption</span>
          <span className="flex items-center gap-3"><Users size={26} style={{ color: C.red.a }} />RBAC & audit logs</span>
        </div>
      </div>
      <Footer />
    </div>
  );
}

/* ================================================================ *
 *  2. DATA USAGE & ISOLATION                                        *
 * ================================================================ */

function DI({ icon, label, desc, c }: { icon: React.ReactNode; label: string; desc: string; c: typeof C.blue }) {
  return (
    <div className="flex items-start gap-4 py-3">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.bg, color: c.a, border: `1.5px solid ${c.bd}` }}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[24px] font-semibold" style={{ color: T1 }}>{label}</p>
        <p className="text-[21px] leading-snug" style={{ color: T2 }}>{desc}</p>
      </div>
    </div>
  );
}

function D2({ r }: { r: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={r} className="w-[1600px] rounded-3xl p-14" style={{ fontFamily: FONT, background: BG }}>
      <p className="text-[21px] font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: T3 }}>Data Architecture</p>
      <h1 className="text-[64px] font-bold mb-4 tracking-tight" style={{ color: T1 }}>Data Usage & Isolation</h1>
      <div className="w-20 h-[5px] rounded-full mb-12" style={{ background: C.teal.a }} />

      {/* Tenant boundary */}
      <div className="rounded-2xl p-10 mb-8" style={{ background: C.blue.lt, border: `2px dashed ${C.blue.bd}` }}>
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck size={28} style={{ color: C.blue.a }} />
          <span className="text-[30px] font-bold" style={{ color: C.blue.a }}>Tenant Boundary</span>
          <span className="text-[22px] ml-3" style={{ color: T2 }}>Each audit firm operates in complete isolation</span>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {["AOS-2024-001", "AOS-2024-002"].map(id => (
            <div key={id} className="rounded-xl p-6" style={{ background: C.teal.lt, border: `2px dashed ${C.teal.bd}` }}>
              <div className="flex items-center gap-3 mb-4">
                <FolderLock size={24} style={{ color: C.teal.a }} />
                <span className="text-[26px] font-bold" style={{ color: C.teal.a }}>Case {id}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[{ i: <FileText size={28}/>, l: "Documents" }, { i: <Database size={28}/>, l: "Evidence" }, { i: <Brain size={28}/>, l: "AI Outputs" }].map(d => (
                  <div key={d.l} className="rounded-lg py-4 text-center" style={{ background: BG, border: `1.5px solid ${C.teal.bd}` }}>
                    <div className="flex justify-center mb-2" style={{ color: C.teal.a }}>{d.i}</div>
                    <span className="text-[21px] font-semibold" style={{ color: C.teal.a }}>{d.l}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3 px-6 py-4 rounded-xl" style={{ background: C.red.lt, border: `2px solid ${C.red.bd}` }}>
          <XCircle size={24} style={{ color: C.red.a }} className="shrink-0" />
          <span className="text-[22px] font-semibold" style={{ color: C.red.a }}>No cross-case data access — AI models cannot reference data from other cases</span>
        </div>
      </div>

      {/* 3 columns */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl p-7" style={{ background: C.blue.lt, border: `2px solid ${C.blue.bd}` }}>
          <h3 className="text-[30px] font-bold mb-1" style={{ color: C.blue.a }}>Data Classification</h3>
          <p className="text-[20px] mb-4" style={{ color: T3 }}>What enters the system</p>
          <DI icon={<FileText size={22}/>} label="Raw Uploads" desc="Original PDFs, images, spreadsheets — immutable store" c={C.blue} />
          <DI icon={<FileSearch size={22}/>} label="Extracted Fields" desc="OCR text, parsed values — linked to source document" c={C.blue} />
          <DI icon={<Brain size={22}/>} label="AI-Generated Drafts" desc="LLM outputs — always marked as 'draft', never auto-approved" c={C.blue} />
          <DI icon={<CheckCircle2 size={22}/>} label="Approved Records" desc="Expert-validated evidence — enters the Evidence Ledger" c={C.blue} />
        </div>
        <div className="rounded-2xl p-7" style={{ background: C.amber.lt, border: `2px solid ${C.amber.bd}` }}>
          <h3 className="text-[30px] font-bold mb-1" style={{ color: C.amber.a }}>Access Controls</h3>
          <p className="text-[20px] mb-4" style={{ color: T3 }}>Who sees what</p>
          <DI icon={<Users size={22}/>} label="Role-Based Access" desc="Auditor, Reviewer, Admin — scoped per case" c={C.amber} />
          <DI icon={<Eye size={22}/>} label="Read Audit Trail" desc="Every data access logged with timestamp & user" c={C.amber} />
          <DI icon={<EyeOff size={22}/>} label="No Bulk Export" desc="Data leaves only through controlled report generation" c={C.amber} />
          <DI icon={<KeyRound size={22}/>} label="Session-Scoped Tokens" desc="Short-lived auth tokens, no persistent API keys" c={C.amber} />
        </div>
        <div className="rounded-2xl p-7" style={{ background: C.purple.lt, border: `2px solid ${C.purple.bd}` }}>
          <h3 className="text-[30px] font-bold mb-1" style={{ color: C.purple.a }}>Storage & Encryption</h3>
          <p className="text-[20px] mb-4" style={{ color: T3 }}>How data is protected</p>
          <DI icon={<Lock size={22}/>} label="Encryption at Rest" desc="AES-256 per-tenant encryption keys" c={C.purple} />
          <DI icon={<HardDrive size={22}/>} label="Isolated Storage" desc="Tenant data in separate logical partitions" c={C.purple} />
          <DI icon={<Fingerprint size={22}/>} label="Document Hashing" desc="SHA-256 integrity verification on all uploads" c={C.purple} />
          <DI icon={<Scale size={22}/>} label="Retention Policies" desc="Configurable per regulation (EEffG, EDL-G)" c={C.purple} />
        </div>
      </div>

      {/* Data flow */}
      <div className="rounded-2xl px-8 py-6 flex items-center gap-6" style={{ background: C.teal.lt, border: `2px solid ${C.teal.bd}` }}>
        <span className="text-[22px] font-bold uppercase tracking-widest shrink-0" style={{ color: C.teal.a }}>Data Flow</span>
        <div className="flex items-center gap-2 flex-wrap">
          {["Upload", "Validate", "Parse", "Store", "Review", "Approve", "Export"].map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className="px-5 py-2.5 rounded-lg text-[22px] font-semibold" style={{ background: BG, color: C.teal.a, border: `1.5px solid ${C.teal.bd}` }}>{s}</span>
              {i < 6 && <ArrowRight size={20} style={{ color: T3 }} />}
            </span>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

/* ================================================================ *
 *  3. AI GOVERNANCE                                                 *
 * ================================================================ */

function RR({ risk, level, mit, icon }: { risk: string; level: "high"|"medium"|"low"; mit: string; icon: React.ReactNode }) {
  const lc = { high: { c: C.red, l: "HIGH" }, medium: { c: C.amber, l: "MEDIUM" }, low: { c: C.green, l: "LOW" } }[level];
  return (
    <div className="flex items-center gap-5 py-5 px-7 rounded-xl" style={{ background: lc.c.lt, border: `2px solid ${lc.c.bd}` }}>
      <div className="shrink-0" style={{ color: lc.c.a }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[24px] font-bold" style={{ color: T1 }}>{risk}</p>
        <p className="text-[21px]" style={{ color: T2 }}>{mit}</p>
      </div>
      <span className="text-[18px] font-black uppercase tracking-widest shrink-0 px-5 py-2 rounded-lg" style={{ color: lc.c.a, background: lc.c.bg, border: `1.5px solid ${lc.c.bd}` }}>{lc.l}</span>
    </div>
  );
}

function D3({ r }: { r: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={r} className="w-[1600px] rounded-3xl p-14" style={{ fontFamily: FONT, background: BG }}>
      <p className="text-[21px] font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: T3 }}>Responsible AI Framework</p>
      <h1 className="text-[64px] font-bold mb-4 tracking-tight" style={{ color: T1 }}>AI Governance & Risk Management</h1>
      <div className="w-20 h-[5px] rounded-full mb-12" style={{ background: C.purple.a }} />

      {/* Core principle */}
      <div className="rounded-2xl px-8 py-7 mb-8 flex items-center gap-7" style={{ background: C.purple.lt, border: `2px solid ${C.purple.bd}` }}>
        <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center shrink-0" style={{ background: BG, color: C.purple.a, boxShadow: `0 2px 6px ${C.purple.bd}` }}>
          <Scale size={36} />
        </div>
        <div>
          <h3 className="text-[33px] font-bold" style={{ color: C.purple.a }}>Core Principle: AI Assists — Rules Decide</h3>
          <p className="text-[24px] mt-2" style={{ color: T2 }}>AI accelerates the auditor&apos;s workflow but never makes autonomous decisions. Every AI output requires human validation before it enters the audit record.</p>
        </div>
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {[
          { icon: <Brain size={30}/>, title: "AI Processing", items: ["LLM extraction", "Draft generation", "Pattern detection"], c: C.purple, label: "Automated" },
          { icon: <ShieldAlert size={30}/>, title: "Guardrails", items: ["Scope drift detection", "Hallucination flags", "Confidence scoring"], c: C.amber, label: "System checks" },
          { icon: <UserCheck size={30}/>, title: "Human Review", items: ["Expert validation queue", "Accept / reject / defer", "Evidence linking"], c: C.blue, label: "Human-in-the-loop" },
          { icon: <CheckCircle2 size={30}/>, title: "Approved Output", items: ["Evidence Ledger entry", "Audit trail logged", "Report-ready"], c: C.green, label: "Audit-grade" },
        ].map((s, i) => (
          <div key={s.title} className="relative">
            <div className="rounded-2xl p-7 h-full" style={{ background: s.c.lt, border: `2px solid ${s.c.bd}` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: BG, color: s.c.a, boxShadow: `0 2px 5px ${s.c.bd}` }}>{s.icon}</div>
                <div>
                  <h4 className="text-[27px] font-bold" style={{ color: s.c.a }}>{s.title}</h4>
                  <span className="text-[18px] font-semibold uppercase tracking-widest" style={{ color: T3 }}>{s.label}</span>
                </div>
              </div>
              {s.items.map(item => (
                <p key={item} className="text-[22px] py-1.5 flex items-center gap-2.5" style={{ color: T2 }}>
                  <CircleDot size={12} style={{ color: s.c.a }} className="shrink-0" />{item}
                </p>
              ))}
            </div>
            {i < 3 && <div className="absolute top-1/2 -right-4 z-10"><ArrowRight size={22} style={{ color: T3 }} /></div>}
          </div>
        ))}
      </div>

      {/* Risk register */}
      <h2 className="text-[30px] font-bold mb-5 flex items-center gap-3" style={{ color: T1 }}>
        <AlertTriangle size={28} style={{ color: C.amber.a }} />Risk Register & Mitigations
      </h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <RR icon={<Brain size={26}/>} risk="LLM Hallucination" level="high" mit="All AI outputs enter Review Queue — never auto-published to Evidence Ledger" />
        <RR icon={<Gauge size={26}/>} risk="Scope Drift in Reports" level="high" mit="Real-time keyword detection flags off-topic content with visual warning" />
        <RR icon={<GitBranch size={26}/>} risk="Training Data Leakage" level="medium" mit="RAG uses only approved templates — no cross-case or internet data access" />
        <RR icon={<FileSearch size={26}/>} risk="Unverifiable Claims" level="medium" mit="Evidence traceability — every AI claim must link to a source document" />
        <RR icon={<Calculator size={26}/>} risk="Calculation Errors" level="low" mit="KPIs computed by deterministic engine — AI never performs arithmetic" />
        <RR icon={<Workflow size={26}/>} risk="Regulatory Non-Compliance" level="low" mit="Versioned templates locked to DIN/EN standards with section-level controls" />
      </div>

      {/* Audit trail */}
      <div className="rounded-2xl px-8 py-7 flex items-center gap-8" style={{ background: C.purple.lt, border: `2px solid ${C.purple.bd}` }}>
        <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center shrink-0" style={{ background: BG, color: C.purple.a, boxShadow: `0 2px 5px ${C.purple.bd}` }}>
          <ClipboardCheck size={36} />
        </div>
        <div className="flex-1">
          <h3 className="text-[28px] font-bold" style={{ color: C.purple.a }}>Complete Audit Trail</h3>
          <p className="text-[22px] mt-1" style={{ color: T2 }}>Every AI action, human decision, and data modification is logged with timestamp, user, and rationale — fully reproducible for regulatory review</p>
        </div>
        <div className="flex gap-7 shrink-0">
          {[{ i: <Eye size={22}/>, l: "Who accessed" }, { i: <Cog size={22}/>, l: "What changed" }, { i: <FileText size={22}/>, l: "Why decided" }].map(x => (
            <span key={x.l} className="flex items-center gap-2 text-[21px] font-medium" style={{ color: T2 }}>
              <span style={{ color: C.purple.a }}>{x.i}</span>{x.l}
            </span>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function DiagramPage() {
  const r1 = useRef<HTMLDivElement>(null), r2 = useRef<HTMLDivElement>(null), r3 = useRef<HTMLDivElement>(null);
  const e1 = useExp(r1, "AuditOS_Tech_Stack.png"), e2 = useExp(r2, "AuditOS_Data_Isolation.png"), e3 = useExp(r3, "AuditOS_AI_Governance.png");

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center py-12 px-4 gap-16 overflow-x-auto">
      <div className="flex flex-col items-center gap-5"><Btn onClick={e1.run} loading={e1.l} /><D1 r={r1} /></div>
      <div className="flex flex-col items-center gap-5"><Btn onClick={e2.run} loading={e2.l} /><D2 r={r2} /></div>
      <div className="flex flex-col items-center gap-5"><Btn onClick={e3.run} loading={e3.l} /><D3 r={r3} /></div>
    </div>
  );
}
