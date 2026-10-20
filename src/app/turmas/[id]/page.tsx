
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  GraduationCap,
  UsersRound,
} from "lucide-react";

import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { AppLayout } from "@/components/AppLayout";
import { prisma } from "@/lib/prisma";

export default async function TurmaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const turma = await prisma.classRoom.findUnique({
    where: { id },
    include: {
      students: {
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!turma) {
    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-[1440px] py-10">
          <h1 className="text-2xl font-bold text-slate-900">
            Turma não encontrada
          </h1>

          <Link
            href="/turmas"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#EA580C]"
          >
            Voltar para turmas
            <ArrowRight size={16} />
          </Link>
        </div>
      </AppLayout>
    );
  }

  const simulados = await prisma.exam.findMany({
    where: {
      grade: turma.grade,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] pb-12">
        {/* Navegação */}
        <div className="mb-6">
          <AppBreadcrumb
            items={[
              {
                label: "Turmas",
                href: "/turmas",
              },
              {
                label: turma.name,
              },
            ]}
          />
        </div>

        {/* Identificação */}
        <header className="mb-8 flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-[#EA580C] sm:h-16 sm:w-16">
            <GraduationCap size={30} strokeWidth={1.8} />
          </div>

          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {turma.name}
              <span className="text-[#F97316]">.</span>
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {turma.grade}º ano
            </p>
          </div>
        </header>

        {/* Indicadores */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
          <MetricCard
            title="Alunos"
            value={String(turma.students.length)}
            icon={<UsersRound size={21} />}
            featured
          />

          <MetricCard
            title="Simulados da série"
            value={String(simulados.length)}
            icon={<BookOpen size={21} />}
          />

          <MetricCard
            title="Ano"
            value={`${turma.grade}º`}
            icon={<GraduationCap size={21} />}
          />
        </section>

        {/* Conteúdo */}
        <div className="grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          {/* Alunos */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Alunos da turma
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {turma.students.length} estudantes
                </p>
              </div>

              <UsersRound
                size={20}
                className="text-[#F97316]"
              />
            </div>

            {turma.students.length === 0 ? (
              <EmptyContent message="Nenhum aluno cadastrado nesta turma." />
            ) : (
              <div className="divide-y divide-slate-100">
                {turma.students.map((student) => (
                  <Link
                    key={student.id}
                    href={`/alunos/${student.id}`}
                    className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-orange-50/60 sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                        <GraduationCap size={19} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900 transition group-hover:text-[#EA580C]">
                          {student.name}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Nº {student.number ?? "—"}
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      size={18}
                      className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#F97316]"
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Simulados */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Simulados da série
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {simulados.length} avaliações cadastradas
                </p>
              </div>

              <BookOpen
                size={20}
                className="text-[#F97316]"
              />
            </div>

            {simulados.length === 0 ? (
              <EmptyContent message="Nenhum simulado cadastrado para esta série." />
            ) : (
              <div className="divide-y divide-slate-100">
                {simulados.map((exam) => (
                  <Link
                    key={exam.id}
                    href={`/simulados/${exam.id}`}
                    className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-orange-50/60 sm:px-6"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900 transition group-hover:text-[#EA580C]">
                        {exam.title}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {exam.totalQuestions} questões
                        <span className="mx-2 text-slate-300">
                          ·
                        </span>
                        {exam.status}
                      </p>
                    </div>

                    <ChevronRight
                      size={18}
                      className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#F97316]"
                    />
                  </Link>
                ))}
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
        {value}
      </p>
    </div>
  );
}

function EmptyContent({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex min-h-36 items-center justify-center px-6 py-10 text-center">
      <p className="text-sm text-slate-400">
        {message}
      </p>
    </div>
  );
}
