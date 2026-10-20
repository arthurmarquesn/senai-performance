import { redirect } from "next/navigation";

import {
  SlidersHorizontal,
} from "lucide-react";

import {
  AppLayout,
} from "@/components/AppLayout";

import {
  TeacherAreaNav,
} from "@/components/teacher/TeacherAreaNav";

import {
  getTeacherContext,
} from "@/lib/teacher/teacher-context";

import {
  getTeacherPerformanceBands,
} from "@/lib/teacher/performance-bands";

import {
  PerformanceBandsEditor,
} from "./PerformanceBandsEditor";

export default async function TeacherPerformanceBandsPage() {
  const {
    teacherProfile,
    subjectLabel,
    areaLabel,
    isPortuguese,
  } =
    await getTeacherContext();

  /*
   * A configuração das faixas pertence
   * obrigatoriamente a um TeacherProfile.
   */
  if (
    !teacherProfile ||
    !subjectLabel ||
    !areaLabel
  ) {
    redirect(
      "/professor",
    );
  }

  /*
   * Busca exclusivamente as faixas
   * pertencentes ao professor autenticado.
   *
   * Não recebemos teacherProfileId via URL.
   * Isso impede que um professor consulte
   * ou altere a régua pedagógica de outro.
   */
  const bands =
    await getTeacherPerformanceBands(
      teacherProfile.id,
    );

  return (
    <AppLayout>
      <div className="grid gap-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-600">
            Área do Professor
          </p>

          <div className="mt-2 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700 ring-1 ring-red-200">
              <SlidersHorizontal
                size={21}
              />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
                Faixas de desempenho
              </h1>

              <p className="mt-2 text-sm font-medium text-zinc-600">
                {subjectLabel}
                {" · "}
                {areaLabel}
              </p>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                Configure sua própria régua pedagógica para interpretar os
                resultados dos alunos. As faixas serão utilizadas nas análises
                da sua disciplina.
              </p>
            </div>
          </div>
        </header>

        <TeacherAreaNav
          isPortuguese={
            isPortuguese
          }
        />

        <section className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5 lg:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Configuração individual
            </p>

            <p className="mt-2 text-sm font-semibold text-zinc-900">
              Sua própria régua
            </p>

            <p className="mt-1 text-xs leading-5 text-zinc-500">
              As faixas configuradas aqui pertencem somente ao seu perfil de
              professor.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Quantidade livre
            </p>

            <p className="mt-2 text-sm font-semibold text-zinc-900">
              Uma ou várias faixas
            </p>

            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Você não precisa utilizar uma quantidade fixa de classificações.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Atividade complementar
            </p>

            <p className="mt-2 text-sm font-semibold text-zinc-900">
              Definida por você
            </p>

            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Qualquer faixa pode ser marcada para alimentar automaticamente a
              lista de alunos que necessitam de atividade complementar.
            </p>
          </div>
        </section>

        <PerformanceBandsEditor
          initialBands={
            bands
          }
        />
      </div>
    </AppLayout>
  );
}