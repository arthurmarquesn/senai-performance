import "server-only";

import type {
  Alternative,
  Subject,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type TeacherPerformanceFilters = {
  classRoomId?: string;
  examId?: string;
};

export type TeacherPerformanceBandSummary = {
  id: string;
  name: string;
  minPercentage: number;
  maxPercentage: number;
  requiresComplementaryActivity: boolean;
  position: number;
  studentCount: number;
};

export type TeacherPerformanceStudent = {
  studentId: string;
  studentName: string;
  classRoomId: string;
  classRoomName: string;
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  band: {
    id: string;
    name: string;
    requiresComplementaryActivity: boolean;
  } | null;
};

export type TeacherPerformanceExamEvolution = {
  examId: string;
  examTitle: string;
  createdAt: Date;
  correctAnswers: number;
  totalAnswers: number;
  percentage: number;
  students: number;
};

export type TeacherQuestionPerformance = {
  examId: string;
  examTitle: string;
  question: number;
  correctAnswers: number;
  totalAnswers: number;
  percentage: number;
};

export type TeacherPerformanceSummary = {
  subject: Subject;
  totalStudents: number;
  totalExams: number;
  totalQuestions: number;
  correctAnswers: number;
  totalAnswers: number;
  averagePercentage: number;

  classRooms: Array<{
    id: string;
    name: string;
    grade: number;
  }>;

  exams: Array<{
    id: string;
    title: string;
  }>;

  students: TeacherPerformanceStudent[];
  bands: TeacherPerformanceBandSummary[];
  evolution: TeacherPerformanceExamEvolution[];
  questions: TeacherQuestionPerformance[];
};

function roundPercentage(value: number) {
  return Math.round(value * 100) / 100;
}

function percentage(
  numerator: number,
  denominator: number,
) {
  if (denominator <= 0) {
    return 0;
  }

  return roundPercentage(
    (numerator / denominator) * 100,
  );
}

function questionsFromBlocks(
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

function findPerformanceBand(
  percentageValue: number,
  bands: Array<{
    id: string;
    name: string;
    minPercentage: number;
    maxPercentage: number;
    requiresComplementaryActivity: boolean;
  }>,
) {
  return (
    bands.find(
      (band) =>
        percentageValue >=
          band.minPercentage &&
        percentageValue <=
          band.maxPercentage,
    ) ?? null
  );
}

export async function getTeacherPerformance(
  teacherProfileId: string,
  filters: TeacherPerformanceFilters = {},
): Promise<TeacherPerformanceSummary> {
  const teacherProfile =
    await prisma.teacherProfile.findUnique({
      where: {
        id: teacherProfileId,
      },
      select: {
        id: true,
        subject: true,
        performanceBands: {
          select: {
            id: true,
            name: true,
            minPercentage: true,
            maxPercentage: true,
            requiresComplementaryActivity:
              true,
            position: true,
          },
          orderBy: [
            {
              position: "asc",
            },
            {
              minPercentage: "asc",
            },
          ],
        },
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
   * Buscamos primeiro TODAS as aplicações que possuem a disciplina.
   * Esse conjunto abastece os filtros da interface.
   *
   * Depois aplicamos classRoomId/examId apenas para os cálculos.
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
            createdAt: true,

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
      orderBy: [
        {
          exam: {
            createdAt: "asc",
          },
        },
        {
          classRoom: {
            name: "asc",
          },
        },
      ],
    });

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
        id: application.exam.id,
        title:
          application.exam.title,
      },
    );
  }

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

      totalStudents: 0,
      totalExams: 0,
      totalQuestions: 0,

      correctAnswers: 0,
      totalAnswers: 0,

      averagePercentage: 0,

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

      students: [],

      bands:
        teacherProfile.performanceBands.map(
          (band) => ({
            ...band,
            studentCount: 0,
          }),
        ),

      evolution: [],
      questions: [],
    };
  }

  const examQuestionConfiguration =
    new Map<
      string,
      {
        examId: string;
        examTitle: string;
        createdAt: Date;
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
      examQuestionConfiguration.has(
        application.exam.id,
      )
    ) {
      continue;
    }

    const subjectQuestions =
      questionsFromBlocks(
        application.exam.blocks,
        application.exam.totalQuestions,
      );

    const keyByQuestion =
      new Map(
        application.exam.answerKey.map(
          (item) => [
            item.question,
            item,
          ] as const,
        ),
      );

    const validQuestions =
      subjectQuestions.filter(
        (question) => {
          const answerKey =
            keyByQuestion.get(question);

          return (
            answerKey !== undefined &&
            !answerKey.canceled
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
      const answerKey =
        keyByQuestion.get(question);

      if (!answerKey) {
        continue;
      }

      validAnswerKey.set(
        question,
        answerKey.answer,
      );
    }

    examQuestionConfiguration.set(
      application.exam.id,
      {
        examId:
          application.exam.id,
        examTitle:
          application.exam.title,
        createdAt:
          application.exam.createdAt,
        validQuestions,
        answerKey:
          validAnswerKey,
      },
    );
  }

  /*
   * Uma aplicação é definida pela combinação prova + turma.
   * Mantemos explicitamente essas combinações para impedir que
   * um resultado de outra turma entre na análise.
   */
  const resultScopes =
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
        OR: resultScopes,
      },
      select: {
        id: true,
        examId: true,

        student: {
          select: {
            id: true,
            name: true,
            classRoom: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },

        answers: {
          select: {
            question: true,
            answer: true,
          },
        },
      },
    });

  const studentAggregation =
    new Map<
      string,
      {
        studentId: string;
        studentName: string;
        classRoomId: string;
        classRoomName: string;
        correctAnswers: number;
        totalQuestions: number;
      }
    >();

  const examAggregation =
    new Map<
      string,
      {
        examId: string;
        examTitle: string;
        createdAt: Date;
        correctAnswers: number;
        totalAnswers: number;
        students: Set<string>;
      }
    >();

  const questionAggregation =
    new Map<
      string,
      {
        examId: string;
        examTitle: string;
        question: number;
        correctAnswers: number;
        totalAnswers: number;
      }
    >();

  let totalCorrectAnswers = 0;
  let totalPossibleAnswers = 0;

  for (const result of results) {
    const configuration =
      examQuestionConfiguration.get(
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

    let resultCorrect = 0;
    let resultTotal = 0;

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

      const studentAnswer =
        answerByQuestion.get(
          question,
        ) ?? null;

      const isCorrect =
        studentAnswer ===
        correctAnswer;

      resultTotal++;

      if (isCorrect) {
        resultCorrect++;
      }

      const questionKey =
        `${result.examId}:${question}`;

      const currentQuestion =
        questionAggregation.get(
          questionKey,
        ) ?? {
          examId:
            result.examId,
          examTitle:
            configuration.examTitle,
          question,
          correctAnswers: 0,
          totalAnswers: 0,
        };

      currentQuestion.totalAnswers++;

      if (isCorrect) {
        currentQuestion.correctAnswers++;
      }

      questionAggregation.set(
        questionKey,
        currentQuestion,
      );
    }

    totalCorrectAnswers +=
      resultCorrect;

    totalPossibleAnswers +=
      resultTotal;

    const student =
      studentAggregation.get(
        result.student.id,
      ) ?? {
        studentId:
          result.student.id,
        studentName:
          result.student.name,
        classRoomId:
          result.student.classRoom.id,
        classRoomName:
          result.student.classRoom.name,
        correctAnswers: 0,
        totalQuestions: 0,
      };

    student.correctAnswers +=
      resultCorrect;

    student.totalQuestions +=
      resultTotal;

    studentAggregation.set(
      result.student.id,
      student,
    );

    const exam =
      examAggregation.get(
        result.examId,
      ) ?? {
        examId:
          result.examId,
        examTitle:
          configuration.examTitle,
        createdAt:
          configuration.createdAt,
        correctAnswers: 0,
        totalAnswers: 0,
        students:
          new Set<string>(),
      };

    exam.correctAnswers +=
      resultCorrect;

    exam.totalAnswers +=
      resultTotal;

    exam.students.add(
      result.student.id,
    );

    examAggregation.set(
      result.examId,
      exam,
    );
  }

  const students =
    [...studentAggregation.values()]
      .map((student) => {
        const studentPercentage =
          percentage(
            student.correctAnswers,
            student.totalQuestions,
          );

        const band =
          findPerformanceBand(
            studentPercentage,
            teacherProfile.performanceBands,
          );

        return {
          ...student,
          percentage:
            studentPercentage,
          band: band
            ? {
                id: band.id,
                name: band.name,
                requiresComplementaryActivity:
                  band.requiresComplementaryActivity,
              }
            : null,
        };
      })
      .sort(
        (left, right) =>
          right.percentage -
            left.percentage ||
          left.studentName.localeCompare(
            right.studentName,
            "pt-BR",
          ),
      );

  const bands =
    teacherProfile.performanceBands.map(
      (band) => ({
        ...band,
        studentCount:
          students.filter(
            (student) =>
              student.band?.id ===
              band.id,
          ).length,
      }),
    );

  const evolution =
    [...examAggregation.values()]
      .sort(
        (left, right) =>
          left.createdAt.getTime() -
          right.createdAt.getTime(),
      )
      .map((exam) => ({
        examId:
          exam.examId,
        examTitle:
          exam.examTitle,
        createdAt:
          exam.createdAt,
        correctAnswers:
          exam.correctAnswers,
        totalAnswers:
          exam.totalAnswers,
        percentage:
          percentage(
            exam.correctAnswers,
            exam.totalAnswers,
          ),
        students:
          exam.students.size,
      }));

  const questions =
    [...questionAggregation.values()]
      .map((question) => ({
        ...question,
        percentage:
          percentage(
            question.correctAnswers,
            question.totalAnswers,
          ),
      }))
      .sort(
        (left, right) =>
          left.percentage -
            right.percentage ||
          left.examTitle.localeCompare(
            right.examTitle,
            "pt-BR",
          ) ||
          left.question -
            right.question,
      );

  const totalSubjectQuestions =
    [...examQuestionConfiguration.values()]
      .reduce(
        (sum, configuration) =>
          sum +
          configuration.validQuestions.length,
        0,
      );

  return {
    subject,

    totalStudents:
      studentAggregation.size,

    totalExams:
      examQuestionConfiguration.size,

    totalQuestions:
      totalSubjectQuestions,

    correctAnswers:
      totalCorrectAnswers,

    totalAnswers:
      totalPossibleAnswers,

    averagePercentage:
      percentage(
        totalCorrectAnswers,
        totalPossibleAnswers,
      ),

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

    students,
    bands,
    evolution,
    questions,
  };
}