import type { ReactNode } from "react";

import Link from "next/link";

import {
  ArrowRight,
  FileText,
  Map,
  Plus,
  Sparkles,
  Workflow,
} from "lucide-react";

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

import { createJourney } from "./actions";

const dateFormatter =
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const statusLabels = {
  DRAFT: "Rascunho",
  IN_ANALYSIS: "Em análise",
  ACTIVE: "Ativa",
  ARCHIVED: "Arquivada",
} as const;

const statusTones = {
  DRAFT: "neutral",
  IN_ANALYSIS: "warning",
  ACTIVE: "success",
  ARCHIVED: "neutral",
} as const;

export default async function JornadasPage() {
  const journeys =
    await prisma.journey.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },

        _count: {
          select: {
            documents: true,
            analyses: true,
            suggestions: true,
            activities: true,
          },
        },
      },

      orderBy: {
        updatedAt: "desc",
      },
    });

  const activeJourneys =
    journeys.filter(
      (journey) =>
        journey.status === "ACTIVE",
    ).length;

  const journeysInAnalysis =
    journeys.filter(
      (journey) =>
        journey.status ===
        "IN_ANALYSIS",
    ).length;

  const totalDocuments =
    journeys.reduce(
      (total, journey) =>
        total +
        journey._count.documents,
      0,
    );

  const totalSuggestions =
    journeys.reduce(
      (total, journey) =>
        total +
        journey._count.suggestions,
      0,
    );

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Ecossistema pedagógico"
        title="Jornadas"
        description="Organize experiências pedagógicas, reúna roteiros e prepare contextos interdisciplinares para análise pedagógica."
        icon={
          <Map size={24} />
        }
        actions={
          <Link
            href="/jornadas#nova-jornada"
            className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.99]"
          >
            <Plus size={17} />

            Nova Jornada
          </Link>
        }
        stats={
          <MetricStrip>
            <MetricCell
              label="Jornadas"
              value={journeys.length}
              detail={`${activeJourneys} ativa(s)`}
              tone="brand"
            />

            <MetricCell
              label="Em análise"
              value={
                journeysInAnalysis
              }
              detail="processamento pedagógico"
            />

            <MetricCell
              label="Documentos"
              value={totalDocuments}
              detail="roteiros vinculados"
            />

            <MetricCell
              label="Sugestões"
              value={totalSuggestions}
              detail="geradas no ecossistema"
            />
          </MetricStrip>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Panel className="min-h-[520px]">
          <SectionHeader
            eyebrow="Visão geral"
            title="Jornadas cadastradas"
            description="Todas as Jornadas fazem parte do mesmo ecossistema pedagógico e estão disponíveis para todo o corpo docente."
          />

          {journeys.length === 0 ? (
            <EmptyState
              title="Nenhuma Jornada cadastrada"
              description="Crie a primeira Jornada para iniciar o fluxo de documentos, análise pedagógica e cruzamento com a BNCC."
              action={
                <Link
                  href="/jornadas#nova-jornada"
                  className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus size={17} />

                  Criar primeira Jornada
                </Link>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white/70">
              {journeys.map(
                (
                  journey,
                  index,
                ) => (
                  <Link
                    key={journey.id}
                    href={`/jornadas/${journey.id}`}
                    className={`performance-data-row group block px-5 py-5 transition hover:bg-zinc-50/80 ${
                      index > 0
                        ? "border-t border-zinc-200"
                        : ""
                    }`}
                  >
                    <div className="grid gap-5 lg:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(82px,0.55fr))_auto] lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold tracking-tight text-zinc-950 transition group-hover:text-red-700">
                            {
                              journey.title
                            }
                          </h3>

                          <Badge
                            tone={
                              statusTones[
                                journey.status
                              ]
                            }
                          >
                            {
                              statusLabels[
                                journey.status
                              ]
                            }
                          </Badge>
                        </div>

                        <p className="mt-1 text-xs text-zinc-500">
                          {journey.grade}
                          º ano
                          {" · "}
                          Criada por{" "}
                          {journey
                            .createdBy
                            ?.name ??
                            "usuário removido"}
                          {" · "}
                          Atualizada em{" "}
                          {dateFormatter.format(
                            journey.updatedAt,
                          )}
                        </p>

                        {journey.description && (
                          <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
                            {
                              journey.description
                            }
                          </p>
                        )}
                      </div>

                      <DataPoint
                        icon={
                          <FileText
                            size={15}
                          />
                        }
                        label="Documentos"
                        value={String(
                          journey._count
                            .documents,
                        )}
                      />

                      <DataPoint
                        icon={
                          <Sparkles
                            size={15}
                          />
                        }
                        label="Análises"
                        value={String(
                          journey._count
                            .analyses,
                        )}
                      />

                      <DataPoint
                        icon={
                          <Map
                            size={15}
                          />
                        }
                        label="Sugestões"
                        value={String(
                          journey._count
                            .suggestions,
                        )}
                      />

                      <DataPoint
                        icon={
                          <Workflow
                            size={15}
                          />
                        }
                        label="Atividades"
                        value={String(
                          journey._count
                            .activities,
                        )}
                      />

                      <div className="flex items-center justify-end">
                        <ArrowRight
                          size={18}
                          className="text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-red-600"
                        />
                      </div>
                    </div>
                  </Link>
                ),
              )}
            </div>
          )}
        </Panel>

        <aside className="space-y-6">
          <Panel
            id="nova-jornada"
            className="xl:sticky xl:top-24"
          >
            <SectionHeader
              eyebrow="Cadastro"
              title="Nova Jornada"
              description="A Jornada ficará automaticamente disponível para todo o corpo docente."
            />

            <form
              action={createJourney}
              className="grid gap-4"
            >
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-800">
                  Título
                </span>

                <input
                  name="title"
                  required
                  maxLength={180}
                  placeholder="Ex: Biblioteca das Vozes"
                  className="performance-field rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-800">
                  Série
                </span>

                <select
                  name="grade"
                  required
                  defaultValue=""
                  className="performance-field rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                >
                  <option
                    value=""
                    disabled
                  >
                    Selecione a série
                  </option>

                  <option value="1">
                    1º ano
                  </option>

                  <option value="2">
                    2º ano
                  </option>

                  <option value="3">
                    3º ano
                  </option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-800">
                  Descrição
                </span>

                <textarea
                  name="description"
                  rows={5}
                  placeholder="Contexto geral, propósito ou síntese da experiência pedagógica."
                  className="performance-field resize-y rounded-2xl border px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                />
              </label>

              <button
                type="submit"
                className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.99]"
              >
                <Plus size={18} />

                Criar Jornada
              </button>
            </form>
          </Panel>
        </aside>
      </div>
    </AppLayout>
  );
}

function DataPoint({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-zinc-400">
        {icon}

        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em]">
          {label}
        </p>
      </div>

      <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">
        {value}
      </p>
    </div>
  );
}