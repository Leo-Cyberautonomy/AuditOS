"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio } from "lucide-react";
import { useT } from "@/lib/i18n";

interface Tab {
  slug: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
}

interface CaseTabBarProps {
  caseId: string;
}

export function CaseTabBar({ caseId }: CaseTabBarProps) {
  const pathname = usePathname();
  const { t } = useT();

  const allTabs: Tab[] = [
    { slug: "live-audit", icon: Radio, label: t.nav.liveAudit ?? "Live Audit", badge: "LIVE" },
    { slug: "overview",   label: t.nav.overview ?? "Ubersicht" },
    { slug: "documents",  label: t.nav.documents ?? "Dokumente" },
    { slug: "evidence",   label: t.nav.evidenceLedger ?? "Nachweisbuch" },
    { slug: "review",     label: t.nav.reviewQueue ?? "Prufwarteschlange" },
    { slug: "analytics",  label: t.nav.dashboard ?? "Analysen" },
    { slug: "measures",   label: t.nav.measures ?? "Massnahmen" },
    { slug: "report",     label: t.nav.report ?? "Bericht" },
    { slug: "compliance", label: t.nav.compliance ?? "Konformitat" },
    { slug: "exports",    label: t.nav.exports ?? "Exporte" },
    { slug: "audit-log",  label: t.nav.auditLog ?? "Protokoll" },
  ];

  function isTabActive(slug: string) {
    const tabPath = `/cases/${caseId}/${slug}`;
    return pathname === tabPath || pathname.startsWith(tabPath + "/");
  }

  return (
    <div
      className="border-b overflow-x-auto"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
    >
      <div className="flex gap-1 px-6">
        {allTabs.map((tab) => {
          const active = isTabActive(tab.slug);
          const href = `/cases/${caseId}/${tab.slug}`;
          const isLiveAudit = tab.slug === "live-audit";
          const Icon = tab.icon;

          return (
            <Link
              key={tab.slug}
              href={href}
              className={`inline-flex items-center px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                isLiveAudit ? "font-semibold" : ""
              }`}
              style={{
                color: isLiveAudit
                  ? active
                    ? "#16A34A"
                    : "#22C55E"
                  : active
                    ? "#0F1117"
                    : "#6B7280",
                borderColor: isLiveAudit
                  ? active
                    ? "#16A34A"
                    : "transparent"
                  : active
                    ? "#D97706"
                    : "transparent",
              }}
            >
              {Icon && <Icon size={13} className="mr-1.5 flex-shrink-0" />}
              {tab.label}
              {tab.badge && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
