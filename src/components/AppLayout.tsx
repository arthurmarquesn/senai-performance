
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import {
  BarChart3,
  LogOut,
} from "lucide-react";

import { logout } from "@/app/logout/actions";
import { getCurrentUser } from "@/lib/auth";
import { AppMobileNav } from "./AppMobileNav";
import { AppSidebarNav } from "./AppSidebarNav";

type AppLayoutProps = {
  children: React.ReactNode;
};

export async function AppLayout({
  children,
}: AppLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const roleLabel =
    user.role === UserRole.ADMIN
      ? "Administrador"
      : user.role === UserRole.ESSAY_CORRECTOR
        ? "Corretor de redação"
        : "Professor";

  const isCorrector =
    user.role === UserRole.ESSAY_CORRECTOR;

  return (
    <div className="min-h-screen bg-background text-slate-900">
      {/* Navegação desktop */}
      <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-slate-200 bg-white p-4 print:hidden lg:flex">
        <div className="mb-7 flex items-center gap-3 px-2 py-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F97316] text-white">
            <BarChart3 size={24} />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Performance
            </h1>

            <p className="mt-0.5 text-xs text-slate-500">
              {isCorrector
                ? "Correção de redações"
                : "Gestão acadêmica"}
            </p>
          </div>
        </div>

        <AppSidebarNav role={user.role} />

        <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="truncate text-sm font-semibold text-slate-900">
            {user.name}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {roleLabel}
          </p>

          <form action={logout} className="mt-4">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C]"
            >
              <LogOut size={16} />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="min-w-0 print:pl-0 lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <AppMobileNav
                userName={user.name}
                userRole={roleLabel}
                role={user.role}
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {isCorrector
                    ? "Correção de redações"
                    : "Centro de operação acadêmica"}
                </p>

                <p className="hidden text-xs text-slate-500 sm:block">
                  {isCorrector
                    ? "Registro e acompanhamento das correções."
                    : "Avaliações e acompanhamento pedagógico."}
                </p>
              </div>
            </div>

            <span className="hidden max-w-[260px] truncate text-xs text-slate-500 xl:block">
              {user.email}
            </span>
          </div>
        </header>

        <section className="px-4 py-5 print:p-0 md:px-6 md:py-6 xl:px-8">
          <div className="performance-page-shell print:max-w-none">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
