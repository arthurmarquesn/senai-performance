import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Layers3,
  Plus,
  Users,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/AppLayout";
import { createClassRoom } from "./actions";

export default async function TurmasPage() {
  const turmas = await prisma.classRoom.findMany({
    include: {
      students: {
        include: {
          bookProgresses: true,
          results: true,
        },
      },
    },
    orderBy: [
      {
        grade: "asc",
      },
      {
        name: "asc",
      },
    ],
  });

  const simuladosPorSerie = await prisma.exam.groupBy({
    by: ["grade"],
    _count: {
      id: true,
    },
  });

  function getTotalSimuladosDaSerie(grade: number) {
    return (
      simuladosPorSerie.find((item) => item.grade === grade)?._count.id ?? 0
    );
  }

  const totalAlunos = turmas.reduce(
    (acc, turma) => acc + turma.students.length,
    0
  );

  const totalLeituras = turmas.reduce(
    (acc, turma) =>
      acc +
      turma.students.reduce(
        (studentAcc, student) => studentAcc + student.bookProgresses.length,
        0
      ),
    0
  );

  const totalSimuladosSeries = simuladosPorSerie.reduce(
    (acc, item) => acc + item._count.id,
    0
  );

  return (
    <AppLayout>
      <div className="mb-8 rounded-[32px] bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-8 text-white shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-600/20">
              <Users size={28} />
            </div>

            <h1 className="text-4xl font-bold tracking-tight">
              Gestão de turmas
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Organize turmas, estudantes, simulados por série e indicadores de
              leitura em uma visão institucional.
            </p>
          </div>

          <Link
            href="/turmas#cadastro"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
          >
            <Plus size={18} />
            Nova turma
          </Link>
        </div>
      </div>

      <section className="mb-8 grid gap-6 md:grid-cols-3">
        <StatCard
          title="Turmas cadastradas"
          value={turmas.length}
          icon={<Users size={22} />}
          highlight
        />

        <StatCard
          title="Alunos vinculados"
          value={totalAlunos}
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
          <h2 className="text-2xl font-bold text-zinc-900">Nova turma</h2>

          <p className="mt-1 text-sm text-zinc-500">
            Informe o nome da turma e a série correspondente.
          </p>
        </div>

        <form action={createClassRoom} className="grid gap-4 md:grid-cols-3">
          <input
            name="name"
            placeholder="Nome da turma. Ex: IDEV-2"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          />

          <select
            name="grade"
            defaultValue=""
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          >
            <option value="" disabled>
              Selecione a série
            </option>

            <option value="1">1º ano</option>
            <option value="2">2º ano</option>
            <option value="3">3º ano</option>
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

      <section className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">
            Turmas cadastradas
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {turmas.length} turma(s) organizadas no Alfred.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm">
          {totalSimuladosSeries} simulado(s) por série
        </div>
      </section>

      {turmas.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-zinc-300 bg-white p-16 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-500">
            <GraduationCap size={30} />
          </div>

          <h2 className="text-2xl font-bold text-zinc-900">
            Nenhuma turma cadastrada
          </h2>

          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
            Comece criando uma turma para organizar estudantes, simulados,
            leituras e relatórios acadêmicos.
          </p>

          <Link
            href="/turmas#cadastro"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <Plus size={18} />
            Criar primeira turma
          </Link>
        </div>
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {turmas.map((turma) => {
            const totalSimuladosDaSerie = getTotalSimuladosDaSerie(turma.grade);

            const totalLeiturasDaTurma = turma.students.reduce(
              (acc, student) => acc + student.bookProgresses.length,
              0
            );

            const totalResultadosDaTurma = turma.students.reduce(
              (acc, student) => acc + student.results.length,
              0
            );

            return (
              <Link
                key={turma.id}
                href={`/turmas/${turma.id}`}
                className="group rounded-[32px] border border-zinc-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-xl"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-600">
                    <Users size={28} />
                  </div>

                  <ArrowRight
                    size={18}
                    className="text-zinc-400 transition group-hover:text-red-600"
                  />
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 transition group-hover:text-red-700">
                  {turma.name}
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  {turma.grade}º ano
                </p>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <InfoCard
                    label="Alunos"
                    value={String(turma.students.length)}
                    highlight={false}
                  />

                  <InfoCard
                    label="Simulados"
                    value={String(totalSimuladosDaSerie)}
                    highlight
                  />

                  <InfoCard
                    label="Resultados"
                    value={String(totalResultadosDaTurma)}
                    highlight={false}
                  />

                  <InfoCard
                    label="Leituras"
                    value={String(totalLeiturasDaTurma)}
                    highlight
                  />
                </div>

                <div className="mt-6 flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Layers3 size={16} className="text-red-600" />

                    <span className="text-sm font-medium text-zinc-700">
                      Painel da turma
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