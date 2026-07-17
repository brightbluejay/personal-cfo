import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal CFO — Fictional Demo",
  description: "A local-first cash-flow and consumer-debt planning demo.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
