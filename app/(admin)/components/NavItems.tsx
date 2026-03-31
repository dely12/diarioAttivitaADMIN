"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PlaneTakeoff,
  Users,
  LayoutDashboard,
  Briefcase,
  ListChecks,
} from "lucide-react";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/ferie", label: "Ferie", icon: PlaneTakeoff },
  { href: "/dipendenti", label: "Dipendenti", icon: Users },
  { href: "/commesse", label: "Commesse", icon: Briefcase },
  { href: "/attivita", label: "Attività", icon: ListChecks },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-2">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`admin-nav-link${active ? " active" : ""}`}
          >
            <Icon size={18} strokeWidth={1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-stretch justify-around border-t border-slate-200 bg-white">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
              active ? "text-blue-700" : "text-slate-500"
            }`}
          >
            <Icon size={20} strokeWidth={1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
