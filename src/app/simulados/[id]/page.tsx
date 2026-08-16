import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Download,
  FileCheck2,
  Layers3,
  ListChecks,
} from "lucide-react";

import { createBlock } from "./actions";
import { AnswerKeyEditor } from "@/components/AnswerKeyEditor";
import { AnswerSheetGeneratorForm } from "@/components/AnswerSheetGeneratorForm";
import { AnswerSheetScanImportForm } from "@/components/AnswerSheetScanImportForm";
import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { AppLayout } from "@/components/AppLayout";
import {
  Badge,
  MetricCell,
  MetricStrip,
  PageHeader,
  Panel,
  SectionHeader,
} from "@/components/design-system";
import { prisma } from "@/lib/prisma";

const scanBatchStatusLabels = {
  UPLOADED: "Recebido",
  PROCESSING: "Processando",
  REVIEW_REQUIRED: "Concluído com ocorrências",
  READY_FOR_CONFIRMATION: "Concluído",
  CONFIRMED: "Concluído",
  FAILED: "Falhou",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function SimuladoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const simulado = await prisma.exam.findUnique({
    where: {
      id,
    },
    include: {
      blocks: {
        orderBy: {
          startQuestion: "asc",
        },
      },
      answerKey: {
        orderBy: {
          question: "asc",
        },
      },
      applications: {
        include: {
          classRoom: true,
          scanBatches: {
            orderBy: {
              createdAt: "desc",
            },
            include: {
              scans: {
                orderBy: {
                  pageNumber: "asc",
                },
                include: {
                  answerSheet: {
                    include: {
                      student: true,
                    },
                  },
                  _count: {
                    select: {
                      answers: true,
                    },
                  },
                  answers: {
                    select: {
                      detectionStatus: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  scans: true,
                },
              },
            },
          },
          _count: {
            select: {
              answerSheets: true,
            },
          },
        },
        orderBy: {
          classRoom: {
            name: "asc",
          },
        },
      },
    },
  });

  if (!simulado) {
    return (
      <AppLayout>
        <Panel>
          <p className="text-sm text-zinc-500">Simulado não encontrado.</p>
        </Panel>
      </AppLayout>
    );
  }

  const compatibleClassRooms = await prisma.classRoom.findMany({
    where: {
      grade: simulado.grade,
    },
    include: {
      _count: {
        select: {
          students: true,
        },
      },
      examApplications: {
        where: {
          examId: simulado.id,
        },
        include: {
          _count: {
            select: {
              answerSheets: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const classRoomOptions = compatibleClassRooms.map((classRoom) => ({
    id: classRoom.id,
    name: classRoom.name,
    grade: classRoom.grade,
    studentsCount: classRoom._count.students,
    existingSheets:
      classRoom.examApplications[0]?._count.answerSheets ?? 0,
  }));

  const totalSheets = simulado.applications.reduce(
    (acc, application) => acc + application._count.answerSheets,
    0
  );
  return (
    <AppLayout>
      <AppBreadcrumb
        items={[
          {
            label: "Simulados",
            href: "/simulados",
          },
          {
            label: simulado.title,
          },
        ]}
      />
      <PageHeader
        eyebrow="Simulado"
        title={simulado.title}
        description={`${simulado.grade}º ano · ${simulado.totalQuestions} questões · gestão de blocos, gabarito e folhas físicas.`}
        icon={<ListChecks size={24} />}
        actions={
          <>
            <Link
              href={`/simulados/${simulado.id}/respostas`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Lançar respostas
              <ArrowRight size={16} />
            </Link>
            <Link
              href={`/simulados/${simulado.id}/resultados`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Resultados
              <ArrowRight size={16} />
            </Link>
            <Link
              href={`/simulados/${simulado.id}/ranking`}
              className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white"
            >
              Ranking
              <BarChart3 size={16} />
            </Link>
          </>
        }
        stats={
          <MetricStrip columns="md:grid-cols-4">
            <MetricCell label="Status" value={simulado.status} />
            <MetricCell
              label="Blocos"
              value={simulado.blocks.length}
              detail="disciplinas"
            />
            <MetricCell
              label="Gabarito"
              value={simulado.answerKey.length}
              detail="questões cadastradas"
            />
            <MetricCell
              label="Folhas físicas"
              value={totalSheets}
              detail={`${simulado.applications.length} aplicação(ões)`}
              tone="brand"
            />
          </MetricStrip>
        }
      />

      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1 print:hidden">
        {[
          ["Visao geral", "#visao-geral"],
          ["Gabarito", "#gabarito"],
          ["Aplicacoes", "#aplicacoes"],
          ["Digitalizacao", "#digitalizacao"],
          ["Resultados", "#resultados"],
        ].map(([label, href]) => (
          <a
            key={href}
            href={href}
            className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-red-50 hover:text-red-700"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <Panel id="visao-geral">
            <SectionHeader
              eyebrow="Estrutura"
              title="Adicionar bloco"
              description="Defina intervalos de questões por disciplina sem alterar o gabarito."
            />

            <form action={createBlock} className="grid gap-4 md:grid-cols-4">
              <input type="hidden" name="examId" value={simulado.id} />

              <select
                name="subject"
                className="performance-field rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                defaultValue=""
              >
                <option value="" disabled>
                  Disciplina
                </option>
                <option value="MATEMATICA">Matemática</option>
                <option value="FISICA">Física</option>
                <option value="QUIMICA">Química</option>
                <option value="BIOLOGIA">Biologia</option>
                <option value="PORTUGUES">Português</option>
                <option value="INGLES">Inglês</option>
                <option value="ARTES">Artes</option>
                <option value="EDUCACAO_FISICA">Educação Física</option>
                <option value="SOCIOLOGIA">Sociologia</option>
                <option value="FILOSOFIA">Filosofia</option>
                <option value="GEOGRAFIA">Geografia</option>
                <option value="HISTORIA">História</option>
              </select>

              <input
                name="startQuestion"
                type="number"
                min="1"
                max={simulado.totalQuestions}
                placeholder="Questão inicial"
                className="performance-field rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
              />

              <input
                name="endQuestion"
                type="number"
                min="1"
                max={simulado.totalQuestions}
                placeholder="Questão final"
                className="performance-field rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
              />

              <button
                type="submit"
                className="performance-primary-action rounded-2xl px-4 py-3 text-sm font-semibold text-white"
              >
                Adicionar bloco
              </button>
            </form>
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow="Blocos"
              title="Blocos cadastrados"
              description="Mapa de disciplinas usado nas análises do simulado."
            />

            <div className="grid gap-3 md:grid-cols-2">
              {simulado.blocks.map((block) => (
                <div
                  key={block.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Layers3 size={18} className="text-red-600" />
                      <h3 className="font-semibold text-zinc-900">
                        {block.subject}
                      </h3>
                    </div>

                    <Badge tone="neutral">
                      {block.startQuestion} → {block.endQuestion}
                    </Badge>
                  </div>
                </div>
              ))}

              {simulado.blocks.length === 0 && (
                <p className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-4 text-sm text-zinc-500">
                  Nenhum bloco cadastrado ainda.
                </p>
              )}
            </div>
          </Panel>

          <Panel id="gabarito">
            <SectionHeader
              eyebrow="Gabarito"
              title="Gabarito oficial"
              description="Configure as alternativas corretas ou anule questões quando necessário."
            />

            <div className="grid gap-3">
              <AnswerKeyEditor
                examId={simulado.id}
                totalQuestions={simulado.totalQuestions}
                initialAnswerKey={simulado.answerKey.map((item) => ({
                  question: item.question,
                  answer: item.answer,
                  canceled: item.canceled,
                }))}
              />
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel id="aplicacoes" className="xl:sticky xl:top-24">
            <SectionHeader
              eyebrow="Gabaritos físicos"
              title="Gerar folhas por turma"
              description="Cria uma aplicação do simulado na turma e prepara uma folha para cada aluno. Depois, baixe as folhas e importe o PDF preenchido para correção automática."
            />

            <AnswerSheetGeneratorForm
              examId={simulado.id}
              classRooms={classRoomOptions}
            />
          </Panel>

          <Panel id="digitalizacao">
            <SectionHeader
              eyebrow="Digitalização"
              title="Importar folhas preenchidas"
              description="Selecione o PDF preenchido. A identificação dos alunos, a leitura das marcações e o cadastro das respostas acontecem automaticamente."
            />

            <div className="space-y-3">
              {simulado.applications.map((application) => (
                <div
                  key={application.id}
                  className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">
                      {application.classRoom.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {application.classRoom.grade}º ano
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold text-red-600">
                      {application._count.answerSheets}
                    </p>
                    <p className="text-xs text-zinc-500">folhas</p>
                  </div>

                  {application._count.answerSheets > 0 && (
                    <Link
                      href={`/simulados/${simulado.id}/gabaritos/${application.id}/pdf`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:col-span-2"
                    >
                      <Download size={15} />
                      Baixar PDF
                    </Link>
                  )}

                  <div className="grid gap-3 border-t border-zinc-200 pt-3 sm:col-span-2">
                    <AnswerSheetScanImportForm
                      examId={simulado.id}
                      examApplicationId={application.id}
                    />

                    {application.scanBatches.length > 0 && (
                      <div className="space-y-2">
                        {application.scanBatches.map((batch) => {
                          const detectedAnswerTotal = batch.scans.reduce(
                            (sum, scan) => sum + scan._count.answers,
                            0
                          );
                          const hasOccurrences =
                            batch.reviewRequiredPages > 0 ||
                            batch.status === "REVIEW_REQUIRED" ||
                            batch.status === "FAILED";
                          const isCompleted =
                            batch.status === "CONFIRMED" ||
                            batch.status === "READY_FOR_CONFIRMATION";

                          return (
                            <div
                              key={batch.id}
                              className="grid gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-xs text-zinc-600"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-semibold text-zinc-900">
                                  {dateFormatter.format(batch.createdAt)}
                                </span>
                                <Badge tone={isCompleted ? "success" : "neutral"}>
                                  {scanBatchStatusLabels[batch.status]}
                                </Badge>
                              </div>

                              <p className="truncate font-medium text-zinc-800">
                                {batch.sourceFileName}
                              </p>

                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <div className="rounded-lg bg-zinc-50 px-2.5 py-2">
                                  <p className="text-sm font-semibold text-zinc-900">
                                    {batch.totalPages}
                                  </p>
                                  <p className="text-[11px] text-zinc-500">folhas</p>
                                </div>
                                <div className="rounded-lg bg-zinc-50 px-2.5 py-2">
                                  <p className="text-sm font-semibold text-zinc-900">
                                    {batch.identifiedPages}
                                  </p>
                                  <p className="text-[11px] text-zinc-500">identificadas</p>
                                </div>
                                <div className="rounded-lg bg-zinc-50 px-2.5 py-2">
                                  <p className="text-sm font-semibold text-zinc-900">
                                    {batch.processedPages}
                                  </p>
                                  <p className="text-[11px] text-zinc-500">processadas</p>
                                </div>
                                <div className="rounded-lg bg-zinc-50 px-2.5 py-2">
                                  <p className="text-sm font-semibold text-zinc-900">
                                    {detectedAnswerTotal}
                                  </p>
                                  <p className="text-[11px] text-zinc-500">respostas</p>
                                </div>
                              </div>

                              {hasOccurrences && (
                                <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-600">
                                  {batch.reviewRequiredPages} ocorrência(s) de processamento.
                                </p>
                              )}

                              <div className="grid gap-2 sm:grid-cols-2">
                                {hasOccurrences && (
                                  <Link
                                    href={`/simulados/${simulado.id}/leituras/lotes/${batch.id}`}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                  >
                                    Ver ocorrências
                                    <ArrowRight size={14} />
                                  </Link>
                                )}

                                <Link
                                  href={`/simulados/${simulado.id}/resultados`}
                                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                >
                                  Ver resultados
                                  <ArrowRight size={14} />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {simulado.applications.length === 0 && (
                <p className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-4 text-sm text-zinc-500">
                  Nenhuma turma preparada ainda.
                </p>
              )}
            </div>
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow="Turmas elegíveis"
              title={`Compatíveis com ${simulado.grade}º ano`}
              description="A validação também acontece no servidor para evitar aplicação em série incorreta."
            />

            <div className="space-y-3">
              {classRoomOptions.map((classRoom) => (
                <div
                  key={classRoom.id}
                  className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">
                      {classRoom.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {classRoom.studentsCount} aluno(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-red-600">
                    <FileCheck2 size={17} />
                    <span className="text-sm font-semibold">
                      {classRoom.existingSheets}
                    </span>
                  </div>
                </div>
              ))}

              {classRoomOptions.length === 0 && (
                <p className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-4 text-sm text-zinc-500">
                  Nenhuma turma da mesma série encontrada.
                </p>
              )}
            </div>
          </Panel>
        </aside>
      </div>
    </AppLayout>
  );
}