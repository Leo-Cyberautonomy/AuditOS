"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Upload,
  BookOpen,
  CheckCircle,
  BarChart3,
  Wrench,
  PenTool,
  ClipboardList,
  Package,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Radio,
} from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { useT } from "@/lib/i18n";
import { DEMO_AUDITOR } from "@/lib/demo-data";
import { useCompanion } from "@/lib/companion/CompanionProvider";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
  badge?: number | string;
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export function AppSidebar() {
  const pathname = usePathname();
  const { t, locale, toggle } = useT();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const {
    status: companionStatus,
    connect: connectCompanion,
    disconnect: disconnectCompanion,
  } = useCompanion();

  // Extract caseId from URL path: /cases/{caseId}/...
  const caseIdFromUrl = (() => {
    const match = pathname.match(/^\/cases\/([^/]+)/);
    return match ? match[1] : null;
  })();

  const caseId = caseIdFromUrl;
  const showActiveCase = caseId !== null;

  /* ─── Navigation sections ─────────────────────────────────────────────── */

  const overviewItems: NavItem[] = [
    {
      href: "/dashboard",
      label: t.nav.overview ?? "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/cases",
      label: t.nav.allCases ?? "Alle Falle",
      icon: FolderOpen,
      badge: 3,
    },
  ];

  const caseTabItems: NavItem[] = [
    {
      href: `/cases/${caseId}/overview`,
      label: t.nav.overview ?? "Ubersicht",
      icon: FileText,
    },
    {
      href: `/cases/${caseId}/live-audit`,
      label: t.nav.liveAudit ?? "Live Audit",
      icon: Radio,
    },
    {
      href: `/cases/${caseId}/documents`,
      label: t.nav.documents ?? "Dokumente",
      icon: Upload,
      badge: 8,
    },
    {
      href: `/cases/${caseId}/evidence`,
      label: t.nav.evidenceLedger ?? "Nachweisbuch",
      icon: BookOpen,
      badge: 12,
    },
    {
      href: `/cases/${caseId}/review`,
      label: t.nav.reviewQueue ?? "Prufwarteschlange",
      icon: CheckCircle,
      badge: 5,
    },
    {
      href: `/cases/${caseId}/analytics`,
      label: t.nav.dashboard ?? "Analysen",
      icon: BarChart3,
    },
    {
      href: `/cases/${caseId}/measures`,
      label: t.nav.measures ?? "Massnahmen",
      icon: Wrench,
    },
    {
      href: `/cases/${caseId}/report`,
      label: t.nav.report ?? "Bericht",
      icon: PenTool,
    },
    {
      href: `/cases/${caseId}/compliance`,
      label: t.nav.compliance ?? "Konformitat",
      icon: ClipboardList,
    },
    {
      href: `/cases/${caseId}/exports`,
      label: t.nav.exports ?? "Exporte",
      icon: Package,
    },
    {
      href: `/cases/${caseId}/audit-log`,
      label: t.nav.auditLog ?? "Protokoll",
      icon: ScrollText,
    },
  ];

  /* ─── Helpers ─────────────────────────────────────────────────────────── */

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/cases") return pathname === "/cases";
    return pathname === href || pathname.startsWith(href + "/");
  }

  function renderNavItem(item: NavItem) {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group"
        style={{
          backgroundColor: active ? "#1E2D45" : "transparent",
          color: active ? "#FFFFFF" : "#9CA3AF",
          borderLeft: active ? "3px solid #D97706" : "3px solid transparent",
        }}
      >
        <Icon
          size={16}
          style={{ color: active ? "#FCD34D" : "#6B7280" }}
          className="flex-shrink-0 transition-colors"
        />
        <span className="font-medium flex-1">{item.label}</span>
        {item.badge !== undefined && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
            style={{
              backgroundColor: active ? "#D97706" : "#374151",
              color: active ? "#FFFFFF" : "#9CA3AF",
            }}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  }

  /* ─── Render ──────────────────────────────────────────────────────────── */

  return (
    <aside
      className="fixed inset-y-0 left-0 w-60 flex flex-col z-20"
      style={{ backgroundColor: "#0F1117" }}
    >
      {/* ─── Logo header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <img
          src="/logo.png"
          alt="AuditAI"
          className="flex-shrink-0"
          style={{ height: 30, width: "auto" }}
        />
        <div className="flex-1">
          <span className="text-white text-sm font-semibold tracking-tight">AuditAI</span>
          <span
            className="block text-[10px] font-medium tracking-wide"
            style={{ color: "#FCD34D" }}
          >
            BETA &middot; v1.0
          </span>
        </div>
        {/* Language toggle */}
        <button
          onClick={toggle}
          className="text-[10px] font-bold px-2 py-1 rounded border transition-all"
          style={{
            borderColor: "#374151",
            color: locale === "en" ? "#FCD34D" : "#6B7280",
            backgroundColor: locale === "en" ? "#1E2D45" : "transparent",
          }}
          title={t.langToggleTitle}
        >
          {locale === "de" ? "EN" : "DE"}
        </button>
        {/* AI Companion toggle */}
        <button
          onClick={() => {
            if (companionStatus === "connected") {
              disconnectCompanion();
            } else if (companionStatus === "idle" || companionStatus === "error") {
              connectCompanion();
            }
          }}
          className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
            companionStatus === "connected"
              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
              : companionStatus === "connecting"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          }`}
          title={
            companionStatus === "connected"
              ? "AI Companion Active"
              : companionStatus === "connecting"
                ? "Connecting..."
                : "Activate AI Companion"
          }
        >
          {companionStatus === "connected" ? "AI \u25CF" : companionStatus === "connecting" ? "AI \u2026" : "AI"}
        </button>
        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded transition-colors"
          style={{ color: "#6B7280" }}
          title="Toggle sidebar"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ─── Scrollable nav area ─────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Overview section */}
        <p className="px-2 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          {t.nav.overviewSection ?? "UBERSICHT"}
        </p>
        {overviewItems.map(renderNavItem)}

        {/* Active case section */}
        {showActiveCase && (
          <>
            <div className="my-3 border-t border-white/10" />
            <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              {t.nav.activeCase ?? "AKTIVER FALL"}
            </p>

            {/* Case identity card */}
            <div className="px-3 py-2 mb-1">
              <p className="text-white text-xs font-semibold leading-snug">
                {caseId}
              </p>
            </div>

            {/* Separator */}
            <div className="mx-3 mb-1 border-t border-white/10" />

            {/* Case tabs */}
            {caseTabItems.map(renderNavItem)}
          </>
        )}
      </nav>

      {/* ─── Auditor info footer ─────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
            style={{ backgroundColor: "#374151" }}
          >
            {DEMO_AUDITOR.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <p className="text-white text-[11px] font-medium leading-tight">
              {DEMO_AUDITOR.name}
            </p>
            <p className="text-gray-500 text-[10px]">{DEMO_AUDITOR.e_control_id}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
