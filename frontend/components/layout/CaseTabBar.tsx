"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";

interface Tab {
  slug: string;
  label: string;
}

interface CaseTabBarProps {
  caseId: string;
}

export function CaseTabBar({ caseId }: CaseTabBarProps) {
  const pathname = usePathname();
  const { t } = useT();

  const allTabs: Tab[] = [
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

          return (
            <Link
              key={tab.slug}
              href={href}
              className="inline-flex items-center px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors"
              style={{
                color: active ? "#0F1117" : "#6B7280",
                borderColor: active ? "#D97706" : "transparent",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
