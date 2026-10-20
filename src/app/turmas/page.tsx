
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  GraduationCap,
  Plus,
  UsersRound,
} from "lucide-react";

import { createClassRoom } from "./actions";
import { AppLayout } from "@/components/AppLayout";
import { CreateRecordForm } from "@/components/CreateRecordForm";
import { prisma } from "@/lib/prisma";

export default async function TurmasPage() {
  const [turmas, simuladosPorSerie] = await Promise.all([
    prisma.classRoom.findMany({
      include: {
        students: {
          include: {
            results: true,
          },
        },
      },
      orderBy: [
        { grade: "asc" },
        { name: "asc" },
      ],
    }),
    prisma.exam.groupBy({
      by: ["grade"],
      _count: {
        id: true,
      },
    }),
  ]);

  const totalAlunos = turmas.reduce(
    (acc, turma) => acc + turma.students.length,
    0
  );

  const totalResultados = turmas.reduce(
    (acc, turma) =>
      acc +
      turma.students.reduce(
        (studentAcc, student) =>
          studentAcc + student.results.length,
        0
      ),
    0
  );

  const totalSimulados = simuladosPorSerie.reduce(
    (acc, item) => acc + item._count.id,
    0
  );

  const turmasPorSerie = [1, 2, 3].map((grade) => ({
    grade,
    turmas: turmas.filter(
      (turma) => turma.grade === grade
    ),
    simulados:
      simuladosPorSerie.find(
        (item) => item.grade === grade
      )?._count.id ?? 0,
  }));

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] pb-12">
        {/* Cabeçalho */}
        <header className="mb-8">
          <div className="mb-3 h-1 w-10 rounded-full bg-[#F97316]" />

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-[34px]">
            Turmas
            <span className="text-[#F97316]">.</span>
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Organização e acompanhamento acadêmico
          </p>
        </header>

        {/* Indicadores */}
        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          <MetricCard
            title="Turmas"
            value={turmas.length}
            icon={<GraduationCap size={21} />}
            featured
          />

          <MetricCard
            title="Alunos"
            value={totalAlunos}
            icon={<UsersRound size={21} />}
          />

          <MetricCard
            title="Simulados"
            value={totalSimulados}
            icon={<BookOpen size={21} />}
          />

          <MetricCard
            title="Resultados"
            value={totalResultados}
            icon={<BarChart3 size={21} />}
          />
        </section>

        {/* Cadastro recolhível */}
        <details
          id="cadastro"
          className="group mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden sm:px-6 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                <Plus size={20} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Nova turma
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Cadastrar uma nova turma
                </p>
              </div>
            </div>

            <ChevronDown
              size={20}
              className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
            />
          </summary>

          <div className="border-t border-slate-100 p-5 sm:p-6">
            <CreateRecordForm action={createClassRoom} kind="classroom" />
          </div>
        </details>

        {/* Listagem */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <h2 className="text-lg font-bold text-slate-900">
              Turmas cadastradas
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {turmas.length} turmas organizadas por ano
            </p>
          </div>

          {turmas.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-12 text-center">
              <GraduationCap
                size={36}
                strokeWidth={1.5}
                className="text-slate-300"
              />

              <h3 className="mt-4 font-semibold text-slate-800">
                Nenhuma turma cadastrada
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Cadastre uma turma para começar.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {turmasPorSerie.map((grupo) => (
                <div key={grupo.grade}>
                  {/* Identificação do ano */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-sm font-bold text-[#EA580C]">
                        {grupo.grade}º
                      </span>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {grupo.grade}º ano
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {grupo.turmas.length}{" "}
                          {grupo.turmas.length === 1
                            ? "turma"
                            : "turmas"}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">
                      {grupo.simulados}{" "}
                      {grupo.simulados === 1
                        ? "simulado disponível"
                        : "simulados disponíveis"}
                    </p>
                  </div>

                  {/* Turmas do ano */}
                  {grupo.turmas.length === 0 ? (
                    <div className="px-6 py-6 text-sm text-slate-400">
                      Nenhuma turma neste ano.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {grupo.turmas.map((turma) => {
                        const totalResultadosDaTurma =
                          turma.students.reduce(
                            (acc, student) =>
                              acc + student.results.length,
                            0
                          );

                        return (
                          <Link
                            key={turma.id}
                            href={`/turmas/${turma.id}`}
                            className="group flex items-center justify-between gap-4 px-5 py-5 transition hover:bg-orange-50/60 sm:px-6"
                          >
                            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C] transition group-hover:bg-orange-100">
                                <UsersRound size={20} />
                              </div>

                              <div className="min-w-0">
                                <h4 className="truncate font-semibold text-slate-900 transition group-hover:text-[#EA580C]">
                                  {turma.name}
                                </h4>

                                <p className="mt-1 text-xs text-slate-500">
                                  {turma.grade}º ano
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-5 sm:gap-8">
                              <div className="text-right">
                                <p className="text-base font-bold tabular-nums text-slate-900">
                                  {turma.students.length}
                                </p>

                                <p className="text-xs text-slate-400">
                                  Alunos
                                </p>
                              </div>

                              <div className="hidden text-right sm:block">
                                <p className="text-base font-bold tabular-nums text-slate-900">
                                  {totalResultadosDaTurma}
                                </p>

                                <p className="text-xs text-slate-400">
                                  Resultados
                                </p>
                              </div>

                              <ArrowRight
                                size={18}
                                className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#F97316]"
                              />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function MetricCard({
  title,
  value,
  icon,
  featured = false,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6 ${
        featured
          ? "bg-gradient-to-br from-[#FB923C] to-[#EA580C] text-white"
          : "border border-slate-200 bg-white text-slate-900"
      }`}
    >
      {featured && (
        <div className="pointer-events-none absolute -right-9 -top-14 h-40 w-40 rounded-full border-[22px] border-white/10" />
      )}

      <div className="relative flex items-center justify-between gap-3">
        <p
          className={`text-sm font-medium ${
            featured ? "text-white/90" : "text-slate-500"
          }`}
        >
          {title}
        </p>

        <span
          className={
            featured ? "text-white/90" : "text-[#F97316]"
          }
        >
          {icon}
        </span>
      </div>

      <p className="relative mt-5 text-4xl font-bold tracking-tight tabular-nums">
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
