"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { CompanionProvider } from "@/lib/companion/CompanionProvider";
import CompanionSidebar from "@/lib/companion/CompanionSidebar";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompanionProvider>
      <div className="flex min-h-screen" style={{ backgroundColor: "#FAFAFA" }}>
        <AppSidebar />
        <main className="flex-1 min-h-screen overflow-x-hidden" style={{ marginLeft: 240 }}>
          {children}
        </main>
        <CompanionSidebar />
      </div>
    </CompanionProvider>
  );
}
