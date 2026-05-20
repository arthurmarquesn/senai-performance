import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Plus,
  Search,
  Trophy,
  Users,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/AppLayout";
import { createStudent } from "./actions";

export default async function AlunosPage() {
  const alunos = await prisma.student.findMany({
    include: {
      classRoom: true,
      results: {
        include: {
          answers: true,
          exam: true,
        },
      },
      bookProgresses: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const turmas = await prisma.classRoom.findMany({
    orderBy: {
      grade: "asc",
    },
  });

  const totalLeituras = alunos.reduce(
    (acc, aluno) => acc + aluno.bookProgresses.length,
    0
  );

  return (
    <AppLayout>
      <div className="mb-8 rounded-[32px] bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-8 text-white shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-600/20">
              <GraduationCap size={28} />
            </div>

            <h1 className="text-4xl font-bold tracking-tight">
              Gestão de alunos
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Acompanhe desempenho acadêmico, simulados, leitura, evolução e
              indicadores individuais.
            </p>
          </div>

          <Link
            href="/alunos#cadastro"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
          >
            <Plus size={18} />
            Novo aluno
          </Link>
        </div>
      </div>

      <section className="mb-8 grid gap-6 md:grid-cols-3">
        <StatCard
          title="Alunos cadastrados"
          value={alunos.length}
          icon={<Users size={22} />}
          highlight
        />

        <StatCard
          title="Turmas ativas"
          value={turmas.length}
          icon={<GraduationCap size={22} />}
          highlight={false}
        />

        <StatCard
          title="Leituras registradas"
          value={totalLeituras}
          icon={<BookOpen size={22} />}
          highlight
        />
      </section>

      <section
        id="cadastro"
        className="mb-8 rounded-[32px] border border-zinc-200 bg-white p-7 shadow-sm"
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-900">Novo aluno</h2>

          <p className="mt-1 text-sm text-zinc-500">
            Vincule estudantes às turmas para iniciar o acompanhamento.
          </p>
        </div>

        <form action={createStudent} className="grid gap-4 md:grid-cols-4">
          <input
            name="name"
            placeholder="Nome completo"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          />

          <input
            name="number"
            type="number"
            placeholder="Número"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          />

          <select
            name="classRoomId"
            defaultValue=""
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          >
            <option value="" disabled>
              Selecione a turma
            </option>

            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/20"
          >
            <Plus size={18} />
            Cadastrar
          </button>
        </form>
      </section>

      <section className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Lista de alunos</h2>

          <p className="mt-1 text-sm text-zinc-500">
            {alunos.length} estudantes cadastrados
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <Search size={18} className="text-zinc-400" />

          <input
            placeholder="Busca visual futura"
            className="w-[220px] bg-transparent text-sm outline-none"
            disabled
          />
        </div>
      </section>

      {alunos.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-zinc-300 bg-white p-16 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-500">
            <Users size={30} />
          </div>

          <h2 className="text-2xl font-bold text-zinc-900">
            Nenhum aluno cadastrado
          </h2>

          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
            Cadastre estudantes para acompanhar desempenho, simulados, leitura e
            evolução acadêmica.
          </p>
        </div>
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {alunos.map((aluno) => {
            const totalSimulados = aluno.results.length;

            const totalQuestoes = aluno.results.reduce((acc, result) => {
              return (
                acc +
                result.answers.filter((answer) => answer.answer !== null)
                  .length
              );
            }, 0);

            const totalLeiturasAluno = aluno.bookProgresses.length;

            return (
              <Link
                key={aluno.id}
                href={`/alunos/${aluno.id}`}
                className="group rounded-[32px] border border-zinc-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-xl"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-600">
                    <GraduationCap size={28} />
                  </div>

                  <ArrowRight
                    size={18}
                    className="text-zinc-400 transition group-hover:text-red-600"
                  />
                </div>

                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900 transition group-hover:text-red-700">
                    {aluno.name}
                  </h2>

                  <p className="mt-2 text-sm text-zinc-500">
                    {aluno.classRoom.name}
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <InfoCard
                    label="Número"
                    value={String(aluno.number ?? "-")}
                    highlight={false}
                  />

                  <InfoCard
                    label="Simulados"
                    value={String(totalSimulados)}
                    highlight
                  />

                  <InfoCard
                    label="Questões"
                    value={String(totalQuestoes)}
                    highlight={false}
                  />

                  <InfoCard
                    label="Leituras"
                    value={String(totalLeiturasAluno)}
                    highlight
                  />
                </div>

                <div className="mt-6 flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-red-600" />

                    <span className="text-sm font-medium text-zinc-700">
                      Perfil acadêmico
                    </span>
                  </div>

                  <span className="text-sm font-semibold text-red-600">
                    Ver detalhes
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </AppLayout>
  );
}

function StatCard({
  title,
  value,
  icon,
  highlight,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  highlight: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
      <div
        className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${
          highlight ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-700"
        }`}
      >
        {icon}
      </div>

      <p className="text-sm font-medium text-zinc-500">{title}</p>

      <p
        className={`mt-2 text-4xl font-bold tracking-tight ${
          highlight ? "text-red-600" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight: boolean;
}) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${
          highlight ? "text-red-600" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}