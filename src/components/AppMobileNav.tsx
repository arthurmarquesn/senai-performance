"use client";

import { useState } from "react";
import { BarChart3, Menu, X } from "lucide-react";

import { AppSidebarNav } from "./AppSidebarNav";

export function AppMobileNav({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menu"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 lg:hidden"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-zinc-950/40"
            onClick={() => setOpen(false)}
          />

          <aside className="absolute left-0 top-0 flex h-full w-[min(88vw,320px)] flex-col border-r border-zinc-200 bg-white p-4 shadow-xl">
            <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-white">
                  <BarChart3 size={21} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-zinc-950">Performance</p>
                  <p className="text-xs text-zinc-500">Gestão acadêmica</p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-200"
              >
                <X size={18} />
              </button>
            </div>

            <AppSidebarNav onNavigate={() => setOpen(false)} />

            <div className="mt-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="truncate text-sm font-semibold text-zinc-900">{userName}</p>
              <p className="mt-1 text-xs text-zinc-500">{userRole}</p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
