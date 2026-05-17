import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  BookText,
  GraduationCap,
  Home,
  LogOut,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/logout/actions";

type AppLayoutProps = {
  children: React.ReactNode;
};

const menuItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    label: "Turmas",
    href: "/turmas",
    icon: Users,
  },
  {
    label: "Alunos",
    href: "/alunos",
    icon: GraduationCap,
  },
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
];

export async function AppLayout({ children }: AppLayoutProps) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen bg-[#F4F6F8] text-zinc-900">
      <aside className="hidden w-72 border-r border-zinc-200 bg-white px-5 py-6 md:flex md:flex-col">
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600 text-white">
              <BarChart3 size={22} />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Performance
              </h1>

              <p className="text-xs text-zinc-500">
                Inteligência escolar
              </p>
            </div>
          </div>
        </div>

        <nav className="grid gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-600 transition hover:bg-red-50 hover:text-red-700"
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-semibold text-zinc-800">
            {user?.name ?? "Usuário"}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            {user?.role === "ADMIN" ? "Administrador" : "Professor"}
          </p>

          <form action={logout} className="mt-4">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              <LogOut size={16} />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-8 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">
                Sistema interno de análise de desempenho
              </p>

              <p className="text-xs text-zinc-400">
                Plataforma acadêmica institucional
              </p>
            </div>

            <div className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-600 md:block">
              {user?.email ?? "sessão ativa"}
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}