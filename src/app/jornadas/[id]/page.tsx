import type {
  ReactNode,
} from "react";

import Link from "next/link";

import {
  JourneyMindMapButton,
} from "./JourneyMindMapButton";

import {
  JourneyMindMapView,
} from "./JourneyMindMapView";

import {
  ArrowLeft,
  BookOpen,
  BookOpenCheck,
  CheckCircle2,
  FileText,
  Lightbulb,
  Map,
  Network,
  ShieldCheck,
  Sparkles,
  TextQuote,
  XCircle,
} from "lucide-react";

import {
  AppLayout,
} from "@/components/AppLayout";

import {
  Badge,
  EmptyState,
  MetricCell,
  MetricStrip,
  PageHeader,
  Panel,
  SectionHeader,
} from "@/components/design-system";

import {
  prisma,
} from "@/lib/prisma";

import {
  addJourneyText,
} from "./actions";

import {
  JourneyAnalysisButton,
} from "./JourneyAnalysisButton";

import {
  JourneyBnccButton,
} from "./JourneyBnccButton";

import {
  JourneyBnccReview,
} from "./JourneyBnccReview";

const dateFormatter =
  new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );

const statusLabels = {
  DRAFT:
    "Rascunho",

  IN_ANALYSIS:
    "Em análise",

  ACTIVE:
    "Ativa",

  ARCHIVED:
    "Arquivada",
} as const;

const statusTones = {
  DRAFT:
    "neutral",

  IN_ANALYSIS:
    "warning",

  ACTIVE:
    "success",

  ARCHIVED:
    "neutral",
} as const;

const subjectLabels = {
  MATEMATICA:
    "Matemática",

  FISICA:
    "Física",

  QUIMICA:
    "Química",

  BIOLOGIA:
    "Biologia",

  PORTUGUES:
    "Língua Portuguesa",

  INGLES:
    "Língua Inglesa",

  ARTES:
    "Artes",

  EDUCACAO_FISICA:
    "Educação Física",

  SOCIOLOGIA:
    "Sociologia",

  FILOSOFIA:
    "Filosofia",

  GEOGRAFIA:
    "Geografia",

  HISTORIA:
    "História",
} as const;

const suggestionTypeLabels = {
  CONTENT:
    "Conteúdo",

  INTERDISCIPLINARY_CONNECTION:
    "Conexão interdisciplinar",

  REFERENCE:
    "Referência",

  CLASSROOM_POSSIBILITY:
    "Possibilidade em sala",

  SOCIOCULTURAL_REPERTOIRE:
    "Repertório sociocultural",

  WRITING_THEME:
    "Tema de produção textual",
} as const;

const analysisStatusLabels = {
  PENDING:
    "Pendente",

  PROCESSING:
    "Processando",

  COMPLETED:
    "Concluída",

  FAILED:
    "Falhou",
} as const;

const analysisStatusTones = {
  PENDING:
    "neutral",

  PROCESSING:
    "warning",

  COMPLETED:
    "success",

  FAILED:
    "warning",
} as const;

const bnccConfidenceLabels = {
  HIGH:
    "Confiança alta",

  MEDIUM:
    "Confiança média",

  LOW:
    "Confiança baixa",
} as const;

const reviewStatusLabels = {
  SUGGESTED:
    "Aguardando validação",

  APPROVED:
    "Aprovada",

  REJECTED:
    "Rejeitada",
} as const;

function readStringArray(
  value: unknown,
): string[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .filter(
      (
        item,
      ): item is string =>
        typeof item ===
        "string",
    )
    .map(
      (item) =>
        item.trim(),
    )
    .filter(Boolean);
}

