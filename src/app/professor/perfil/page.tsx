import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, ArrowLeft } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SUBJECT_LABELS,
  SUBJECT_TO_KNOWLEDGE_AREA,
  KNOWLEDGE_AREA_LABELS,
} from "@/lib/teacher/teacher-context";

import {
  createTeacherProfileAction,
  updateTeacherProfileAction,
} from "./actions";

export default async function TeacherProfileSetupPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "TEACHER") {
    redirect("/");
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      subject: true,
      area: true,
    },
  });

  if (teacherProfile) {
    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-2xl pb-12">
          <div className="mb-5 h-1 w-10 rounded-full bg-[#F97316]" />

          <div className="mb-6 flex items-center gap-3">
            <Link
              href="/professor"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Voltar para a área do professor
            </Link>
          </div>

          <header className="mb-6">
            <div className="flex items-center gap-3 text-[#EA580C]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
                <GraduationCap size={22} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Perfil pedagógico
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  Configurado
                  <span className="text-[#F97316]">.</span>
                </h1>
              </div>
            </div>
          </header>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm leading-6 text-slate-600">
              Seu perfil já está cadastrado e está ativo para as análises pedagógicas.
            </p>

            <div className="mt-6 space-y-3 rounded-xl border border-orange-100 bg-orange-50 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#C2410C]">
                  Disciplina
                </p>
                <p className="mt-1 text-base font-semibold text-slate-800">
                  {SUBJECT_LABELS[teacherProfile.subject]}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#C2410C]">
                  Área
                </p>
                <p className="mt-1 text-base font-semibold text-slate-800">
                  {KNOWLEDGE_AREA_LABELS[teacherProfile.area]}
                </p>
              </div>
            </div>

            <form
              action={updateTeacherProfileAction}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="subject"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Alterar disciplina
                </label>

                <select
                  id="subject"
                  name="subject"
                  defaultValue={teacherProfile.subject}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#F97316] focus:ring-2 focus:ring-orange-100"
                  required
                >
                  {Object.entries(SUBJECT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-[#EA580C] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#C2410C]"
                >
                  Salvar alteração
                </button>
              </div>
            </form>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-2xl pb-12">
        <div className="mb-5 h-1 w-10 rounded-full bg-[#F97316]" />

        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/professor"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Voltar para a área do professor
          </Link>
        </div>

        <header className="mb-6">
          <div className="flex items-center gap-3 text-[#EA580C]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
              <GraduationCap size={22} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Perfil pedagógico
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Configuração inicial
                <span className="text-[#F97316]">.</span>
              </h1>
            </div>
          </div>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm leading-6 text-slate-600">
            Defina a disciplina principal do professor para
            liberar os relatórios, ranking e análise
            pedagógica da área.
          </p>

          <form
            action={createTeacherProfileAction}
            className="mt-6 space-y-5"
          >
            <div>
              <label
                htmlFor="subject"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Disciplina
              </label>

              <select
                id="subject"
                name="subject"
                defaultValue=""
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#F97316] focus:ring-2 focus:ring-orange-100"
                required
              >
                <option value="" disabled>
                  Selecione uma disciplina
                </option>

                {Object.entries(SUBJECT_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#C2410C]">
                Área inferida
              </p>

              <p className="mt-2 text-sm text-slate-700">
                A área será calculada automaticamente conforme a disciplina escolhida.
              </p>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-[#EA580C] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#C2410C]"
              >
                Salvar perfil pedagógico
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
