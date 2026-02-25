"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Upload, FileText, ClipboardList, Zap, BarChart3 } from "lucide-react";
import { DEMO_AUDITOR, DEMO_COMPANY } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";

export function Sidebar() {
  const pathname = usePathname();
  const { t, locale, toggle } = useT();

  const NAV_ITEMS = [
    { href: "/upload", label: t.nav.upload, icon: Upload, step: 1 },
    { href: "/report", label: t.nav.report, icon: FileText, step: 2 },
    { href: "/compliance", label: t.nav.compliance, icon: ClipboardList, step: 3 },
  ];

  return (
    <aside
      className="fixed inset-y-0 left-0 w-60 flex flex-col z-20"
      style={{ backgroundColor: "#0F1117" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#D97706" }}
        >
          <Zap size={15} className="text-white" />
        </div>
        <div className="flex-1">
          <span className="text-white text-sm font-semibold tracking-tight">AuditOS</span>
          <span
            className="block text-[10px] font-medium tracking-wide"
            style={{ color: "#FCD34D" }}
          >
            DEMO · v0.1
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
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-2 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          {t.nav.workflowLabel}
        </p>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group relative"
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
              <span className="font-medium">{item.label}</span>
              {active && (
                <span
                  className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "#D97706", color: "white" }}
                >
                  {item.step}
                </span>
              )}
            </Link>
          );
        })}

        {/* Analytics section */}
        <p className="px-2 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          {t.nav.analyticsLabel}
        </p>
        {(() => {
          const href = "/dashboard";
          const active = pathname === href;
          return (
            <Link
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
              style={{
                backgroundColor: active ? "#1E2D45" : "transparent",
                color: active ? "#FFFFFF" : "#9CA3AF",
                borderLeft: active ? "3px solid #D97706" : "3px solid transparent",
              }}
            >
              <BarChart3 size={16} style={{ color: active ? "#FCD34D" : "#6B7280" }} className="flex-shrink-0" />
              <span className="font-medium">{t.nav.dashboard}</span>
            </Link>
          );
        })()}
      </nav>

      {/* Client info */}
      <div className="px-4 py-3 border-t border-white/10 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
            {t.nav.currentClient}
          </p>
          <p className="text-white text-xs font-medium leading-snug">{DEMO_COMPANY.name}</p>
          <p className="text-gray-500 text-[11px] mt-0.5">
            {DEMO_COMPANY.employees} MA · {DEMO_COMPANY.building_area_m2.toLocaleString("de-AT")} m²
          </p>
          <p className="text-gray-500 text-[11px]">Freistadt · ÖNACE {DEMO_COMPANY.nace_code}</p>
        </div>

        {/* Auditor */}
        <div className="flex items-center gap-2.5 pt-2 border-t border-white/10">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
            style={{ backgroundColor: "#374151" }}
          >
            {DEMO_AUDITOR.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <p className="text-white text-[11px] font-medium leading-tight">{DEMO_AUDITOR.name}</p>
            <p className="text-gray-500 text-[10px]">{DEMO_AUDITOR.e_control_id}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
