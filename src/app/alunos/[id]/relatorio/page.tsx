import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/PrintButton";
import { ReportCharts } from "@/components/ReportCharts";
import { ReportEssayCharts } from "@/components/redacoes/ReportEssayCharts";

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

function getAnswerByQuestion(answers: any[], question: number) {
  return answers.find((answer: any) => answer.question === question);
}

export default async function RelatorioAlunoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const aluno = await prisma.student.findUnique({
    where: { id },
    include: {
      classRoom: true,
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
      <main className="p-8">
        <p>Aluno não encontrado.</p>
      </main>
    );
  }

  const turma = await prisma.classRoom.findUnique({
    where: {
      id: aluno.classRoomId,
    },
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
  });

  const historico = aluno.results.map((result: any) => {
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
      totalValido > 0 ? Math.round((acertos / totalValido) * 100) : 0;

    return {
      examId: result.exam.id,
      examTitle: result.exam.title,
      acertos,
      totalValido,
      porcentagem,
    };
  });

  const mediaGeral =
    historico.length > 0
      ? Math.round(
          historico.reduce((acc, item) => acc + item.porcentagem, 0) /
            historico.length
        )
      : 0;

  const melhorDesempenho =
    historico.length > 0
      ? Math.max(...historico.map((item) => item.porcentagem))
      : 0;

  const areaMap: Record<string, { acertos: number; total: number }> = {
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

        areaMap[area].total++;

        const respostaAluno = getAnswerByQuestion(result.answers, question);

        if (respostaAluno?.answer === gabarito.answer) {
          areaMap[area].acertos++;
        }
      }
    });
  });

  const turmaAreaMap: Record<string, { acertos: number; total: number }> = {
    Humanas: { acertos: 0, total: 0 },
    Linguagens: { acertos: 0, total: 0 },
    Exatas: { acertos: 0, total: 0 },
    Naturezas: { acertos: 0, total: 0 },
  };

  turma?.students.forEach((student: any) => {
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

          const respostaAluno = getAnswerByQuestion(result.answers, question);

          if (respostaAluno?.answer === gabarito.answer) {
            turmaAreaMap[area].acertos++;
          }
        }
      });
    });
  });

  const desempenhoAreas = Object.entries(areaMap).map(([area, data]) => ({
    area,
    acertos: data.acertos,
    total: data.total,
    porcentagem:
      data.total > 0 ? Math.round((data.acertos / data.total) * 100) : 0,
  }));

  const areaComparisonData = [
    "Humanas",
    "Linguagens",
    "Exatas",
    "Naturezas",
  ].map((area) => {
    const alunoData = areaMap[area];
    const turmaData = turmaAreaMap[area];

    return {
      area,
      aluno:
        alunoData.total > 0
          ? Math.round((alunoData.acertos / alunoData.total) * 100)
          : 0,
      turma:
        turmaData.total > 0
          ? Math.round((turmaData.acertos / turmaData.total) * 100)
          : 0,
    };
  });

  const evolutionData = historico.map((item) => ({
    simulado: item.examTitle,
    desempenho: item.porcentagem,
  }));

  const disciplineByExamData = aluno.results.map((result: any) => {
    const disciplinasMap: Record<string, { acertos: number; total: number }> =
      {};

    result.exam.blocks.forEach((block: any) => {
      const label = subjectLabels[block.subject] ?? block.subject;

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

        const respostaAluno = getAnswerByQuestion(result.answers, question);

        if (respostaAluno?.answer === gabarito.answer) {
          disciplinasMap[label].acertos++;
        }
      }
    });

    return {
      examId: result.exam.id,
      examTitle: result.exam.title,
      disciplinas: Object.entries(disciplinasMap).map(([disciplina, data]) => ({
        disciplina,
        acertos: data.acertos,
        total: data.total,
        porcentagem:
          data.total > 0 ? Math.round((data.acertos / data.total) * 100) : 0,
      })),
    };
  });

  const lastDisciplineData =
    disciplineByExamData.length > 0
      ? disciplineByExamData[disciplineByExamData.length - 1].disciplinas
      : [];

  const essayCorrections = aluno.essayCorrections;

  function calculateEssayAverage(key: string) {
    if (essayCorrections.length === 0) return 0;

    return Math.round(
      essayCorrections.reduce(
        (acc: number, item: any) => acc + Number(item[key] ?? 0),
        0
      ) / essayCorrections.length
    );
  }

  const essayCompetencyData = [
    {
      competency: "C1",
      score: calculateEssayAverage("competency1"),
    },
    {
      competency: "C2",
      score: calculateEssayAverage("competency2"),
    },
    {
      competency: "C3",
      score: calculateEssayAverage("competency3"),
    },
    {
      competency: "C4",
      score: calculateEssayAverage("competency4"),
    },
    {
      competency: "C5",
      score: calculateEssayAverage("competency5"),
    },
  ];

  const essayEvolutionData = essayCorrections
    .slice()
    .reverse()
    .map((item: any, index: number) => ({
      label: item.exam ? item.exam.title : `Redação ${index + 1}`,
      totalScore: item.totalScore,
    }));

  return (
    <main className="mx-auto min-h-screen max-w-[1000px] bg-white p-10 text-zinc-900 print:max-w-none print:p-6">
      <div className="mb-8 flex items-center justify-between print:hidden">
        <Link
          href={`/alunos/${aluno.id}`}
          className="text-sm font-medium text-red-600"
        >
          Voltar ao perfil
        </Link>

        <PrintButton />
      </div>

      <header className="mb-10 border-b border-zinc-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
          Relatório de desempenho escolar
        </p>

        <h1 className="mt-2 text-4xl font-bold">{aluno.name}</h1>

        <p className="mt-2 text-sm text-zinc-500">
          {aluno.classRoom.name} • Nº {aluno.number ?? "-"}
        </p>
      </header>

      <section className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500">Média geral</p>

          <p className="mt-2 text-3xl font-bold text-red-600">
            {mediaGeral}%
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500">Simulados realizados</p>

          <p className="mt-2 text-3xl font-bold">{historico.length}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500">Melhor desempenho</p>

          <p className="mt-2 text-3xl font-bold">{melhorDesempenho}%</p>
        </div>
      </section>

      <section className="mb-8">
        <ReportCharts
          areaComparisonData={areaComparisonData}
          evolutionData={evolutionData}
          disciplineData={lastDisciplineData}
        />
      </section>

      {essayCorrections.length > 0 && (
        <section className="mb-8">
          <ReportEssayCharts
            competencyData={essayCompetencyData}
            evolutionData={essayEvolutionData}
          />
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold">Desempenho por área</h2>

        <div className="grid grid-cols-2 gap-4">
          {desempenhoAreas.map((item) => (
            <div
              key={item.area}
              className="rounded-2xl border border-zinc-200 p-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{item.area}</h3>

                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  {item.porcentagem}%
                </span>
              </div>

              <p className="mt-2 text-sm text-zinc-500">
                {item.acertos}/{item.total} acertos
              </p>

              <div className="mt-3 h-2 rounded-full bg-zinc-100">
                <div
                  className="h-2 rounded-full bg-red-600"
                  style={{ width: `${item.porcentagem}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Histórico de simulados</h2>

        <div className="grid gap-3">
          {historico.map((item) => (
            <div
              key={item.examId}
              className="rounded-2xl border border-zinc-200 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{item.examTitle}</h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    {item.acertos}/{item.totalValido} acertos
                  </p>
                </div>

                <p className="text-2xl font-bold text-red-600">
                  {item.porcentagem}%
                </p>
              </div>
            </div>
          ))}

          {historico.length === 0 && (
            <p className="text-sm text-zinc-500">
              O aluno ainda não possui simulados respondidos.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}