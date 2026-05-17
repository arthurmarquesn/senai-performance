import Link from "next/link";
import {
  ArrowRight,
  GraduationCap,
  Plus,
  Users,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/AppLayout";
import { createClassRoom } from "./actions";

export default async function TurmasPage() {
  const turmas = await prisma.classRoom.findMany({
    include: {
      students: true,
    },
    orderBy: {
      grade: "asc",
    },
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

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Users size={28} />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
            Turmas
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
            Gerencie as turmas cadastradas, acompanhe estudantes e organize
            simulados por série.
          </p>
        </div>

        <Link
          href="/turmas#cadastro"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/20"
        >
          <Plus size={18} />
          Nova turma
        </Link>
      </div>

      <section
        id="cadastro"
        className="mb-8 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-5">
          <h2 className="text-xl font-bold text-zinc-900">
            Cadastrar nova turma
          </h2>

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
            Cadastrar turma
          </button>
        </form>
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
            Comece criando uma nova turma para organizar estudantes,
            simulados e relatórios acadêmicos.
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

            return (
              <Link
                key={turma.id}
                href={`/turmas/${turma.id}`}
                className="group rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-lg"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <Users size={24} />
                  </div>

                  <ArrowRight
                    size={18}
                    className="text-zinc-400 transition group-hover:text-red-600"
                  />
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 group-hover:text-red-700">
                  {turma.name}
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  {turma.grade}º ano
                </p>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Alunos
                    </p>

                    <p className="mt-2 text-2xl font-bold text-zinc-900">
                      {turma.students.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Simulados da série
                    </p>

                    <p className="mt-2 text-2xl font-bold text-red-600">
                      {totalSimuladosDaSerie}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </AppLayout>
  );
}