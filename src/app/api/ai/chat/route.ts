import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function getAnswerByQuestion(answers: any[], question: number) {
  return answers.find((answer: any) => answer.question === question);
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

  return totalValido > 0 ? Math.round((acertos / totalValido) * 100) : 0;
}

function getCompetencyAverage(items: any[], key: string) {
  if (items.length === 0) return 0;

  return Math.round(
    items.reduce((acc, item) => acc + Number(item[key] ?? 0), 0) / items.length
  );
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY não configurada." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const question = String(body.question || "").trim();

    if (!question) {
      return NextResponse.json(
        { error: "Digite uma pergunta." },
        { status: 400 }
      );
    }

    const totalTurmas = await prisma.classRoom.count();
    const totalAlunos = await prisma.student.count();
    const totalSimulados = await prisma.exam.count();
    const totalRedacoes = await prisma.essayCorrection.count();

    const turmas = await prisma.classRoom.findMany({
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
            essayCorrections: true,
          },
        },
      },
      orderBy: {
        grade: "asc",
      },
    });

    const simulados = await prisma.exam.findMany({
      include: {
        blocks: true,
        answerKey: true,
        results: {
          include: {
            student: {
              include: {
                classRoom: true,
              },
            },
            answers: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    const redacoes = await prisma.essayCorrection.findMany({
      include: {
        student: {
          include: {
            classRoom: true,
          },
        },
        exam: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const resumoTurmas = turmas.map((turma) => {
      const porcentagens = turma.students.flatMap((student) =>
        student.results.map((result) => calculateResultPercentage(result))
      );

      const mediaSimulados =
        porcentagens.length > 0
          ? Math.round(
              porcentagens.reduce((acc, item) => acc + item, 0) /
                porcentagens.length
            )
          : 0;

      const notasRedacao = turma.students.flatMap((student) =>
        student.essayCorrections.map((item) => item.totalScore)
      );

      const mediaRedacao =
        notasRedacao.length > 0
          ? Math.round(
              notasRedacao.reduce((acc, item) => acc + item, 0) /
                notasRedacao.length
            )
          : 0;

      return {
        turma: turma.name,
        serie: turma.grade,
        totalAlunos: turma.students.length,
        mediaSimulados,
        mediaRedacao,
      };
    });

    const resumoSimulados = simulados.map((simulado) => {
      const resultados = simulado.results.map((result) => ({
        aluno: result.student.name,
        turma: result.student.classRoom.name,
        desempenho: calculateResultPercentage({
          ...result,
          exam: simulado,
        }),
      }));

      const respondidos = resultados.length;

      const media =
        resultados.length > 0
          ? Math.round(
              resultados.reduce((acc, item) => acc + item.desempenho, 0) /
                resultados.length
            )
          : 0;

      const melhores = [...resultados]
        .sort((a, b) => b.desempenho - a.desempenho)
        .slice(0, 5);

      const criticos = resultados
        .filter((item) => item.desempenho < 50)
        .sort((a, b) => a.desempenho - b.desempenho)
        .slice(0, 10);

      const questionStats = simulado.answerKey
        .filter((item) => !item.canceled)
        .map((gabarito) => {
          let acertos = 0;
          let erros = 0;
          let semResposta = 0;

          for (const result of simulado.results) {
            const resposta = getAnswerByQuestion(
              result.answers,
              gabarito.question
            );

            if (!resposta?.answer) {
              semResposta++;
            } else if (resposta.answer === gabarito.answer) {
              acertos++;
            } else {
              erros++;
            }
          }

          const total = simulado.results.length;
          const taxaAcerto =
            total > 0 ? Math.round((acertos / total) * 100) : 0;

          return {
            questao: gabarito.question,
            gabarito: gabarito.answer,
            acertos,
            erros,
            semResposta,
            taxaAcerto,
          };
        });

      const questoesMaisErradas = [...questionStats]
        .sort((a, b) => b.erros - a.erros)
        .slice(0, 5);

      const questoesMaisAcertadas = [...questionStats]
        .sort((a, b) => b.acertos - a.acertos)
        .slice(0, 5);

      return {
        titulo: simulado.title,
        serie: simulado.grade,
        totalQuestoes: simulado.totalQuestions,
        questoesValidas: simulado.answerKey.filter((item) => !item.canceled)
          .length,
        respondidos,
        media,
        melhores,
        criticos,
        questoesMaisErradas,
        questoesMaisAcertadas,
      };
    });

    const resumoRedacoes = {
      total: redacoes.length,
      mediaGeral:
        redacoes.length > 0
          ? Math.round(
              redacoes.reduce((acc, item) => acc + item.totalScore, 0) /
                redacoes.length
            )
          : 0,
      competencias: {
        c1: getCompetencyAverage(redacoes, "competency1"),
        c2: getCompetencyAverage(redacoes, "competency2"),
        c3: getCompetencyAverage(redacoes, "competency3"),
        c4: getCompetencyAverage(redacoes, "competency4"),
        c5: getCompetencyAverage(redacoes, "competency5"),
      },
      abaixoDe600: redacoes
        .filter((item) => item.totalScore < 600)
        .slice(0, 15)
        .map((item) => ({
          aluno: item.student.name,
          turma: item.student.classRoom.name,
          nota: item.totalScore,
          simulado: item.exam?.title ?? "Redação avulsa",
        })),
    };

    const contexto = {
      usuario: {
        nome: user.name,
        papel: user.role,
      },
      totais: {
        turmas: totalTurmas,
        alunos: totalAlunos,
        simulados: totalSimulados,
        redacoes: totalRedacoes,
      },
      turmas: resumoTurmas,
      simuladosRecentes: resumoSimulados,
      redacoes: resumoRedacoes,
    };

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `
Você é um assistente pedagógico de uma plataforma escolar.

REGRAS OBRIGATÓRIAS:
- Responda sempre em português do Brasil.
- Use apenas os dados fornecidos no contexto.
- Nunca invente números, nomes, médias, rankings ou conclusões.
- Se não houver alunos respondentes, diga claramente: "Ainda não há respostas suficientes para análise de desempenho."
- Não diga que média 0 significa baixo desempenho se não houver respostas.
- Quando houver poucos dados, sinalize limitação da análise.
- Seja direto, profissional e útil para professores e coordenação.
- Formate a resposta em Markdown limpo.
- Use títulos, listas e destaques com moderação.
- Evite textos longos demais.
- Sempre termine com uma seção "Próxima ação recomendada".

ESTRUTURA IDEAL:
## Resumo
Explique em 2 a 4 linhas.

## Dados relevantes
Liste os principais dados encontrados.

## Pontos de atenção
Liste problemas pedagógicos ou limitações dos dados.

## Próxima ação recomendada
Dê uma sugestão prática.
`.trim(),
        },
        {
          role: "user",
          content: `
Pergunta do usuário:
${question}

Contexto disponível em JSON:
${JSON.stringify(contexto, null, 2)}

Responda como se estivesse auxiliando um professor ou coordenador pedagógico.
Não trate ausência de respostas como baixo desempenho.
`.trim(),
        },
      ],
      temperature: 0.2,
      max_tokens: 900,
    });

    const answer =
      completion.choices[0]?.message?.content ||
      "Não foi possível gerar uma resposta.";

    return NextResponse.json({
      answer,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro ao processar a pergunta." },
      { status: 500 }
    );
  }
}