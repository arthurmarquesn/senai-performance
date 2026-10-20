
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  FileDown,
  FileText,
  GraduationCap,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { AppLayout } from "@/components/AppLayout";
import { StudentCharts } from "@/components/StudentCharts";
import { EssayStudentCharts } from "@/components/redacoes/EssayStudentCharts";

type HistoricoItem = {
  examId: string;
  examTitle: string;
  acertos: number;
  totalValido: number;
  porcentagem: number;
};

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

const subjectAreaMap: Record<string, string> = {
  MATEMATICA: "Exatas",
  FISICA: "Naturezas",
  QUIMICA: "Naturezas",
  BIOLOGIA: "Naturezas",
  PORTUGUES: "Linguagens",
  INGLES: "Linguagens",
  ARTES: "Linguagens",
  EDUCACAO_FISICA: "Linguagens",
  SOCIOLOGIA: "Humanas",
  FILOSOFIA: "Humanas",
  GEOGRAFIA: "Humanas",
  HISTORIA: "Humanas",
};

function getAnswerByQuestion(
  answers: any[],
  question: number
) {
  return answers.find(
    (answer: any) => answer.question === question
  );
}

function calculateResultPercentage(result: any) {
  let acertos = 0;
  let totalValido = 0;

  for (const gabarito of result.exam.answerKey) {
    if (gabarito.canceled) continue;

    totalValido++;

    const respostaAluno = getAnswerByQuestion(
      result.answers,
      gabarito.question
    );

    if (respostaAluno?.answer === gabarito.answer) {
      acertos++;
    }
  }

  const porcentagem =
    totalValido > 0
      ? Math.round((acertos / totalValido) * 100)
      : 0;

  return {
    acertos,
    totalValido,
    porcentagem,
  };
}

function calculateEssayCompetencyAverage(
  items: any[],
  key: string
) {
  if (items.length === 0) return 0;

  return Math.round(
    items.reduce(
      (acc, item) => acc + Number(item[key] ?? 0),
      0
    ) / items.length
  );
}

