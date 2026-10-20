import "server-only";

import type {
  Alternative,
  Subject,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type TeacherQuestionsFilters = {
  classRoomId?: string;
  examId?: string;
};

export type TeacherQuestionAnalysis = {
  examId: string;
  examTitle: string;

  question: number;

  correctAnswer: Alternative;

  correctAnswers: number;
  wrongAnswers: number;
  blankAnswers: number;
  totalAnswers: number;

  percentage: number;

  alternatives: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
  };
};

export type TeacherQuestionsData = {
  subject: Subject;

  totalQuestions: number;
  averagePercentage: number;

  easiestQuestion:
    | TeacherQuestionAnalysis
    | null;

  hardestQuestion:
    | TeacherQuestionAnalysis
    | null;

  classRooms: Array<{
    id: string;
    name: string;
    grade: number;
  }>;

  exams: Array<{
    id: string;
    title: string;
  }>;

  questions: TeacherQuestionAnalysis[];
};

function percentage(
  numerator: number,
  denominator: number,
) {
  if (denominator <= 0) {
    return 0;
  }

  return (
    Math.round(
      (numerator / denominator) *
        10000,
    ) / 100
  );
}

function getQuestionsFromBlocks(
  blocks: Array<{
    startQuestion: number;
    endQuestion: number;
  }>,
  totalQuestions: number,
) {
  const questions =
    new Set<number>();

  for (const block of blocks) {
    const start =
      Math.max(
        1,
        block.startQuestion,
      );

    const end =
      Math.min(
        totalQuestions,
        block.endQuestion,
      );

    for (
      let question = start;
      question <= end;
      question++
    ) {
      questions.add(question);
    }
  }

  return [...questions].sort(
    (left, right) =>
      left - right,
  );
}

function createAlternativeCounter() {
  return {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    E: 0,
  };
}

