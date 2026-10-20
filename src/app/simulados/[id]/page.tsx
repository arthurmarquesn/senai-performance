
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileDown,
  FileText,
  GraduationCap,
  Layers3,
  ListChecks,
  Upload,
  UsersRound,
} from "lucide-react";

import { createBlock } from "./actions";
import { AnswerKeyEditor } from "@/components/AnswerKeyEditor";
import { AnswerSheetGeneratorForm } from "@/components/AnswerSheetGeneratorForm";
import { AnswerSheetScanImportForm } from "@/components/AnswerSheetScanImportForm";
import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { AppLayout } from "@/components/AppLayout";
import { prisma } from "@/lib/prisma";

const subjectLabels: Record<string, string> = {
  MATEMATICA: "Matemática",
  FISICA: "Física",
  QUIMICA: "Química",
  BIOLOGIA: "Biologia",
  PORTUGUES: "Português",
  INGLES: "Inglês",
  ARTES: "Artes",
  EDUCACAO_FISICA: "Educação Física",
  SOCIOLOGIA: "Sociologia",
  FILOSOFIA: "Filosofia",
  GEOGRAFIA: "Geografia",
  HISTORIA: "História",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function getImportStatus(status: string) {
  switch (status) {
    case "UPLOADED":
      return "Arquivo recebido";
    case "PROCESSING":
      return "Processando folhas";
    case "REVIEW_REQUIRED":
      return "Revisão necessária";
    case "READY_FOR_CONFIRMATION":
      return "Aguardando confirmação";
    case "CONFIRMED":
      return "Leitura confirmada";
    case "FAILED":
      return "Não foi possível processar";
    default:
      return "Verificar processamento";
  }
}

function getImportStatusClass(status: string) {
  if (status === "CONFIRMED") {
    return "text-emerald-700";
  }

  if (
    status === "FAILED" ||
    status === "REVIEW_REQUIRED"
  ) {
    return "text-amber-700";
  }

  return "text-slate-600";
}

export default async function SimuladoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const simulado = await prisma.exam.findUnique({
    where: { id },
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
        <div className="mx-auto max-w-[1100px] py-12">
          <h1 className="text-2xl font-bold text-slate-900">
            Simulado não encontrado
          </h1>

          <Link
            href="/simulados"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#EA580C]"
          >
            Voltar para simulados
            <ArrowRight size={16} />
          </Link>
        </div>
      </AppLayout>
    );
  }

  const compatibleClassRooms =
    await prisma.classRoom.findMany({
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

  const classRoomOptions = compatibleClassRooms.map(
    (classRoom) => ({
      id: classRoom.id,
      name: classRoom.name,
      grade: classRoom.grade,
      studentsCount: classRoom._count.students,
      existingSheets:
        classRoom.examApplications[0]?._count.answerSheets ??
        0,
    })
  );

  const totalSheets = simulado.applications.reduce(
    (acc, application) =>
      acc + application._count.answerSheets,
    0
  );

  const totalBlocos = simulado.blocks.length;
  const totalGabaritos = simulado.answerKey.length;

  const totalImportacoes = simulado.applications.reduce(
    (acc, application) =>
      acc + application.scanBatches.length,
    0
  );

  const questoesDistribuidas = new Set<number>();

  simulado.blocks.forEach((block) => {
    for (
      let question = block.startQuestion;
      question <= block.endQuestion;
      question++
    ) {
      if (
        question >= 1 &&
        question <= simulado.totalQuestions
      ) {
        questoesDistribuidas.add(question);
      }
    }
  });

  const gabaritoCompleto =
    Array.from(
      { length: simulado.totalQuestions },
      (_, index) => index + 1
    ).every((question) =>
      simulado.answerKey.some(
        (item) =>
          item.question === question &&
          (item.canceled ||
            (typeof item.answer === "string" &&
              item.answer.trim().length > 0))
      )
    );

  const disciplinasCompletas =
    questoesDistribuidas.size ===
    simulado.totalQuestions;

  const intervalosSobrepostos =
    simulado.blocks.some((block, index) =>
      simulado.blocks.some(
        (other, otherIndex) =>
          index !== otherIndex &&
          block.startQuestion <= other.endQuestion &&
          other.startQuestion <= block.endQuestion
      )
    );

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1100px] pb-16">
        {/* Navegação */}
        <div className="mb-6">
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
        </div>

        {/* Cabeçalho */}
        <header className="mb-8">
          <div className="mb-3 h-1 w-10 rounded-full bg-[#F97316]" />

          <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {simulado.title}
            <span className="text-[#F97316]">.</span>
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>{simulado.grade}º ano</span>
            <span className="text-slate-300">•</span>
            <span>{simulado.totalQuestions} questões</span>
          </div>

          {/* Ações principais */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/simulados/${simulado.id}/resultados`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F97316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
            >
              <ClipboardCheck size={18} />
              Ver resultados
            </Link>

            <Link
              href={`/simulados/${simulado.id}/respostas`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C]"
            >
              <ListChecks size={18} />
              Lançar respostas
            </Link>

            <Link
              href={`/simulados/${simulado.id}/ranking`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C]"
            >
              Ranking
              <ArrowRight size={17} />
            </Link>
          </div>
        </header>

        {/* Resumo */}
        <section className="mb-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryMetric
            label="Disciplinas"
            value={totalBlocos}
            icon={<Layers3 size={19} />}
            featured
          />

          <SummaryMetric
            label="Gabarito"
            value={`${totalGabaritos}/${simulado.totalQuestions}`}
            icon={<ListChecks size={19} />}
          />

          <SummaryMetric
            label="Folhas geradas"
            value={totalSheets}
            icon={<FileText size={19} />}
          />

          <SummaryMetric
            label="Importações"
            value={totalImportacoes}
            icon={<Upload size={19} />}
          />
        </section>

        {/* Orientações somente quando necessárias */}
        {(!disciplinasCompletas ||
          !gabaritoCompleto ||
          intervalosSobrepostos) && (
          <section className="mb-8 rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
            <h2 className="text-sm font-bold text-[#9A3412]">
              Antes de aplicar o simulado
            </h2>

            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {!disciplinasCompletas && (
                <p>
                  • Distribua todas as questões entre as
                  disciplinas.
                </p>
              )}

              {intervalosSobrepostos && (
                <p>
                  • Verifique os intervalos de questões:
                  há disciplinas com números sobrepostos.
                </p>
              )}

              {!gabaritoCompleto && (
                <p>
                  • Preencha ou anule as questões restantes
                  do gabarito.
                </p>
              )}
            </div>
          </section>
        )}

        <div className="space-y-6">
          {/* Etapa 1 */}
          <section
            id="disciplinas"
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <StepHeader
              number={1}
              title="Disciplinas e questões"
              description="Organize as questões por disciplina."
              complete={
                disciplinasCompletas &&
                !intervalosSobrepostos
              }
            />

            <div className="space-y-6 p-5 sm:p-6">
              {/* Disciplinas cadastradas */}
              {simulado.blocks.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {simulado.blocks.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <BookOpen
                          size={18}
                          className="shrink-0 text-[#EA580C]"
                        />

                        <p className="truncate text-sm font-semibold text-slate-900">
                          {subjectLabels[block.subject] ??
                            block.subject}
                        </p>
                      </div>

                      <p className="shrink-0 text-xs font-medium text-slate-500">
                        {block.startQuestion}–{block.endQuestion}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-900">
                    Adicionar disciplina
                  </h3>

                  <p className="text-xs text-slate-500">
                    {questoesDistribuidas.size} de{" "}
                    {simulado.totalQuestions} questões
                    distribuídas
                  </p>
                </div>

                <form
                  action={createBlock}
                  className="grid gap-3 md:grid-cols-[minmax(0,1fr)_130px_130px_auto] md:items-end"
                >
                  <input
                    type="hidden"
                    name="examId"
                    value={simulado.id}
                  />

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Disciplina
                    </span>

                    <select
                      name="subject"
                      required
                      defaultValue=""
                      className="h-12 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10"
                    >
                      <option value="" disabled>
                        Selecione
                      </option>

                      {Object.entries(subjectLabels).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Questão inicial
                    </span>

                    <input
                      name="startQuestion"
                      type="number"
                      min="1"
                      max={simulado.totalQuestions}
                      required
                      placeholder="Ex.: 1"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Questão final
                    </span>

                    <input
                      name="endQuestion"
                      type="number"
                      min="1"
                      max={simulado.totalQuestions}
                      required
                      placeholder="Ex.: 10"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10"
                    />
                  </label>

                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#F97316] px-5 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
                  >
                    <Layers3 size={17} />
                    Adicionar
                  </button>
                </form>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Exemplo: Matemática, questões 1 a 10.
                  Evite repetir questões entre disciplinas.
                </p>
              </div>
            </div>
          </section>

          {/* Etapa 2 */}
          <section
            id="gabarito"
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <StepHeader
              number={2}
              title="Gabarito oficial"
              description="Informe as respostas corretas ou anule questões."
              complete={gabaritoCompleto}
            />

            <div className="p-5 sm:p-6">
              <AnswerKeyEditor
                examId={simulado.id}
                totalQuestions={simulado.totalQuestions}
                initialAnswerKey={simulado.answerKey.map(
                  (item) => ({
                    question: item.question,
                    answer: item.answer,
                    canceled: item.canceled,
                  })
                )}
              />
            </div>
          </section>

          {/* Etapa 3 */}
          <section
            id="folhas"
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <StepHeader
              number={3}
              title="Preparar folhas de respostas"
              description="Selecione as turmas e gere as folhas dos alunos."
              complete={totalSheets > 0}
            />

            <div className="space-y-6 p-5 sm:p-6">
              {classRoomOptions.length === 0 ? (
                <div className="rounded-xl bg-slate-50 px-5 py-6 text-sm text-slate-600">
                  Não existem turmas cadastradas para
                  o {simulado.grade}º ano.
                  <Link
                    href="/turmas"
                    className="ml-1 font-semibold text-[#EA580C] hover:underline"
                  >
                    Ver turmas
                  </Link>
                </div>
              ) : (
                <>
                  <AnswerSheetGeneratorForm
                    examId={simulado.id}
                    classRooms={classRoomOptions}
                  />

                  {totalSheets > 0 && (
                    <div className="border-t border-slate-100 pt-5">
                      <h3 className="mb-4 text-sm font-semibold text-slate-900">
                        Folhas disponíveis
                      </h3>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {simulado.applications
                          .filter(
                            (application) =>
                              application._count.answerSheets > 0
                          )
                          .map((application) => (
                            <div
                              key={application.id}
                              className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {application.classRoom.name}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {
                                    application._count
                                      .answerSheets
                                  }{" "}
                                  folhas geradas
                                </p>
                              </div>

                              <Link
                                href={`/simulados/${simulado.id}/gabaritos/${application.id}/pdf`}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-orange-200 px-3 py-2 text-xs font-semibold text-[#EA580C] transition hover:bg-orange-50"
                              >
                                <Download size={15} />
                                Baixar PDF
                              </Link>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Etapa 4 */}
          <section
            id="correcao"
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <StepHeader
              number={4}
              title="Corrigir avaliações"
              description="Envie as folhas preenchidas para leitura automática."
            />

            <div className="space-y-6 p-5 sm:p-6">
              {simulado.applications.length === 0 ? (
                <div className="rounded-xl bg-slate-50 px-5 py-6 text-sm text-slate-600">
                  Primeiro, prepare as folhas de respostas
                  das turmas na etapa anterior.
                </div>
              ) : (
                simulado.applications.map((application) => (
                  <div
                    key={application.id}
                    className="overflow-hidden rounded-xl border border-slate-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-4 sm:px-5">
                      <div className="flex items-center gap-3">
                        <UsersRound
                          size={19}
                          className="text-[#EA580C]"
                        />

                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            {application.classRoom.name}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              application._count
                                .answerSheets
                            }{" "}
                            folhas preparadas
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5 p-4 sm:p-5">
                      {/* Importação existente */}
                      <AnswerSheetScanImportForm
                        examId={simulado.id}
                        examApplicationId={application.id}
                      />

                      {/* Histórico de importações */}
                      {application.scanBatches.length > 0 && (
                        <div className="border-t border-slate-100 pt-5">
                          <h4 className="mb-3 text-sm font-semibold text-slate-900">
                            Arquivos enviados
                          </h4>

                          <div className="space-y-3">
                            {application.scanBatches.map(
                              (batch) => {
                                const hasOccurrences =
                                  batch.reviewRequiredPages >
                                    0 ||
                                  batch.status ===
                                    "REVIEW_REQUIRED" ||
                                  batch.status === "FAILED";

                                const detectedAnswerTotal =
                                  batch.scans.reduce(
                                    (sum, scan) =>
                                      sum +
                                      scan._count.answers,
                                    0
                                  );

                                return (
                                  <div
                                    key={batch.id}
                                    className="rounded-xl border border-slate-200 bg-white p-4"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="break-all text-sm font-semibold text-slate-900">
                                          {batch.sourceFileName}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                          {dateFormatter.format(
                                            batch.createdAt
                                          )}
                                        </p>
                                      </div>

                                      <span
                                        className={`text-xs font-semibold ${getImportStatusClass(
                                          batch.status
                                        )}`}
                                      >
                                        {getImportStatus(
                                          batch.status
                                        )}
                                      </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                      <ImportMetric
                                        label="Folhas"
                                        value={batch.totalPages}
                                      />

                                      <ImportMetric
                                        label="Identificadas"
                                        value={
                                          batch.identifiedPages
                                        }
                                      />

                                      <ImportMetric
                                        label="Respostas lidas"
                                        value={
                                          detectedAnswerTotal
                                        }
                                      />
                                    </div>

                                    {hasOccurrences && (
                                      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                                        <p className="text-sm font-medium text-amber-900">
                                          {batch.status === "FAILED"
                                            ? "Não foi possível concluir a leitura deste arquivo."
                                            : "Algumas folhas precisam ser verificadas."}
                                        </p>

                                        {batch.reviewRequiredPages >
                                          0 && (
                                          <p className="mt-1 text-xs text-amber-800">
                                            {
                                              batch.reviewRequiredPages
                                            }{" "}
                                            folhas com ocorrências.
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    <div className="mt-4 flex flex-wrap gap-3">
                                      {hasOccurrences && (
                                        <Link
                                          href={`/simulados/${simulado.id}/leituras/lotes/${batch.id}`}
                                          className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#EA580C]"
                                        >
                                          Revisar leitura
                                          <ArrowRight
                                            size={14}
                                          />
                                        </Link>
                                      )}

                                      {batch.status ===
                                        "READY_FOR_CONFIRMATION" && (
                                        <Link
                                          href={`/simulados/${simulado.id}/leituras/lotes/${batch.id}`}
                                          className="inline-flex items-center gap-2 rounded-lg border border-orange-200 px-4 py-2.5 text-xs font-semibold text-[#EA580C] transition hover:bg-orange-50"
                                        >
                                          Conferir e confirmar
                                          <ArrowRight
                                            size={14}
                                          />
                                        </Link>
                                      )}

                                      <Link
                                        href={`/simulados/${simulado.id}/resultados`}
                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                      >
                                        Ver resultados
                                        <ArrowRight
                                          size={14}
                                        />
                                      </Link>
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Etapa 5 */}
          <section
            id="resultados"
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <StepHeader
              number={5}
              title="Resultados e desempenho"
              description="Consulte as avaliações e o desempenho dos estudantes."
            />

            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
              <Link
                href={`/simulados/${simulado.id}/resultados`}
                className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-5 transition hover:border-orange-200 hover:bg-orange-50/60"
              >
                <div className="flex items-center gap-3">
                  <ClipboardCheck
                    size={21}
                    className="text-[#EA580C]"
                  />

                  <span className="font-semibold text-slate-900">
                    Resultados
                  </span>
                </div>

                <ArrowRight
                  size={18}
                  className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#EA580C]"
                />
              </Link>

              <Link
                href={`/simulados/${simulado.id}/ranking`}
                className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-5 transition hover:border-orange-200 hover:bg-orange-50/60"
              >
                <div className="flex items-center gap-3">
                  <GraduationCap
                    size={21}
                    className="text-[#EA580C]"
                  />

                  <span className="font-semibold text-slate-900">
                    Ranking
                  </span>
                </div>

                <ArrowRight
                  size={18}
                  className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#EA580C]"
                />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function SummaryMetric({
  label,
  value,
  icon,
  featured = false,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[125px] flex-col justify-between rounded-2xl p-4 shadow-sm sm:p-5 ${
        featured
          ? "bg-[#F97316] text-white"
          : "border border-slate-200 bg-white text-slate-900"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={`text-xs font-medium sm:text-sm ${
            featured
              ? "text-white/90"
              : "text-slate-500"
          }`}
        >
          {label}
        </p>

        <span
          className={
            featured ? "text-white" : "text-[#EA580C]"
          }
        >
          {icon}
        </span>
      </div>

      <p className="mt-5 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function StepHeader({
  number,
  title,
  description,
  complete = false,
}: {
  number: number;
  title: string;
  description: string;
  complete?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-bold text-[#EA580C]">
        {number}
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      {complete && (
        <CheckCircle2
          size={21}
          className="mt-1 shrink-0 text-emerald-600"
          aria-label="Preenchimento completo"
        />
      )}
    </div>
  );
}

function ImportMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-3">
      <p className="text-lg font-bold tabular-nums text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {label}
      </p>
    </div>
  );
}
