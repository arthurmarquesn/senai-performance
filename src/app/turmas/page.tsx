import Link from "next/link";
import { ArrowRight, Plus, Users } from "lucide-react";

import { createClassRoom } from "./actions";
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

  const totalResultados = turmas.reduce(
    (acc, turma) =>
      acc +
      turma.students.reduce(
        (studentAcc, student) => studentAcc + student.results.length,
        0
      ),
    0
  );

  const totalSimuladosSeries = simuladosPorSerie.reduce(
    (acc, item) => acc + item._count.id,
    0
  );

  const turmasPorSerie = [1, 2, 3].map((grade) => ({
    grade,
    turmas: turmas.filter((turma) => turma.grade === grade),
    simulados: getTotalSimuladosDaSerie(grade),
  }));

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Núcleo acadêmico"
        title="Turmas"
        description="Estrutura institucional das turmas, com vínculo de estudantes, simulados por série e sinais de acompanhamento pedagógico."
        icon={<Users size={24} />}
        actions={
          <Link
            href="/turmas#cadastro"
            className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.99]"
          >
            <Plus size={17} />
            Nova turma
          </Link>
        }
        stats={
          <MetricStrip>
            <MetricCell
              label="Turmas"
              value={turmas.length}
              detail="unidades acadêmicas"
              tone="brand"
            />
            <MetricCell label="Alunos" value={totalAlunos} detail="vinculados" />
            <MetricCell
              label="Simulados"
              value={totalSimuladosSeries}
              detail="disponíveis por série"
            />
            <MetricCell
              label="Leituras"
              value={totalLeituras}
              detail={`${totalResultados} resultado(s)`}
            />
          </MetricStrip>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel className="min-h-[520px]">
          <SectionHeader
            eyebrow="Mapa das turmas"
            title="Turmas cadastradas"
            description={`${turmas.length} turma(s) organizadas por série, com dados de alunos, simulados, resultados e leitura.`}
            action={
              <Badge tone="brand">
                {totalSimuladosSeries} simulado(s) na matriz
              </Badge>
            }
          />

          {turmas.length === 0 ? (
            <EmptyState
              title="Nenhuma turma cadastrada"
              description="Crie uma turma para organizar estudantes, simulados, leituras e relatórios acadêmicos."
              action={
                <Link
                  href="/turmas#cadastro"
                  className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus size={17} />
                  Criar primeira turma
                </Link>
              }
            />
          ) : (
            <div className="space-y-6">
              {turmasPorSerie.map((grupo) => (
                <section key={grupo.grade}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white">
                        {grupo.grade}º
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-950">
                          {grupo.grade}º ano
                        </h3>
                        <p className="text-xs text-zinc-500">
                          {grupo.turmas.length} turma(s) · {grupo.simulados} simulado(s)
                        </p>
                      </div>
                    </div>
                    <div className="hidden h-px flex-1 bg-zinc-200 md:block" />
                  </div>

                  {grupo.turmas.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 px-4 py-5 text-sm text-zinc-500">
                      Nenhuma turma cadastrada para esta série.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white/70">
                      {grupo.turmas.map((turma, index) => {
                        const totalSimuladosDaSerie = getTotalSimuladosDaSerie(
                          turma.grade
                        );

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
                            className={`performance-data-row group grid gap-4 px-4 py-4 transition md:grid-cols-[minmax(180px,1.2fr)_repeat(4,minmax(72px,0.55fr))_auto] md:items-center ${
                              index > 0 ? "border-t border-zinc-200" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="performance-icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                                <Users size={20} />
                              </div>
                              <div>
                                <h4 className="font-semibold tracking-tight text-zinc-950 transition group-hover:text-red-700">
                                  {turma.name}
                                </h4>
                                <p className="mt-1 text-xs text-zinc-500">
                                  Entidade acadêmica · {turma.grade}º ano
                                </p>
                              </div>
                            </div>

                            <DataPoint
                              label="Alunos"
                              value={String(turma.students.length)}
                            />
                            <DataPoint
                              label="Simulados"
                              value={String(totalSimuladosDaSerie)}
                              brand
                            />
                            <DataPoint
                              label="Resultados"
                              value={String(totalResultadosDaTurma)}
                            />
                            <DataPoint
                              label="Leituras"
                              value={String(totalLeiturasDaTurma)}
                              brand
                            />

                            <div className="flex items-center justify-between gap-3 md:justify-end">
                              <Badge tone="neutral">Painel da turma</Badge>
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
                </section>
              ))}
            </div>
          )}
        </Panel>

        <aside className="space-y-6">
          <Panel id="cadastro" className="xl:sticky xl:top-24">
            <SectionHeader
              eyebrow="Cadastro"
              title="Nova turma"
              description="Informe o nome da turma e selecione a série correspondente."
            />

            <form action={createClassRoom} className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-800">
                  Nome da turma
                </span>
                <input
                  name="name"
                  placeholder="Ex: IDEV-2"
                  className="performance-field rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-800">
                  Série
                </span>
                <select
                  name="grade"
                  defaultValue=""
                  className="performance-field rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                >
                  <option value="" disabled>
                    Selecione a série
                  </option>

                  <option value="1">1º ano</option>
                  <option value="2">2º ano</option>
                  <option value="3">3º ano</option>
                </select>
              </label>

              <button
                type="submit"
                className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.99]"
              >
                <Plus size={18} />
                Cadastrar turma
              </button>
            </form>
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow="Leitura rápida"
              title="Cobertura acadêmica"
              description="Resumo operacional para localizar séries sem turmas ou com baixa estrutura de simulado."
            />

            <div className="space-y-3">
              {turmasPorSerie.map((grupo) => (
                <div
                  key={grupo.grade}
                  className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">
                      {grupo.grade}º ano
                    </p>
                    <p className="text-xs text-zinc-500">
                      {grupo.turmas.length} turma(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-red-600">
                      {grupo.simulados}
                    </p>
                    <p className="text-xs text-zinc-500">simulados</p>
                  </div>
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