export default async function JornadaDetalhePage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    id,
  } =
    await params;

  const journey =
    await prisma.journey.findUnique({
      where: {
        id,
      },

      include: {
        mindMaps: {
  where: {
    isCurrent: true,
  },

  orderBy: {
    version: "desc",
  },

  take: 1,
},
        createdBy: {
          select: {
            id:
              true,

            name:
              true,
          },
        },

        documents: {
          include: {
            _count: {
              select: {
                chunks:
                  true,
              },
            },
          },

          orderBy: {
            createdAt:
              "desc",
          },
        },

        suggestions: {
          include: {
            analysis: {
              select: {
                id:
                  true,

                createdAt:
                  true,

                modelName:
                  true,
              },
            },

            bnccLinks: {
              include: {
                validatedBy: {
                  select: {
                    name:
                      true,
                  },
                },

                bnccSkill: {
                  include: {
                    source: {
                      select: {
                        title:
                          true,

                        publisher:
                          true,

                        status:
                          true,

                        verifiedAt:
                          true,
                      },
                    },
                  },
                },
              },

              orderBy: [
                {
                  candidateRank:
                    "asc",
                },

                {
                  createdAt:
                    "asc",
                },
              ],
            },
          },

          orderBy: {
            createdAt:
              "desc",
          },

          take: 30,
        },

        analyses: {
          orderBy: {
            createdAt:
              "desc",
          },

          take: 8,
        },

        _count: {
          select: {
            suggestions:
              true,

            mindMaps:
              true,

            activities:
              true,
          },
        },
      },
    });

  if (!journey) {
    return (
      <AppLayout>
        <Panel>
          <p className="text-sm text-zinc-500">
            Jornada não encontrada.
          </p>
        </Panel>
      </AppLayout>
    );
  }

  const readyDocuments =
    journey.documents.filter(
      (document) =>
        document.status ===
        "READY",
    ).length;

  const totalChunks =
    journey.documents.reduce(
      (
        total,
        document,
      ) =>
        total +
        document._count
          .chunks,
      0,
    );

  const canAnalyze =
    readyDocuments >
      0 &&
    totalChunks >
      0 &&
    journey.status !==
      "ARCHIVED";

  const latestCompletedAnalysis =
    journey.analyses.find(
      (analysis) =>
        analysis.status ===
        "COMPLETED",
    );

  const currentSuggestions =
    latestCompletedAnalysis
      ? journey.suggestions.filter(
          (suggestion) =>
            suggestion.analysisId ===
            latestCompletedAnalysis.id,
        )
      : [];

  const currentBnccLinks =
    currentSuggestions.flatMap(
      (suggestion) =>
        suggestion.bnccLinks,
    );

  const approvedLinks =
    currentBnccLinks.filter(
      (link) =>
        link.status ===
        "APPROVED",
    );

  const rejectedLinks =
    currentBnccLinks.filter(
      (link) =>
        link.status ===
        "REJECTED",
    );

  const pendingLinks =
    currentBnccLinks.filter(
      (link) =>
        link.status ===
        "SUGGESTED",
    );

  const canLinkBncc =
    currentSuggestions.length >=
      3 &&
    journey.status !==
      "ARCHIVED" &&
    journey.status !==
      "IN_ANALYSIS";
      const currentMindMap =
  journey.mindMaps[0] ??
  null;

const canGenerateMindMap =
  currentSuggestions.length >=
    3 &&
  Boolean(
    latestCompletedAnalysis,
  ) &&
  journey.status !==
    "ARCHIVED" &&
  journey.status !==
    "IN_ANALYSIS";

