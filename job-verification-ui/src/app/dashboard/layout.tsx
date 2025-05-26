"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/ui/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    // Clear the auth cookie
    document.cookie = "auth_session=; path=/; max-age=0";
    // Redirect to login page
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <MobileNav />
            <Link href="/dashboard" className="text-xl font-bold">
              Job Verification Dashboard
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === "/dashboard"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                Pending Jobs
              </Link>
              <Link
                href="/dashboard/approved"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === "/dashboard/approved"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                Approved
              </Link>
              <Link
                href="/dashboard/rejected"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === "/dashboard/rejected"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                Rejected
              </Link>
            </nav>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </header>

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
