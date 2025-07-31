'use client';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='flex min-h-screen flex-col'>
      <DashboardHeader />

      {/* Main content */}
      <main className='container flex-1 px-4 py-6'>{children}</main>

      {/* Footer */}
      <footer className='border-t bg-white py-4'>
        <div className='text-muted-foreground container flex flex-col items-center justify-between px-4 text-sm md:flex-row'>
          <p>&copy; 2025 Job Verification Dashboard</p>
          <p>Built with Next.js and Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}