const mindMapMatchesCurrentAnalysis =
  Boolean(
    currentMindMap &&
      latestCompletedAnalysis &&
      currentMindMap.analysisId ===
        latestCompletedAnalysis.id,
  );

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Jornada pedagógica"
        title={
          journey.title
        }
        description={
          journey.description ??
          `${journey.grade}º ano · Jornada em construção.`
        }
        icon={
          <Map
            size={24}
          />
        }
        actions={
          <Link
            href="/jornadas"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <ArrowLeft
              size={16}
            />

            Voltar para Jornadas
          </Link>
        }
        stats={
          <MetricStrip>
            <MetricCell
              label="Status"
              value={
                statusLabels[
                  journey.status
                ]
              }
              detail={`${journey.grade}º ano`}
              tone="brand"
            />

            <MetricCell
              label="Roteiros"
              value={
                journey.documents.length
              }
              detail={`${totalChunks} fragmento(s)`}
            />

            <MetricCell
              label="Sugestões"
              value={
                currentSuggestions.length
              }
              detail="análise mais recente"
            />

            <MetricCell
              label="BNCC aprovadas"
              value={
                approvedLinks.length
              }
              detail={`${pendingLinks.length} aguardando validação`}
            />
          </MetricStrip>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <Panel>
            <SectionHeader
              eyebrow="Estrutura"
              title="Contexto da Jornada"
              description="O contexto central da experiência pedagógica utilizado pelos diferentes componentes curriculares."
              action={
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
              }
            />

            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard
                label="Série"
                value={`${journey.grade}º ano`}
              />

              <InfoCard
                label="Criada por"
                value={
                  journey.createdBy
                    ?.name ??
                  "Usuário removido"
                }
              />

              <InfoCard
                label="Criada em"
                value={dateFormatter.format(
                  journey.createdAt,
                )}
              />
            </div>
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow="Roteiro"
              title="Conteúdo da Jornada"
              description="Cole o roteiro, descrição detalhada ou conteúdo que deverá ser interpretado pedagogicamente."
              action={
                <TextQuote
                  size={18}
                  className="text-zinc-400"
                />
              }
            />

            <form
              action={
                addJourneyText
              }
              className="space-y-4"
            >
              <input
                type="hidden"
                name="journeyId"
                value={
                  journey.id
                }
              />

              <textarea
                name="sourceText"
                required
                rows={14}
                placeholder="Cole ou escreva aqui o roteiro completo da Jornada..."
                className="performance-field min-h-[320px] w-full resize-y rounded-2xl border px-4 py-4 text-sm leading-7 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                >
                  <FileText
                    size={17}
                  />

                  Adicionar roteiro
                </button>
              </div>
            </form>
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow="Inteligência pedagógica"
              title="Análise da Jornada"
              description="A IA transforma o roteiro em possibilidades pedagógicas estruturadas."
              action={
                <Sparkles
                  size={18}
                  className="text-zinc-400"
                />
              }
            />

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <JourneyAnalysisButton
                journeyId={
                  journey.id
                }
                disabled={
                  !canAnalyze
                }
              />
            </div>

            {latestCompletedAnalysis
              ?.summary && (
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                  Síntese da análise
                </p>

                <p className="mt-3 text-sm leading-7 text-zinc-700">
                  {
                    latestCompletedAnalysis.summary
                  }
                </p>
              </div>
            )}
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow="Base oficial"
              title="Cruzamento com a BNCC"
              description="O sistema só permite associações com habilidades reais presentes na base oficial verificada."
              action={
                <ShieldCheck
                  size={18}
                  className="text-emerald-600"
                />
              }
            />

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <JourneyBnccButton
                journeyId={
                  journey.id
                }
                disabled={
                  !canLinkBncc
                }
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <SmallMetric
                  label="Pendentes"
                  value={
                    pendingLinks.length
                  }
                />

                <SmallMetric
                  label="Aprovadas"
                  value={
                    approvedLinks.length
                  }
                  tone="success"
                />

                <SmallMetric
                  label="Rejeitadas"
                  value={
                    rejectedLinks.length
                  }
                  tone="danger"
                />
              </div>
            </div>
          </Panel>

        <Panel>
  <SectionHeader
    eyebrow="Visão pedagógica"
    title="Mapa mental da Jornada"
    description="Visualize disciplinas, sugestões, conteúdos possíveis e associações BNCC em uma estrutura navegável."
    action={
      <Map
        size={18}
        className="text-red-600"
      />
    }
  />

  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-semibold text-zinc-950">
          Estrutura pedagógica navegável
        </p>

        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">
          O mapa não cria novas informações. Ele organiza deterministicamente as sugestões, conteúdos e habilidades BNCC já existentes na Jornada.
        </p>

        {currentMindMap && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="neutral">
              Versão{" "}
              {
                currentMindMap.version
              }
            </Badge>

            {mindMapMatchesCurrentAnalysis ? (
              <Badge tone="success">
                Análise atual
              </Badge>
            ) : (
              <Badge tone="warning">
                Atualização recomendada
              </Badge>
            )}
          </div>
        )}
      </div>

      <JourneyMindMapButton
        journeyId={
          journey.id
        }
        disabled={
          !canGenerateMindMap
        }
        hasMap={
          Boolean(
            currentMindMap,
          )
        }
      />
    </div>

    {!canGenerateMindMap && (
      <p className="mt-4 text-xs text-amber-700">
        Execute uma análise com pelo menos três sugestões para gerar o mapa mental.
      </p>
    )}
  </div>

  {currentMindMap ? (
    <div className="mt-5">
      <JourneyMindMapView
        structure={
          currentMindMap.structure
        }
      />
    </div>
  ) : (
    <div className="mt-5">
      <EmptyState
        title="Mapa mental ainda não gerado"
        description="Depois da análise pedagógica, gere o mapa para visualizar as conexões da Jornada."
      />
    </div>
  )}