export async function getTeacherQuestions(
  teacherProfileId: string,
  filters: TeacherQuestionsFilters = {},
): Promise<TeacherQuestionsData> {
  /*
   * ============================================================
   * 1. PERFIL DO PROFESSOR
   * ============================================================
   *
   * Nunca recebemos a disciplina pela URL.
   * Ela sempre vem do TeacherProfile autenticado.
   */
  const teacherProfile =
    await prisma.teacherProfile.findUnique({
      where: {
        id: teacherProfileId,
      },

      select: {
        id: true,
        subject: true,
      },
    });

  if (!teacherProfile) {
    throw new Error(
      "Perfil pedagógico do professor não encontrado.",
    );
  }

  const subject =
    teacherProfile.subject;

  /*
   * ============================================================
   * 2. TODAS AS APLICAÇÕES COM A DISCIPLINA
   * ============================================================
   *
   * Precisamos de todas para alimentar os selects de turma
   * e simulado, mesmo quando algum filtro estiver ativo.
   */
  const allApplications =
    await prisma.examApplication.findMany({
      where: {
        exam: {
          blocks: {
            some: {
              subject,
            },
          },
        },
      },

      select: {
        id: true,
        examId: true,
        classRoomId: true,

        classRoom: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },

        exam: {
          select: {
            id: true,
            title: true,
            totalQuestions: true,

            blocks: {
              where: {
                subject,
              },

              select: {
                startQuestion: true,
                endQuestion: true,
              },

              orderBy: {
                startQuestion: "asc",
              },
            },

            answerKey: {
              select: {
                question: true,
                answer: true,
                canceled: true,
              },
            },
          },
        },
      },
    });

  /*
   * ============================================================
   * 3. OPÇÕES DOS FILTROS
   * ============================================================
   */
  const classRoomMap =
    new Map<
      string,
      {
        id: string;
        name: string;
        grade: number;
      }
    >();

  const examMap =
    new Map<
      string,
      {
        id: string;
        title: string;
      }
    >();

  for (
    const application of
    allApplications
  ) {
    classRoomMap.set(
      application.classRoom.id,
      application.classRoom,
    );

    examMap.set(
      application.exam.id,
      {
        id:
          application.exam.id,

        title:
          application.exam.title,
      },
    );
  }

  /*
   * ============================================================
   * 4. FILTROS ATIVOS
   * ============================================================
   */
  const applications =
    allApplications.filter(
      (application) => {
        if (
          filters.classRoomId &&
          application.classRoomId !==
            filters.classRoomId
        ) {
          return false;
        }

        if (
          filters.examId &&
          application.examId !==
            filters.examId
        ) {
          return false;
        }

        return true;
      },
    );

  if (
    applications.length === 0
  ) {
    return {
      subject,

      totalQuestions: 0,
      averagePercentage: 0,

      easiestQuestion: null,
      hardestQuestion: null,

      classRooms:
        [...classRoomMap.values()].sort(
          (left, right) =>
            left.name.localeCompare(
              right.name,
              "pt-BR",
            ),
        ),

      exams:
        [...examMap.values()].sort(
          (left, right) =>
            left.title.localeCompare(
              right.title,
              "pt-BR",
            ),
        ),

      questions: [],
    };
  }

  /*
   * ============================================================
   * 5. QUESTÕES VÁLIDAS DA DISCIPLINA
   * ============================================================
   *
   * Cada simulado possui sua configuração independente.
   *
   * Q12 do Simulado A e Q12 do Simulado B são tratadas como
   * duas questões diferentes.
   */
  const examConfigurations =
    new Map<
      string,
      {
        examId: string;
        examTitle: string;

        validQuestions: number[];

        answerKey: Map<
          number,
          Alternative
        >;
      }
    >();

  for (
    const application of
    applications
  ) {
    if (
      examConfigurations.has(
        application.exam.id,
      )
    ) {
      continue;
    }

    const subjectQuestions =
      getQuestionsFromBlocks(
        application.exam.blocks,
        application.exam.totalQuestions,
      );

    const answerKey =
      new Map(
        application.exam.answerKey.map(
          (item) => [
            item.question,
            item,
          ] as const,
        ),
      );

    /*
     * Questões anuladas não participam da análise.
     *
     * Também ignoramos qualquer questão sem gabarito oficial.
     */
    const validQuestions =
      subjectQuestions.filter(
        (question) => {
          const key =
            answerKey.get(question);

          return (
            key !== undefined &&
            !key.canceled
          );
        },
      );

    const validAnswerKey =
      new Map<
        number,
        Alternative
      >();

    for (
      const question of
      validQuestions
    ) {
      const key =
        answerKey.get(question);

      if (!key) {
        continue;
      }

      validAnswerKey.set(
        question,
        key.answer,
      );
    }

    examConfigurations.set(
      application.exam.id,
      {
        examId:
          application.exam.id,

        examTitle:
          application.exam.title,

        validQuestions,

        answerKey:
          validAnswerKey,
      },
    );
  }

  /*
   * ============================================================
   * 6. RESULTADOS DAS APLICAÇÕES SELECIONADAS
   * ============================================================
   */
  const scopes =
    applications.map(
      (application) => ({
        examId:
          application.examId,

        student: {
          classRoomId:
            application.classRoomId,
        },
      }),
    );

  const results =
    await prisma.examResult.findMany({
      where: {
        OR: scopes,
      },

      select: {
        examId: true,

        answers: {
          select: {
            question: true,
            answer: true,
          },
        },
      },
    });

  /*
   * ============================================================
   * 7. CRIA A ESTRUTURA DE TODAS AS QUESTÕES
   * ============================================================
   *
   * Criamos inclusive questões que ainda possuem zero respostas.
   */
  const aggregation =
    new Map<
      string,
      {
        examId: string;
        examTitle: string;

        question: number;

        correctAnswer: Alternative;

        correctAnswers: number;
        wrongAnswers: number;
        blankAnswers: number;
        totalAnswers: number;

        alternatives: {
          A: number;
          B: number;
          C: number;
          D: number;
          E: number;
        };
      }
    >();

  for (
    const configuration of
    examConfigurations.values()
  ) {
    for (
      const question of
      configuration.validQuestions
    ) {
      const correctAnswer =
        configuration.answerKey.get(
          question,
        );

      if (!correctAnswer) {
        continue;
      }

      aggregation.set(
        `${configuration.examId}:${question}`,
        {
          examId:
            configuration.examId,

          examTitle:
            configuration.examTitle,

          question,

          correctAnswer,

          correctAnswers: 0,
          wrongAnswers: 0,
          blankAnswers: 0,
          totalAnswers: 0,

          alternatives:
            createAlternativeCounter(),
        },
      );
    }
  }

  /*
   * ============================================================
   * 8. AGREGA AS RESPOSTAS
   * ============================================================
   */
  for (const result of results) {
    const configuration =
      examConfigurations.get(
        result.examId,
      );

    if (!configuration) {
      continue;
    }

    const answerByQuestion =
      new Map(
        result.answers.map(
          (answer) => [
            answer.question,
            answer.answer,
          ] as const,
        ),
      );

    for (
      const question of
      configuration.validQuestions
    ) {
      const key =
        `${result.examId}:${question}`;

      const item =
        aggregation.get(key);

      if (!item) {
        continue;
      }

      const studentAnswer =
        answerByQuestion.get(
          question,
        ) ?? null;

      /*
       * Toda questão válida conta no total,
       * inclusive quando o aluno deixou em branco.
       */
      item.totalAnswers++;

      if (
        studentAnswer === null
      ) {
        item.blankAnswers++;

        continue;
      }

      item.alternatives[
        studentAnswer
      ]++;

      if (
        studentAnswer ===
        item.correctAnswer
      ) {
        item.correctAnswers++;
      } else {
        item.wrongAnswers++;
      }
    }
  }

  /*
   * ============================================================
   * 9. RESULTADO FINAL POR QUESTÃO
   * ============================================================
   */
  const questions =
    [...aggregation.values()]
      .map((item) => ({
        ...item,

        percentage:
          percentage(
            item.correctAnswers,
            item.totalAnswers,
          ),
      }));

  /*
   * Média geral ponderada.
   *
   * Uma questão respondida por 32 alunos tem mais peso que
   * uma questão respondida por apenas 2 alunos.
   */
  const totalCorrect =
    questions.reduce(
      (sum, question) =>
        sum +
        question.correctAnswers,
      0,
    );

  const totalAnswers =
    questions.reduce(
      (sum, question) =>
        sum +
        question.totalAnswers,
      0,
    );

  const questionsWithAnswers =
    questions.filter(
      (question) =>
        question.totalAnswers > 0,
    );

  const hardestQuestion =
    questionsWithAnswers.length > 0
      ? [...questionsWithAnswers].sort(
          (left, right) =>
            left.percentage -
              right.percentage ||
            left.question -
              right.question,
        )[0]
      : null;

  const easiestQuestion =
    questionsWithAnswers.length > 0
      ? [...questionsWithAnswers].sort(
          (left, right) =>
            right.percentage -
              left.percentage ||
            left.question -
              right.question,
        )[0]
      : null;

  return {
    subject,

    totalQuestions:
      questions.length,

    averagePercentage:
      percentage(
        totalCorrect,
        totalAnswers,
      ),

    hardestQuestion,
    easiestQuestion,

    classRooms:
      [...classRoomMap.values()].sort(
        (left, right) =>
          left.name.localeCompare(
            right.name,
            "pt-BR",
          ),
      ),

    exams:
      [...examMap.values()].sort(
        (left, right) =>
          left.title.localeCompare(
            right.title,
            "pt-BR",
          ),
      ),

    questions,
  };
}