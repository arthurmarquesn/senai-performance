import Link from "next/link";
import {
  ArrowRight,
  GraduationCap,
  Plus,
  Search,
  Users,
} from "lucide-react";

import { createStudent } from "./actions";
import { AppLayout } from "@/components/AppLayout";
import {
  Badge,
  EmptyState,
  MetricCell,
  MetricStrip,
  PageHeader,
  Panel,
  SectionHeader,
} from "@/components/design-system";
import { prisma } from "@/lib/prisma";

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

  const totalResultados = alunos.reduce(
    (acc, aluno) => acc + aluno.results.length,
    0
  );

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Perfis academicos"
        title="Alunos"
        description="Base de estudantes vinculados as turmas, com simulados e sinais individuais de acompanhamento."
        icon={<GraduationCap size={24} />}
        actions={
          <Link
            href="/alunos#cadastro"
            className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.99]"
          >
            <Plus size={17} />
            Novo aluno
          </Link>
        }
        stats={
          <MetricStrip columns="md:grid-cols-4">
            <MetricCell
              label="Alunos"
              value={alunos.length}
              detail="estudantes cadastrados"
              tone="brand"
            />
            <MetricCell label="Turmas" value={turmas.length} detail="ativas" />
            <MetricCell
              label="Simulados"
              value={totalResultados}
              detail="resultados vinculados"
            />
            <MetricCell
              label="Resultados"
              value={totalResultados}
              detail="registros oficiais"
              tone="brand"
            />
          </MetricStrip>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <SectionHeader
            eyebrow="Diretorio"
            title="Lista de alunos"
            description={`${alunos.length} estudante(s) cadastrados e disponiveis para analise individual.`}
            action={
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-400">
                <Search size={16} />
                <input
                  placeholder="Busca visual futura"
                  className="w-[180px] bg-transparent outline-none"
                  disabled
                />
              </div>
            }
          />

          {alunos.length === 0 ? (
            <EmptyState
              title="Nenhum aluno cadastrado"
              description="Cadastre estudantes para acompanhar desempenho, simulados e evolucao academica."
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white/70">
              {alunos.map((aluno, index) => {
                const totalSimulados = aluno.results.length;
                const totalQuestoes = aluno.results.reduce((acc, result) => {
                  return (
                    acc +
                    result.answers.filter((answer) => answer.answer !== null)
                      .length
                  );
                }, 0);

                return (
                  <Link
                    key={aluno.id}
                    href={`/alunos/${aluno.id}`}
                    className={`performance-data-row group grid gap-4 px-4 py-4 transition md:grid-cols-[minmax(220px,1.3fr)_repeat(4,minmax(78px,0.55fr))_auto] md:items-center ${
                      index > 0 ? "border-t border-zinc-200" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="performance-icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                        <GraduationCap size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold tracking-tight text-zinc-950 transition group-hover:text-red-700">
                          {aluno.name}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500">
                          {aluno.classRoom.name}
                        </p>
                      </div>
                    </div>

                    <DataPoint
                      label="Numero"
                      value={String(aluno.number ?? "-")}
                    />
                    <DataPoint
                      label="Simulados"
                      value={String(totalSimulados)}
                      brand
                    />
                    <DataPoint label="Questoes" value={String(totalQuestoes)} />
                    <DataPoint
                      label="Serie"
                      value={`${aluno.classRoom.grade} ano`}
                      brand
                    />

                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <Badge tone="neutral">Perfil academico</Badge>
                      <ArrowRight
                        size={18}
                        className="text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-red-600"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Panel>

        <aside className="space-y-6">
          <Panel id="cadastro" className="xl:sticky xl:top-24">
            <SectionHeader
              eyebrow="Cadastro"
              title="Novo aluno"
              description="Vincule estudantes as turmas para iniciar o acompanhamento."
            />

            <form action={createStudent} className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-800">
                  Nome completo
                </span>
                <input
                  name="name"
                  placeholder="Nome completo"
                  className="performance-field rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-800">
                  Numero
                </span>
                <input
                  name="number"
                  type="number"
                  placeholder="Numero"
                  className="performance-field rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-800">
                  Turma
                </span>
                <select
                  name="classRoomId"
                  defaultValue=""
                  className="performance-field rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
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
              </label>

              <button
                type="submit"
                className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.99]"
              >
                <Plus size={18} />
                Cadastrar aluno
              </button>
            </form>
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow="Distribuicao"
              title="Turmas disponiveis"
              description="Referencia rapida para vinculacao de estudantes."
            />
            <div className="space-y-3">
              {turmas.map((turma) => (
                <div
                  key={turma.id}
                  className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">
                      {turma.name}
                    </p>
                    <p className="text-xs text-zinc-500">{turma.grade} ano</p>
                  </div>
                  <Users size={17} className="text-red-600" />
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </AppLayout>
  );
}

function DataPoint({
  label,
  value,
  brand = false,
}: {
  label: string;
  value: string;
  brand?: boolean;
}) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-semibold tracking-tight ${
          brand ? "text-red-600" : "text-zinc-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
