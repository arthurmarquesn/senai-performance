
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";

import {
  BookOpen,
  BookText,
  Gauge,
  GraduationCap,
  Home,
  Users,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const regularNavGroups: NavGroup[] = [
  {
    label: "Principal",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: Home,
      },
      {
        label: "Área do Professor",
        href: "/professor",
        icon: Gauge,
      },
    ],
  },
  {
    label: "Acadêmico",
    items: [
      {
        label: "Alunos",
        href: "/alunos",
        icon: GraduationCap,
      },
      {
        label: "Turmas",
        href: "/turmas",
        icon: Users,
      },
    ],
  },
  {
    label: "Avaliação",
    items: [
      {
        label: "Simulados",
        href: "/simulados",
        icon: BookOpen,
      },
      {
        label: "Redações",
        href: "/redacoes",
        icon: BookText,
      },
    ],
  },
];

const correctorNavGroups: NavGroup[] = [
  {
    label: "Correção",
    items: [
      {
        label: "Redações",
        href: "/redacoes",
        icon: BookText,
      },
    ],
  },
];

function isActivePath(
  pathname: string,
  href: string
) {
  if (href === "/") {
    return pathname === "/";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export function AppSidebarNav({
  role,
  onNavigate,
}: {
  role: UserRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const navGroups =
    role === UserRole.ESSAY_CORRECTOR
      ? correctorNavGroups
      : regularNavGroups;

  return (
    <nav
      className="space-y-6"
      aria-label="Navegação principal"
    >
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {group.label}
          </p>

          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(
                pathname,
                item.href
              );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={
                    active ? "page" : undefined
                  }
                  className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-orange-50 text-[#EA580C]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                      active
                        ? "bg-[#F97316] text-white"
                        : "bg-slate-50 text-slate-500 group-hover:text-[#EA580C]"
                    }`}
                  >
                    <Icon size={18} />
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
