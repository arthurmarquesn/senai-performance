"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BookText,
  Bot,
  Brain,
  GraduationCap,
  Home,
  LibraryBig,
  Users,
} from "lucide-react";

const navGroups = [
  {
    label: "Inteligência",
    items: [
      { label: "Dashboard", href: "/", icon: Home },
      { label: "Assistente", href: "/assistente", icon: Bot },
      { label: "Repertório IA", href: "/repertorio", icon: Brain },
    ],
  },
  {
    label: "Acadêmico",
    items: [
      { label: "Turmas", href: "/turmas", icon: Users },
      { label: "Alunos", href: "/alunos", icon: GraduationCap },
    ],
  },
  {
    label: "Avaliação",
    items: [
      { label: "Simulados", href: "/simulados", icon: BookOpen },
      { label: "Redações", href: "/redacoes", icon: BookText },
    ],
  },
  {
    label: "Leitura",
    items: [
      { label: "+ Leitura", href: "/leituras", icon: LibraryBig },
      { label: "Dashboard Leitura", href: "/leituras/dashboard", icon: BookOpen },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";

  if (href === "/leituras") {
    return (
      pathname === "/leituras" ||
      (pathname.startsWith("/leituras/") &&
        !pathname.startsWith("/leituras/dashboard"))
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-400">
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
                  className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-zinc-950 text-white shadow-[0_14px_30px_-24px_rgba(16,16,18,0.85)]"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${
                      isActive
                        ? "bg-red-600 text-white"
                        : "bg-zinc-100 text-zinc-500 group-hover:bg-red-50 group-hover:text-red-600"
                    }`}
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
