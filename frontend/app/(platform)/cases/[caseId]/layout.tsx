"use client";

import { useParams } from "next/navigation";
import { CaseHeader } from "@/components/layout/CaseHeader";
import { CaseTabBar } from "@/components/layout/CaseTabBar";

export default function CaseLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId;

  return (
    <div className="flex flex-col min-h-screen">
      <CaseHeader caseId={caseId} />
      <CaseTabBar caseId={caseId} />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
