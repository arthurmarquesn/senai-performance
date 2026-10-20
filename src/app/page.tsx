
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  FileText,
  GraduationCap,
  Layers3,
  UsersRound,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { requireAcademicAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  // Bloqueia o acesso de corretores de redação.
  // A verificação ocorre antes das consultas ao banco.
  await requireAcademicAccess();

  const [
    totalTurmas,
    totalAlunos,
    totalSimulados,
    totalRedacoes,
    ultimosSimulados,
    ultimasRedacoes,
  ] = await Promise.all([
    prisma.classRoom.count(),
    prisma.student.count(),
    prisma.exam.count(),
    prisma.essayCorrection.count(),
    prisma.exam.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.essayCorrection.findMany({
      include: {
        student: {
          include: {
            classRoom: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
  ]);

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] pb-10">
        {/* Cabeçalho */}
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 h-1 w-10 rounded-full bg-[#F97316]" />

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-[34px]">
              Visão geral
              <span className="text-[#F97316]">.</span>
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Acompanhe sua instituição em um só lugar.
            </p>
          </div>

          <Link
            href="/simulados"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#F97316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
          >
            Ver simulados
            <ArrowRight size={17} />
          </Link>
        </header>

        {/* Indicadores */}
        <section className="mb-9 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          <MetricCard
            title="Alunos"
            value={totalAlunos}
            icon={<UsersRound size={21} />}
            featured
          />

          <MetricCard
            title="Turmas"
            value={totalTurmas}
            icon={<Layers3 size={21} />}
          />

          <MetricCard
            title="Simulados"
            value={totalSimulados}
            icon={<BookOpen size={21} />}
          />

          <MetricCard
            title="Redações"
            value={totalRedacoes}
            icon={<FileText size={21} />}
          />
        </section>

        {/* Atividade recente */}
        <div className="grid items-start gap-6 xl:grid-cols-2">
          {/* Simulados */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Últimos simulados
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Avaliações recentes
                </p>
              </div>

              <Link
                href="/simulados"
                className="flex items-center gap-1 text-sm font-semibold text-[#EA580C] transition hover:text-[#C2410C]"
              >
                Ver todos
                <ChevronRight size={16} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {ultimosSimulados.length === 0 ? (
                <EmptyActivity message="Nenhum simulado cadastrado." />
              ) : (
                ultimosSimulados.map((simulado) => (
                  <Link
                    key={simulado.id}
                    href={`/simulados/${simulado.id}`}
                    className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-orange-50/60 sm:px-6"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900 transition group-hover:text-[#EA580C]">
                        {simulado.title}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {simulado.grade}º ano ·{" "}
                        {simulado.totalQuestions} questões
                      </p>
                    </div>

                    <ChevronRight
                      size={18}
                      className="shrink-0 text-slate-400 transition group-hover:text-[#F97316]"
                    />
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Redações */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Últimas redações
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Correções recentes
                </p>
              </div>

              <Link
                href="/redacoes"
                className="flex items-center gap-1 text-sm font-semibold text-[#EA580C] transition hover:text-[#C2410C]"
              >
                Ver todas
                <ChevronRight size={16} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {ultimasRedacoes.length === 0 ? (
                <EmptyActivity message="Nenhuma redação corrigida." />
              ) : (
                ultimasRedacoes.map((redacao) => (
                  <div
                    key={redacao.id}
                    className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900">
                        {redacao.student.name}
                      </h3>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {redacao.student.classRoom.name}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold tabular-nums text-[#EA580C]">
                        {redacao.totalScore}
                      </p>

                      <p className="text-[11px] text-slate-400">
                        Nota
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Rodapé */}
        <div className="mt-10 flex items-center gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400">
          <GraduationCap size={15} />
          PERFORMANCE · Gestão Educacional
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
  value: number;
  icon: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-2xl p-5 transition-shadow hover:shadow-md sm:p-6 ${
        featured
          ? "bg-gradient-to-br from-[#FB923C] to-[#EA580C] text-white shadow-sm"
          : "border border-slate-200 bg-white text-slate-900 shadow-sm"
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
            featured
              ? "text-white/90"
              : "text-[#F97316]"
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

function EmptyActivity({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex min-h-28 items-center justify-center px-5 py-8 text-center text-sm text-slate-400">
      {message}
    </div>
  );
}
