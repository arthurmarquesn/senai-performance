"use client";

import Link from "next/link";

import {
  ArrowLeftRight,
  BarChart3,
  BookText,
  LayoutDashboard,
  ListChecks,
  SlidersHorizontal,
  Trophy,
  Users,
} from "lucide-react";

import {
  usePathname,
} from "next/navigation";

type TeacherAreaNavProps = {
  isPortuguese: boolean;
};

const baseItems = [
  {
    label: "Visão geral",
    href: "/professor",
    icon: LayoutDashboard,
  },

  {
    label: "Desempenho",
    href: "/professor/desempenho",
    icon: BarChart3,
  },

  {
    label: "Alunos",
    href: "/professor/alunos",
    icon: Users,
  },

  {
    label: "Questões",
    href: "/professor/questoes",
    icon: ListChecks,
  },

  {
    label: "Ranking",
    href: "/professor/ranking",
    icon: Trophy,
  },

  {
    label: "Comparar turmas",
    href: "/professor/comparar",
    icon: ArrowLeftRight,
  },
];

function isActive(
  pathname: string,
  href: string,
) {
  if (
    href === "/professor"
  ) {
    return (
      pathname ===
      "/professor"
    );
  }

  return (
    pathname === href ||
    pathname.startsWith(
      `${href}/`,
    )
  );
}

export function TeacherAreaNav({
  isPortuguese,
}: TeacherAreaNavProps) {
  const pathname =
    usePathname();

  const items = [
    ...baseItems,

    ...(isPortuguese
      ? [
          {
            label: "Redações",
            href: "/professor/redacoes",
            icon: BookText,
          },
        ]
      : []),

    {
      label: "Faixas",
      href: "/professor/faixas",
      icon: SlidersHorizontal,
    },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-2">
      <nav
        aria-label="Navegação da Área do Professor"
        className="flex min-w-max gap-1"
      >
        {items.map(
          (item) => {
            const Icon =
              item.icon;

            const active =
              isActive(
                pathname,
                item.href,
              );

            return (
              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                className={
                  active
                    ? "inline-flex h-10 items-center gap-2 rounded-lg bg-red-50 px-3 text-sm font-semibold text-red-800 ring-1 ring-red-200"
                    : "inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
                }
              >
                <Icon
                  size={16}
                />

                {
                  item.label
                }
              </Link>
            );
          },
        )}
      </nav>
    </div>
  );
}