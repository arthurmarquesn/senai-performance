import { redirect } from "next/navigation";
import { BarChart3, LogOut, Search } from "lucide-react";

import { logout } from "@/app/logout/actions";
import { getCurrentUser } from "@/lib/auth";
import { AppMobileNav } from "./AppMobileNav";
import { AppSidebarNav } from "./AppSidebarNav";

type AppLayoutProps = {
  children: React.ReactNode;
};

export async function AppLayout({ children }: AppLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const roleLabel = user.role === "ADMIN" ? "Administrador" : "Professor";

  return (
    <div className="min-h-screen bg-background text-zinc-950">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-zinc-200 bg-white p-4 print:hidden lg:flex lg:flex-col">
        <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-600 text-white">
              <BarChart3 size={23} />
            </div>

            <div>
              <h1 className="text-xl font-semibold text-zinc-950">Performance</h1>
              <p className="text-xs text-zinc-500">Gestão acadêmica</p>
            </div>
          </div>
        </div>

        <AppSidebarNav />

        <div className="mt-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="truncate text-sm font-semibold text-zinc-900">{user.name}</p>
          <p className="mt-1 text-xs text-zinc-500">{roleLabel}</p>

          <form action={logout} className="mt-3">
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700">
              <LogOut size={16} />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="print:pl-0 lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <AppMobileNav userName={user.name} userRole={roleLabel} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-950">
                  Centro de operação acadêmica
                </p>
                <p className="hidden text-xs text-zinc-500 sm:block">
                  Navegação, avaliações, resultados e revisão pedagógica.
                </p>
              </div>
            </div>

            <div className="hidden min-w-[260px] items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 md:flex">
              <Search size={15} />
              <span className="truncate">Busca global em preparação</span>
            </div>

            <div className="hidden max-w-[260px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 xl:block">
              <span className="text-zinc-400">Sessão</span>{" "}
              <span className="truncate">{user.email}</span>
            </div>
          </div>
        </header>

        <section className="px-4 py-5 print:p-0 md:px-6 md:py-6 xl:px-8">
          <div className="performance-page-shell print:max-w-none">{children}</div>
        </section>
      </main>
    </div>
  );
}
