import { redirect } from "next/navigation";
import { BarChart3, LogOut, Search } from "lucide-react";

import { logout } from "@/app/logout/actions";
import { getCurrentUser } from "@/lib/auth";
import { AppSidebarNav } from "./AppSidebarNav";

type AppLayoutProps = {
  children: React.ReactNode;
};

export async function AppLayout({ children }: AppLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background text-zinc-950">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-zinc-200 bg-white/95 p-4 shadow-[8px_0_32px_-30px_rgba(16,16,18,0.45)] lg:flex lg:flex-col">
        <div className="mb-8 rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center gap-3">
            <div className="performance-icon-tile flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600 text-white">
              <BarChart3 size={22} />
            </div>

            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
                Performance
              </h1>
              <p className="text-xs font-medium text-zinc-500">
                Inteligência acadêmica
              </p>
            </div>
          </div>
        </div>

        <AppSidebarNav />

        <div className="mt-auto rounded-3xl border border-zinc-200 bg-white p-3">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {user.name}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {user.role === "ADMIN" ? "Administrador" : "Professor"}
          </p>

          <form action={logout} className="mt-4">
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 active:scale-[0.99]">
              <LogOut size={16} />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/88 px-5 py-3 shadow-[0_8px_24px_-24px_rgba(16,16,18,0.4)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-tight text-zinc-900">
                Centro de inteligência acadêmica
              </p>
              <p className="text-xs text-zinc-500">
                Dados, avaliações, leitura e acompanhamento pedagógico
              </p>
            </div>

            <div className="hidden min-w-[280px] items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 md:flex">
              <Search size={15} />
              <span className="truncate">Busca institucional em preparação</span>
            </div>

            <div className="hidden rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 md:block">
              <span className="text-zinc-400">Sessão</span> {user.email}
            </div>
          </div>
        </header>

        <section className="px-5 py-6 md:px-7 md:py-7">
          <div className="performance-page-shell">{children}</div>
        </section>
      </main>
    </div>
  );
}
