"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BookText,
  GraduationCap,
  Home,
  Users,
} from "lucide-react";

import { cx } from "@/components/design-system";

const navGroups = [
  {
    label: "Principal",
    items: [{ label: "Dashboard", href: "/", icon: Home }],
  },
  {
    label: "Acadêmico",
    items: [
      { label: "Alunos", href: "/alunos", icon: GraduationCap },
      { label: "Turmas", href: "/turmas", icon: Users },
    ],
  },
  {
    label: "Avaliação",
    items: [
      { label: "Simulados", href: "/simulados", icon: BookOpen },
      { label: "Redações", href: "/redacoes", icon: BookText },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-5" aria-label="Navegação principal">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-2 text-xs font-semibold uppercase text-zinc-400">
            {group.label}
          </p>

          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={onNavigate}
                  className={cx(
                    "group relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold",
                    isActive
                      ? "bg-red-50 text-red-800 ring-1 ring-red-200"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                  )}
                >
                  <span
                    className={cx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      isActive
                        ? "bg-red-600 text-white"
                        : "bg-white text-zinc-500 ring-1 ring-zinc-200 group-hover:text-red-700"
                    )}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.35 : 2} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
