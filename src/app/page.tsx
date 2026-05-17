import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  GraduationCap,
  Layers3,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/AppLayout";

export default async function HomePage() {
  const totalTurmas = await prisma.classRoom.count();
  const totalAlunos = await prisma.student.count();
  const totalSimulados = await prisma.exam.count();

  const ultimosSimulados = await prisma.exam.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  return (
    <AppLayout>
      <div className="mb-8 rounded-[32px] bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-8 text-white shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-600/20">
              <BarChart3 size={28} />
            </div>

            <h1 className="text-4xl font-bold tracking-tight">
              Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Visão geral da plataforma de acompanhamento de desempenho
              acadêmico, simulados, turmas e estudantes.
            </p>
          </div>

          <Link
            href="/simulados"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
          >
            Ver simulados
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <section className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Users size={22} />
          </div>

          <p className="text-sm font-medium text-zinc-500">
            Turmas cadastradas
          </p>

          <p className="mt-2 text-4xl font-bold tracking-tight text-zinc-900">
            {totalTurmas}
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <GraduationCap size={22} />
          </div>

          <p className="text-sm font-medium text-zinc-500">
            Alunos cadastrados
          </p>

          <p className="mt-2 text-4xl font-bold tracking-tight text-zinc-900">
            {totalAlunos}
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <BookOpen size={22} />
          </div>

          <p className="text-sm font-medium text-zinc-500">
            Simulados criados
          </p>

          <p className="mt-2 text-4xl font-bold tracking-tight text-red-600">
            {totalSimulados}
          </p>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">
                Últimos simulados
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Avaliações cadastradas recentemente.
              </p>
            </div>

            <Link
              href="/simulados"
              className="text-sm font-semibold text-red-600 hover:text-red-700"
            >
              Ver todos
            </Link>
          </div>

          <div className="grid gap-4">
            {ultimosSimulados.map((simulado) => (
              <Link
                key={simulado.id}
                href={`/simulados/${simulado.id}`}
                className="group rounded-2xl border border-zinc-200 p-5 transition hover:border-red-200 hover:bg-red-50/40"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-zinc-900 group-hover:text-red-700">
                      {simulado.title}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      {simulado.grade}º ano • {simulado.totalQuestions}{" "}
                      questões
                    </p>
                  </div>

                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                    {simulado.status}
                  </span>
                </div>
              </Link>
            ))}

            {ultimosSimulados.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center">
                <p className="text-sm text-zinc-500">
                  Nenhum simulado cadastrado ainda.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
            <Layers3 size={22} />
          </div>

          <h2 className="text-xl font-bold text-zinc-900">
            Fluxo principal
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            O sistema segue um fluxo centralizado no simulado: estruturação,
            gabarito, respostas, correção automática e análise.
          </p>

          <div className="mt-6 grid gap-3">
            {[
              "Criar simulado",
              "Configurar blocos",
              "Preencher gabarito",
              "Lançar respostas",
              "Analisar resultados",
            ].map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-4"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                  {index + 1}
                </div>

                <p className="text-sm font-medium text-zinc-700">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppLayout>
  );
}