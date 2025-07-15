"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />

      {/* Main content */}
      <main className="flex-1 container py-6 px-4">{children}</main>

      {/* Footer */}
      <footer className="border-t py-4 bg-white">
        <div className="container flex flex-col md:flex-row items-center justify-between px-4 text-sm text-muted-foreground">
          <p>&copy; 2025 Job Verification Dashboard</p>
          <p>Built with Next.js and Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}
