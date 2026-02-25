"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#FAFAFA" }}>
      <AppSidebar />
      <main className="flex-1 min-h-screen overflow-x-hidden" style={{ marginLeft: "240px" }}>
        {children}
      </main>
    </div>
  );
}