</Panel>

          <Panel>
            <SectionHeader
              eyebrow="Possibilidades"
              title="Sugestões pedagógicas"
              description="Cada sugestão pode possuir habilidades BNCC candidatas que precisam de validação humana."
              action={
                <Badge tone="neutral">
                  {
                    currentSuggestions.length
                  }{" "}
                  sugestão(ões)
                </Badge>
              }
            />

            {currentSuggestions.length ===
            0 ? (
              <EmptyState
                title="Nenhuma sugestão gerada"
                description="Execute a análise da Jornada."
              />
            ) : (
              <div className="space-y-5">
                {currentSuggestions.map(
                  (suggestion) => {
                    const topics =
                      readStringArray(
                        suggestion.contentTopics,
                      );

                    return (
                      <article
                        key={
                          suggestion.id
                        }
                        className="rounded-3xl border border-zinc-200 bg-white p-5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <Lightbulb
                              size={18}
                            />
                          </div>

                          <div>
                            <div className="flex flex-wrap gap-2">
                              <Badge tone="brand">
                                {
                                  subjectLabels[
                                    suggestion.subject
                                  ]
                                }
                              </Badge>

                              <Badge tone="neutral">
                                {
                                  suggestionTypeLabels[
                                    suggestion.type
                                  ]
                                }
                              </Badge>
                            </div>

                            <h3 className="mt-3 text-lg font-semibold text-zinc-950">
                              {
                                suggestion.title
                              }
                            </h3>
                          </div>
                        </div>

                        {suggestion.objective && (
                          <TextSection
                            label="Objetivo"
                            value={
                              suggestion.objective
                            }
                          />
                        )}

                        <TextSection
                          label="Possibilidade pedagógica"
                          value={
                            suggestion.content
                          }
                        />

                        {suggestion.rationale && (
                          <TextSection
                            label="Justificativa pedagógica"
                            value={
                              suggestion.rationale
                            }
                          />
                        )}

                        {topics.length >
                          0 && (
                          <div className="mt-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                              Conteúdos possíveis
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {topics.map(
                                (topic) => (
                                  <span
                                    key={
                                      topic
                                    }
                                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700"
                                  >
                                    {
                                      topic
                                    }
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                        {suggestion.bnccLinks.length >
                        0 && (
                          <div className="mt-6 border-t border-zinc-200 pt-5">
                            <div className="flex items-center gap-2">
                              <BookOpenCheck
                                size={17}
                                className="text-emerald-600"
                              />

                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                Habilidades BNCC
                              </p>
                            </div>

                            <div className="mt-4 space-y-4">
                              {suggestion.bnccLinks.map(
                                (link) => {
                                  const relevance =
                                    link.aiRelevanceScore !==
                                    null
                                      ? Math.round(
                                          link.aiRelevanceScore *
                                            100,
                                        )
                                      : null;

                                  return (
                                    <div
                                      key={
                                        link.id
                                      }
                                      className={`rounded-2xl border p-4 ${
                                        link.status ===
                                        "APPROVED"
                                          ? "border-emerald-200 bg-emerald-50/50"
                                          : link.status ===
                                              "REJECTED"
                                            ? "border-red-200 bg-red-50/40"
                                            : "border-zinc-200 bg-zinc-50"
                                      }`}
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-lg bg-white px-2.5 py-1 font-mono text-xs font-bold text-zinc-900 ring-1 ring-zinc-200">
                                          {
                                            link.bnccSkill.code
                                          }
                                        </span>

                                        {link.status ===
                                          "APPROVED" && (
                                          <CheckCircle2
                                            size={17}
                                            className="text-emerald-600"
                                          />
                                        )}

                                        {link.status ===
                                          "REJECTED" && (
                                          <XCircle
                                            size={17}
                                            className="text-red-600"
                                          />
                                        )}

                                        <Badge
                                          tone={
                                            link.status ===
                                            "APPROVED"
                                              ? "success"
                                              : link.status ===
                                                  "REJECTED"
                                                ? "warning"
                                                : "neutral"
                                          }
                                        >
                                          {
                                            reviewStatusLabels[
                                              link.status
                                            ]
                                          }
                                        </Badge>

                                        {link.confidence && (
                                          <Badge tone="neutral">
                                            {
                                              bnccConfidenceLabels[
                                                link.confidence
                                              ]
                                            }
                                          </Badge>
                                        )}
                                      </div>

                                      <p className="mt-3 text-sm leading-7 text-zinc-700">
                                        {
                                          link.bnccSkill.description
                                        }
                                      </p>

                                      {link.justification && (
                                        <div className="mt-3 rounded-xl border border-zinc-200 bg-white/70 p-3">
                                          <p className="text-xs font-semibold text-zinc-500">
                                            Justificativa da associação
                                          </p>

                                          <p className="mt-1 text-xs leading-6 text-zinc-600">
                                            {
                                              link.justification
                                            }
                                          </p>
                                        </div>
                                      )}

                                      <div className="mt-3 flex flex-wrap gap-3 text-[0.7rem] text-zinc-500">
                                        <span>
                                          Fonte:{" "}
                                          {
                                            link.bnccSkill.source.publisher
                                          }
                                        </span>

                                        {link.bnccSkill.sourcePage !==
                                          null && (
                                          <span>
                                            Página{" "}
                                            {
                                              link.bnccSkill.sourcePage
                                            }
                                          </span>
                                        )}

                                        {relevance !==
                                          null && (
                                          <span>
                                            Pertinência IA:{" "}
                                            {
                                              relevance
                                            }
                                            %
                                          </span>
                                        )}

                                        {link.validatedBy && (
                                          <span>
                                            Validado por{" "}
                                            {
                                              link.validatedBy.name
                                            }
                                          </span>
                                        )}
                                      </div>

                                      <JourneyBnccReview
                                        journeyId={
                                          journey.id
                                        }
                                        linkId={
                                          link.id
                                        }
                                        currentStatus={
                                          link.status
                                        }
                                        validationNote={
                                          link.validationNote
                                        }
                                      />
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow="Base de contexto"
              title="Roteiros adicionados"
              description="Os textos preservados que fundamentam a análise."
              action={
                <Badge tone="neutral">
                  {
                    totalChunks
                  }{" "}
                  fragmento(s)
                </Badge>
              }
            />

            {journey.documents.length ===
            0 ? (
              <EmptyState
                title="Nenhum roteiro adicionado"
                description="Insira o primeiro roteiro."
              />
            ) : (
              <div className="space-y-4">
                {journey.documents.map(
                  (
                    document,
                    index,
                  ) => {
                    const text =
                      document.extractedText ??
                      document.sourceText ??
                      "";

                    const preview =
                      text.length >
                      420
                        ? `${text.slice(
                            0,
                            420,
                          )}…`
                        : text;

                    return (
                      <article
                        key={
                          document.id
                        }
                        className="rounded-2xl border border-zinc-200 bg-white p-5"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-semibold text-zinc-950">
                            Roteiro{" "}
                            {
                              journey.documents.length -
                              index
                            }
                          </p>

                          <Badge tone="success">
                            Pronto
                          </Badge>
                        </div>

                        <p className="mt-3 text-xs text-zinc-500">
                          {
                            document._count.chunks
                          }{" "}
                          fragmento(s)
                        </p>

                        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-600">
                          {
                            preview
                          }
                        </p>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow="Histórico"
              title="Execuções da análise"
              description="Histórico auditável das análises realizadas."
            />

            {journey.analyses.length ===
            0 ? (
              <EmptyState
                title="Nenhuma análise executada"
                description="A primeira execução aparecerá aqui."
              />
            ) : (
              <div className="space-y-3">
                {journey.analyses.map(
                  (analysis) => (
                    <div
                      key={
                        analysis.id
                      }
                      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-950">
                            {analysis.modelName ??
                              "Modelo não registrado"}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {dateFormatter.format(
                              analysis.createdAt,
                            )}
                          </p>
                        </div>

                        <Badge
                          tone={
                            analysisStatusTones[
                              analysis.status
                            ]
                          }
                        >
                          {
                            analysisStatusLabels[
                              analysis.status
                            ]
                          }
                        </Badge>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel>
            <SectionHeader
              eyebrow="Corpo docente"
              title="Participação automática"
              description="Todas as Jornadas pertencem ao ecossistema pedagógico."
            />

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="flex gap-3">
                <Network
                  size={19}
                  className="text-red-600"
                />

                <p className="text-sm leading-6 text-zinc-600">
                  Todos os professores têm acesso às Jornadas. As conexões são organizadas por disciplina e área.
                </p>
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow="Validação BNCC"
              title="Controle humano"
              description="A IA sugere. O professor decide."
            />

            <div className="space-y-3">
              <ValidationItem
                label="Aguardando"
                value={
                  pendingLinks.length
                }
              />

              <ValidationItem
                label="Aprovadas"
                value={
                  approvedLinks.length
                }
                positive
              />

              <ValidationItem
                label="Rejeitadas"
                value={
                  rejectedLinks.length
                }
              />
            </div>
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow="Fluxo"
              title="Evolução da Jornada"
              description="Cada camada utiliza a anterior como evidência."
            />

            <div className="space-y-3">
              <FlowStep
                icon={
                  <FileText
                    size={17}
                  />
                }
                title="1. Roteiro"
                done={
                  totalChunks >
                  0
                }
              />

              <FlowStep
                icon={
                  <Sparkles
                    size={17}
                  />
                }
                title="2. Interpretação"
                done={
                  currentSuggestions.length >
                  0
                }
              />

              <FlowStep
                icon={
                  <BookOpen
                    size={17}
                  />
                }
                title="3. BNCC"
                done={
                  currentBnccLinks.length >
                  0
                }
              />

              <FlowStep
                icon={
                  <ShieldCheck
                    size={17}
                  />
                }
                title="4. Validação"
                done={
                  approvedLinks.length >
                  0
                }
              />

              <FlowStep
                icon={
                  <Map
                    size={17}
                  />
                }
                title="5. Mapa mental"
              />
            </div>
          </Panel>
        </aside>
      </div>
    </AppLayout>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function SmallMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?:
    | "success"
    | "danger";
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-semibold ${
          tone ===
          "success"
            ? "text-emerald-700"
            : tone ===
                "danger"
              ? "text-red-700"
              : "text-zinc-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TextSection({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
        {value}
      </p>
    </div>
  );
}

function ValidationItem({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: number;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <span className="text-sm text-zinc-600">
        {label}
      </span>

      <span
        className={`text-sm font-bold ${
          positive
            ? "text-emerald-700"
            : "text-zinc-950"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function FlowStep({
  icon,
  title,
  done = false,
}: {
  icon: ReactNode;
  title: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          done
            ? "bg-emerald-50 text-emerald-600"
            : "bg-white text-red-600"
        }`}
      >
        {icon}
      </div>

      <p className="text-sm font-semibold text-zinc-950">
        {title}
      </p>
    </div>
  );
}