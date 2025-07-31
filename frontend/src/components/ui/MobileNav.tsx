"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils"; // Assuming you have a utility for class names

// Define your navigation items here
const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/approved", label: "Approved Jobs" },
  { href: "/dashboard/jobs/add", label: "Add Job" },
  // { href: "/dashboard/rejected", label: "Rejected Jobs" }, // Example link
  // Add more navigation items as needed
];

export function MobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden" // Only show on smaller screens
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-xs sm:max-w-sm p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="text-lg font-semibold">
            Navigation
          </SheetTitle>
          <SheetClose asChild className="absolute right-4 top-4">
            <Button variant="ghost" size="icon">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </SheetClose>
        </SheetHeader>
        <nav className="flex flex-col space-y-2 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              passHref
              legacyBehavior // Required for SheetClose to work with Link
            >
              <SheetClose asChild>
                <a
                  className={cn(
                    "block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                    pathname === item.href
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-500"
                  )}
                  onClick={() => setIsOpen(false)} // Close sheet on link click
                >
                  {item.label}
                </a>
              </SheetClose>
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
