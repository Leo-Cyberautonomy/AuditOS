import { Sidebar } from "@/components/layout/Sidebar";

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#FAFAFA" }}>
      <Sidebar />
      <main className="ml-60 flex-1 min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
