import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "AuditAI — AI Field Inspection Platform",
  description: "AI-powered field inspection platform with real-time voice and vision. Supports energy, safety, food, construction, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