export default async function AlunoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const aluno = await prisma.student.findUnique({
    where: { id },
    include: {
      classRoom: {
        include: {
          students: {
            include: {
              results: {
                include: {
                  exam: {
                    include: {
                      answerKey: true,
                      blocks: true,
                    },
                  },
                  answers: true,
                },
              },
            },
          },
        },
      },
      results: {
        include: {
          exam: {
            include: {
              answerKey: true,
              blocks: true,
            },
          },
          answers: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      essayCorrections: {
        include: {
          exam: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!aluno) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-[1440px] py-10">
          <h1 className="text-2xl font-bold text-slate-900">
            Aluno não encontrado
          </h1>

          <Link
            href="/alunos"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#EA580C]"
          >
            Voltar para alunos
            <ArrowRight size={16} />
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Histórico de simulados
  const historico: HistoricoItem[] = aluno.results.map(
    (result: any) => {
      const calculated =
        calculateResultPercentage(result);

      return {
        examId: result.exam.id,
        examTitle: result.exam.title,
        acertos: calculated.acertos,
        totalValido: calculated.totalValido,
        porcentagem: calculated.porcentagem,
      };
    }
  );

  const mediaGeral =
    historico.length > 0
      ? Math.round(
          historico.reduce(
            (acc, item) => acc + item.porcentagem,
            0
          ) / historico.length
        )
      : 0;

  const melhorDesempenho =
    historico.length > 0
      ? Math.max(
          ...historico.map((item) => item.porcentagem)
        )
      : 0;

  const evolutionData = historico.map((item) => ({
    simulado: item.examTitle,
    desempenho: item.porcentagem,
  }));

  // Desempenho do aluno por área
  const alunoAreaMap: Record<
    string,
    { acertos: number; total: number }
  > = {
    Humanas: { acertos: 0, total: 0 },
    Linguagens: { acertos: 0, total: 0 },
    Exatas: { acertos: 0, total: 0 },
    Naturezas: { acertos: 0, total: 0 },
  };

  aluno.results.forEach((result: any) => {
    result.exam.blocks.forEach((block: any) => {
      const area = subjectAreaMap[block.subject];

      if (!area) return;

      for (
        let question = block.startQuestion;
        question <= block.endQuestion;
        question++
      ) {
        const gabarito = result.exam.answerKey.find(
          (item: any) => item.question === question
        );

        if (!gabarito || gabarito.canceled) continue;

        alunoAreaMap[area].total++;

        const respostaAluno = getAnswerByQuestion(
          result.answers,
          question
        );

        if (respostaAluno?.answer === gabarito.answer) {
          alunoAreaMap[area].acertos++;
        }
      }
    });
  });

  // Desempenho da turma por área
  const turmaAreaMap: Record<
    string,
    { acertos: number; total: number }
  > = {
    Humanas: { acertos: 0, total: 0 },
    Linguagens: { acertos: 0, total: 0 },
    Exatas: { acertos: 0, total: 0 },
    Naturezas: { acertos: 0, total: 0 },
  };

  aluno.classRoom.students.forEach((student: any) => {
    student.results.forEach((result: any) => {
      result.exam.blocks.forEach((block: any) => {
        const area = subjectAreaMap[block.subject];

        if (!area) return;

        for (
          let question = block.startQuestion;
          question <= block.endQuestion;
          question++
        ) {
          const gabarito = result.exam.answerKey.find(
            (item: any) => item.question === question
          );

          if (!gabarito || gabarito.canceled) continue;

          turmaAreaMap[area].total++;

          const respostaAluno = getAnswerByQuestion(
            result.answers,
            question
          );

          if (respostaAluno?.answer === gabarito.answer) {
            turmaAreaMap[area].acertos++;
          }
        }
      });
    });
  });

  const areaComparisonData = [
    "Humanas",
    "Linguagens",
    "Exatas",
    "Naturezas",
  ].map((area) => {
    const alunoData = alunoAreaMap[area];
    const turmaData = turmaAreaMap[area];

    return {
      area,
      aluno:
        alunoData.total > 0
          ? Math.round(
              (alunoData.acertos / alunoData.total) * 100
            )
          : 0,
      turma:
        turmaData.total > 0
          ? Math.round(
              (turmaData.acertos / turmaData.total) * 100
            )
          : 0,
    };
  });

  // Resultados por disciplina
  const disciplineByExamData = aluno.results.map(
    (result: any) => {
      const disciplinasMap: Record<
        string,
        { acertos: number; total: number }
      > = {};

      result.exam.blocks.forEach((block: any) => {
        const label =
          subjectLabels[block.subject] ?? block.subject;

        if (!disciplinasMap[label]) {
          disciplinasMap[label] = {
            acertos: 0,
            total: 0,
          };
        }

        for (
          let question = block.startQuestion;
          question <= block.endQuestion;
          question++
        ) {
          const gabarito = result.exam.answerKey.find(
            (item: any) => item.question === question
          );

          if (!gabarito || gabarito.canceled) continue;

          disciplinasMap[label].total++;

          const respostaAluno = getAnswerByQuestion(
            result.answers,
            question
          );

          if (respostaAluno?.answer === gabarito.answer) {
            disciplinasMap[label].acertos++;
          }
        }
      });

      return {
        examId: result.exam.id,
        examTitle: result.exam.title,
        disciplinas: Object.entries(disciplinasMap).map(
          ([disciplina, data]) => ({
            disciplina,
            acertos: data.acertos,
            total: data.total,
            porcentagem:
              data.total > 0
                ? Math.round(
                    (data.acertos / data.total) * 100
                  )
                : 0,
          })
        ),
      };
    }
  );

  // Redações
  const essayCorrections = aluno.essayCorrections;

  const essayCompetencyData = [
    {
      competency: "C1",
      score: calculateEssayCompetencyAverage(
        essayCorrections,
        "competency1"
      ),
    },
    {
      competency: "C2",
      score: calculateEssayCompetencyAverage(
        essayCorrections,
        "competency2"
      ),
    },
    {
      competency: "C3",
      score: calculateEssayCompetencyAverage(
        essayCorrections,
        "competency3"
      ),
    },
    {
      competency: "C4",
      score: calculateEssayCompetencyAverage(
        essayCorrections,
        "competency4"
      ),
    },
    {
      competency: "C5",
      score: calculateEssayCompetencyAverage(
        essayCorrections,
        "competency5"
      ),
    },
  ];

  const essayEvolutionData = essayCorrections
    .slice()
    .reverse()
    .map((item, index) => ({
      label: item.exam
        ? item.exam.title
        : `Redação ${index + 1}`,
      totalScore: item.totalScore,
    }));

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] pb-12">
        {/* Navegação */}
        <div className="mb-6">
          <AppBreadcrumb
            items={[
              {
                label: "Alunos",
                href: "/alunos",
              },
              {
                label: aluno.name,
              },
            ]}
          />
        </div>

        {/* Identificação do aluno */}
        <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-[#EA580C] sm:h-16 sm:w-16">
              <GraduationCap size={30} strokeWidth={1.8} />
            </div>

            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {aluno.name}
                <span className="text-[#F97316]">.</span>
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {aluno.classRoom.name}
                <span className="mx-2 text-slate-300">•</span>
                Nº {aluno.number ?? "—"}
              </p>
            </div>
          </div>

          <Link
            href={`/alunos/${aluno.id}/relatorio`}
            className="inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-xl bg-[#F97316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
          >
            <FileDown size={18} />
            Gerar relatório PDF
          </Link>
        </header>

        {/* Indicadores */}
        <section className="mb-9 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          <MetricCard
            title="Média geral"
            value={`${mediaGeral}%`}
            icon={<BarChart3 size={20} />}
            featured
          />

          <MetricCard
            title="Simulados feitos"
            value={String(historico.length)}
            icon={<BookOpen size={20} />}
          />

          <MetricCard
            title="Melhor desempenho"
            value={`${melhorDesempenho}%`}
            icon={<Trophy size={20} />}
          />

          <MetricCard
            title="Turma"
            value={aluno.classRoom.name}
            icon={<GraduationCap size={20} />}
            compact
          />
        </section>

        {/* Gráficos de desempenho */}
        <section className="mb-9">
          <SectionTitle
            title="Análise de desempenho"
            subtitle="Evolução e comparação acadêmica"
            icon={<TrendingUp size={20} />}
          />

          <div className="mt-5 min-w-0">
            <StudentCharts
              areaComparisonData={areaComparisonData}
              evolutionData={evolutionData}
              disciplineByExamData={disciplineByExamData}
            />
          </div>
        </section>

        {/* Redações */}
        <section className="mb-9">
          <SectionTitle
            title="Redações"
            subtitle="Desempenho nas competências do ENEM"
            icon={<FileText size={20} />}
            detail={`${essayCorrections.length} correções`}
          />

          <div className="mt-5">
            {essayCorrections.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                <FileText
                  size={30}
                  className="mx-auto text-slate-300"
                />
                <p className="mt-3 text-sm text-slate-500">
                  Nenhuma redação corrigida para este aluno.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Gráficos ENEM preservados */}
                <EssayStudentCharts
                  competencyData={essayCompetencyData}
                  evolutionData={essayEvolutionData}
                />

                {/* Lista de redações */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                    <h3 className="text-base font-bold text-slate-900">
                      Histórico de correções
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {essayCorrections.map((redacao) => {
                      const competencias = [
                        redacao.competency1,
                        redacao.competency2,
                        redacao.competency3,
                        redacao.competency4,
                        redacao.competency5,
                      ];

                      return (
                        <article
                          key={redacao.id}
                          className="px-5 py-6 sm:px-6"
                        >
                          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-slate-900">
                                {redacao.exam
                                  ? redacao.exam.title
                                  : "Redação avulsa"}
                              </h4>

                              <p className="mt-1 text-sm text-slate-500">
                                {redacao.exam
                                  ? `${redacao.exam.grade}º ano`
                                  : "Sem simulado vinculado"}
                              </p>
                            </div>

                            <div className="sm:text-right">
                              <p className="text-3xl font-bold tracking-tight tabular-nums text-[#EA580C]">
                                {redacao.totalScore}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                Nota ENEM
                              </p>
                            </div>
                          </div>

                          {/* Competências */}
                          <div className="mt-5 grid grid-cols-5 gap-2 sm:gap-3">
                            {competencias.map((nota, index) => (
                              <div
                                key={index}
                                className="min-w-0 rounded-xl bg-slate-50 px-2 py-3 text-center sm:px-4"
                              >
                                <p className="text-xs font-medium text-slate-500">
                                  C{index + 1}
                                </p>

                                <p className="mt-1 text-base font-bold tabular-nums text-slate-900 sm:text-xl">
                                  {nota}
                                </p>
                              </div>
                            ))}
                          </div>

                          {redacao.comment && (
                            <div className="mt-5 border-l-2 border-[#F97316] bg-orange-50/50 px-4 py-3">
                              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                {redacao.comment}
                              </p>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Histórico de simulados */}
        <section>
          <SectionTitle
            title="Histórico de simulados"
            subtitle="Resultados das avaliações realizadas"
            icon={<BookOpen size={20} />}
          />

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {historico.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                O aluno ainda não possui simulados respondidos.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {historico.map((item) => (
                  <div
                    key={item.examId}
                    className="flex flex-col justify-between gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6"
                  >
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900">
                        {item.examTitle}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {item.acertos} de {item.totalValido} acertos
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-5 sm:justify-end">
                      <span className="text-xl font-bold tabular-nums text-[#EA580C]">
                        {item.porcentagem}%
                      </span>

                      <Link
                        href={`/simulados/${item.examId}/resultados`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C]"
                      >
                        Ver simulado
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

// Indicadores superiores
function MetricCard({
  title,
  value,
  icon,
  featured = false,
  compact = false,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  featured?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative flex min-h-[145px] flex-col justify-between overflow-hidden rounded-2xl p-5 transition-shadow hover:shadow-md sm:p-6 ${
        featured
          ? "bg-gradient-to-br from-[#FB923C] to-[#EA580C] text-white shadow-sm"
          : "border border-slate-200 bg-white text-slate-900 shadow-sm"
      }`}
    >
      {featured && (
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border-[20px] border-white/10" />
      )}

      <div className="relative flex items-center justify-between gap-2">
        <p
          className={`text-sm font-medium ${
            featured ? "text-white/90" : "text-slate-500"
          }`}
        >
          {title}
        </p>

        <div
          className={
            featured
              ? "text-white/85"
              : "text-[#F97316]"
          }
        >
          {icon}
        </div>
      </div>

      <p
        className={`relative mt-5 break-words font-bold tracking-tight ${
          compact
            ? "text-xl sm:text-2xl"
            : "text-3xl sm:text-4xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// Títulos das seções
function SectionTitle({
  title,
  subtitle,
  icon,
  detail,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  detail?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
          {icon}
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {detail && (
        <span className="text-sm font-medium text-slate-500">
          {detail}
        </span>
      )}
    </div>
  );
}
