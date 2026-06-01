import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  BookText,
  GraduationCap,
  Home,
  LogOut,
  Users,
  Bot,
  Brain,
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
  {
    label: "+ Leitura",
    href: "/leituras",
    icon: BookOpen,
  },
  {
    label: "Dashboard Leitura",
    href: "/leituras/dashboard",
    icon: BookOpen,
  },
  {
    label: "Repertório IA",
    href: "/repertorio",
    icon: Brain,
  },
  {
    label: "Assistente",
    href: "/assistente",
    icon: Bot,
  },
];

export async function AppLayout({ children }: AppLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-zinc-200 bg-white p-6 lg:block">
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600 text-white">
              <BarChart3 size={22} />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight">Performance</h1>
              <p className="text-xs font-medium text-zinc-500">
                Inteligência escolar
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-600 transition hover:bg-red-50 hover:text-red-700"
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-bold text-zinc-900">{user.name}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {user.role === "ADMIN" ? "Administrador" : "Professor"}
          </p>

          <form action={logout} className="mt-4">
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700">
              <LogOut size={16} />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-zinc-900">
                Sistema interno de análise de desempenho
              </p>
              <p className="text-xs text-zinc-500">
                Plataforma acadêmica institucional
              </p>
            </div>

            <div className="hidden rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-600 md:block">
              {user.email}
            </div>
          </div>
        </header>

        <section className="p-6">{children}</section>
      </main>
    </div>
  );
}
