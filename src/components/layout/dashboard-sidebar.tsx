"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  Sparkles,
  Upload,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Upload", icon: Upload },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-border bg-card flex w-full flex-col border-b md:w-64 md:border-r md:border-b-0">
      <div className="flex items-center justify-between gap-3 px-5 py-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <Sparkles className="size-5" aria-hidden />
          <span>Resume Analyzer</span>
        </Link>
        <ThemeToggle />
      </div>
      <nav className="flex gap-1 px-3 pb-4 md:flex-col" aria-label="Dashboard">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/"
          className="text-muted-foreground hover:bg-muted hover:text-foreground mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm md:mt-auto"
        >
          <FileText className="size-4" aria-hidden />
          Home
        </Link>
      </nav>
    </aside>
  );
}
