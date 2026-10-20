
import {
  BookText,
  ChevronDown,
  FileCheck2,
  GraduationCap,
  TrendingUp,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { EssayCorrectionForm } from "@/components/redacoes/EssayCorrectionForm";
import { prisma } from "@/lib/prisma";

export default async function RedacoesPage() {
  const [alunos, simulados, redacoes] = await Promise.all([
    prisma.student.findMany({
      include: {
        classRoom: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.exam.findMany({
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.essayCorrection.findMany({
      include: {
        student: {
          include: {
            classRoom: true,
          },
        },
        exam: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const media =
    redacoes.length > 0
      ? Math.round(
          redacoes.reduce(
            (acc, redacao) =>
              acc + redacao.totalScore,
            0
          ) / redacoes.length
        )
      : 0;

  const alunosComRedacao = new Set(
    redacoes.map((redacao) => redacao.studentId)
  ).size;

  const studentOptions = alunos.map((aluno) => ({
    id: aluno.id,
    name: aluno.name,
    classRoom: {
      name: aluno.classRoom.name,
    },
  }));

  const examOptions = simulados.map((simulado) => ({
    id: simulado.id,
    title: simulado.title,
    grade: simulado.grade,
  }));

  const correctionOptions = redacoes.map((redacao) => ({
    id: redacao.id,
    studentId: redacao.studentId,
    examId: redacao.examId,
    competency1: redacao.competency1,
    competency2: redacao.competency2,
    competency3: redacao.competency3,
    competency4: redacao.competency4,
    competency5: redacao.competency5,
    totalScore: redacao.totalScore,
    comment: redacao.comment,
  }));

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] pb-12">
        {/* Cabeçalho */}
        <header className="mb-8">
          <div className="mb-3 h-1 w-10 rounded-full bg-[#F97316]" />

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-[34px]">
            Redações
            <span className="text-[#F97316]">.</span>
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Correção e acompanhamento de redações ENEM.
          </p>
        </header>

        {/* Indicadores */}
        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5">
          <MetricCard
            title="Redações corrigidas"
            value={String(redacoes.length)}
            icon={<FileCheck2 size={21} />}
            featured
          />

          <MetricCard
            title="Média geral"
            value={
              redacoes.length > 0
                ? String(media)
                : "—"
            }
            icon={<TrendingUp size={21} />}
          />

          <MetricCard
            title="Alunos avaliados"
            value={String(alunosComRedacao)}
            icon={<GraduationCap size={21} />}
          />
        </section>

        {/* Conteúdo principal */}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          {/* Formulário de correção */}
          <section className="min-w-0">
            <EssayCorrectionForm
              students={studentOptions}
              exams={examOptions}
              existingCorrections={correctionOptions}
            />
          </section>

          {/* Histórico */}
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Redações corrigidas
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Histórico de avaliações
                </p>
              </div>

              <BookText
                size={20}
                className="shrink-0 text-[#F97316]"
              />
            </div>

            {redacoes.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-12 text-center">
                <BookText
                  size={34}
                  strokeWidth={1.5}
                  className="text-slate-300"
                />

                <h3 className="mt-4 font-semibold text-slate-800">
                  Nenhuma redação corrigida
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  As correções aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {redacoes.map((redacao) => {
                  const competencias = [
                    redacao.competency1,
                    redacao.competency2,
                    redacao.competency3,
                    redacao.competency4,
                    redacao.competency5,
                  ];

                  return (
                    <details
                      key={redacao.id}
                      className="group"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 transition hover:bg-orange-50/50 marker:hidden sm:px-6 [&::-webkit-details-marker]:hidden">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                            <FileCheck2 size={19} />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-slate-900">
                              {redacao.student.name}
                            </h3>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {
                                redacao.student.classRoom
                                  .name
                              }
                              {redacao.exam
                                ? ` · ${redacao.exam.title}`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <div className="text-right">
                            <p className="text-xl font-bold tabular-nums text-[#EA580C]">
                              {redacao.totalScore}
                            </p>

                            <p className="text-[11px] text-slate-400">
                              Nota ENEM
                            </p>
                          </div>

                          <ChevronDown
                            size={17}
                            className="text-slate-400 transition-transform group-open:rotate-180"
                          />
                        </div>
                      </summary>

                      {/* Detalhes da correção */}
                      <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:px-6">
                        <h4 className="mb-3 text-xs font-semibold text-slate-600">
                          Notas por competência
                        </h4>

                        <div className="grid grid-cols-5 gap-2">
                          {competencias.map(
                            (nota, index) => (
                              <div
                                key={index}
                                className="min-w-0 rounded-xl border border-slate-200 bg-white px-1 py-3 text-center"
                              >
                                <p className="text-xs font-medium text-slate-500">
                                  C{index + 1}
                                </p>

                                <p className="mt-1 text-base font-bold tabular-nums text-slate-900 sm:text-lg">
                                  {nota}
                                </p>
                              </div>
                            )
                          )}
                        </div>

                        {redacao.comment && (
                          <div className="mt-5 border-l-2 border-[#F97316] bg-white px-4 py-3">
                            <p className="mb-2 text-xs font-semibold text-slate-700">
                              Comentário pedagógico
                            </p>

                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                              {redacao.comment}
                            </p>
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </section>
        </div>
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
  value: string;
  icon: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative flex min-h-[145px] flex-col justify-between overflow-hidden rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6 ${
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
            featured
              ? "text-white/90"
              : "text-slate-500"
          }`}
        >
          {title}
        </p>

        <span
          className={
            featured
              ? "text-white/90"
              : "text-[#F97316]"
          }
        >
          {icon}
        </span>
      </div>

      <p className="relative mt-5 break-words text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
        {value}
      </p>
    </div>
  );
}
