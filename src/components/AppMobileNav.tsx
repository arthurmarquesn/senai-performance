
"use client";

import { useState } from "react";
import { UserRole } from "@prisma/client";

import {
  BarChart3,
  Menu,
  X,
} from "lucide-react";

import { AppSidebarNav } from "./AppSidebarNav";

export function AppMobileNav({
  userName,
  userRole,
  role,
}: {
  userName: string;
  userRole: string;
  role: UserRole;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setOpen(false)}
          />

          <aside className="absolute left-0 top-0 flex h-full w-[min(88vw,320px)] flex-col border-r border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F97316] text-white">
                  <BarChart3 size={21} />
                </div>

                <div>
                  <p className="text-lg font-bold text-slate-900">
                    Performance
                  </p>
                  <p className="text-xs text-slate-500">
                    Gestão acadêmica
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <AppSidebarNav
              role={role}
              onNavigate={() => setOpen(false)}
            />

            <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="truncate text-sm font-semibold text-slate-900">
                {userName}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {userRole}
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
