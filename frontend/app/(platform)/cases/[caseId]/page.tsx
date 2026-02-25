"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CaseRootPage() {
  const params = useParams<{ caseId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/cases/${params.caseId}/overview`);
  }, [params.caseId, router]);

  return null;
}
