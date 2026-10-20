import "server-only";

import type {
  Alternative,
  Subject,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type TeacherClassMetric = {
  id: string;
  name: string;
  grade: number;

  accuracy: number;

  evaluatedStudents: number;
  evaluatedExams: number;

  evolutionPp: number | null;

  latestExam: {
    id: string;
    title: string;
    accuracy: number;
  } | null;
};

export type TeacherExamMetric = {
  id: string;
  title: string;
  createdAt: Date;

  accuracy: number;

  evaluatedStudents: number;
  validQuestions: number;

  correctAnswers: number;
  possibleAnswers: number;
};

export type TeacherCriticalQuestion = {
  examId: string;
  examTitle: string;

  question: number;

  correctAnswer: Alternative;

  accuracy: number;

  correctAnswers: number;
  totalStudents: number;
};

export type TeacherOverviewMetrics = {
  summary: {
    accuracy: number | null;

    evolutionPp: number | null;

    evaluatedStudents: number;
    classrooms: number;
    exams: number;
  };

  classrooms: TeacherClassMetric[];

  exams: TeacherExamMetric[];

  latestExam: TeacherExamMetric | null;

  criticalQuestion: TeacherCriticalQuestion | null;
};

type ClassroomAccumulator = {
  id: string;
  name: string;
  grade: number;

  correctAnswers: number;
  possibleAnswers: number;

  studentIds: Set<string>;
  examIds: Set<string>;

  exams: Array<{
    id: string;
    title: string;
    createdAt: Date;

    correctAnswers: number;
    possibleAnswers: number;
  }>;
};

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function percentage(
  correct: number,
  total: number,
) {
  if (total <= 0) {
    return 0;
  }

  return roundOne(
    (correct / total) * 100,
  );
}

function getBlockQuestions(
  blocks: Array<{
    startQuestion: number;
    endQuestion: number;
  }>,
) {
  const questions =
    new Set<number>();

  for (const block of blocks) {
    for (
      let question = block.startQuestion;
      question <= block.endQuestion;
      question++
    ) {
      questions.add(question);
    }
  }

  return questions;
}

export async function getTeacherOverviewMetrics(
  subject: Subject,
): Promise<TeacherOverviewMetrics> {
  const exams =
    await prisma.exam.findMany({
      where: {
        blocks: {
          some: {
            subject,
          },
        },
      },

      select: {
        id: true,
        title: true,
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

          orderBy: {
            question: "asc",
          },
        },

        results: {
          select: {
            studentId: true,

            student: {
              select: {
                id: true,

                classRoom: {
                  select: {
                    id: true,
                    name: true,
                    grade: true,
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
        },
      },

      orderBy: {
        createdAt: "asc",
      },
    });

  const classroomMap =
    new Map<string, ClassroomAccumulator>();

  const evaluatedStudentIds =
    new Set<string>();

  const evaluatedClassroomIds =
    new Set<string>();

  const examMetrics: TeacherExamMetric[] =
    [];

  const questionMetrics: TeacherCriticalQuestion[] =
    [];

  let globalCorrect = 0;
  let globalPossible = 0;

  for (const exam of exams) {
    const subjectQuestions =
      getBlockQuestions(
        exam.blocks,
      );

    const validAnswerKey =
      new Map<
        number,
        Alternative
      >();

    for (
      const key
      of exam.answerKey
    ) {
      if (key.canceled) {
        continue;
      }

      if (
        !subjectQuestions.has(
          key.question,
        )
      ) {
        continue;
      }

      validAnswerKey.set(
        key.question,
        key.answer,
      );
    }

    if (
      validAnswerKey.size === 0
    ) {
      continue;
    }

    const examStudentIds =
      new Set<string>();

    let examCorrect = 0;
    let examPossible = 0;

    const questionAccumulator =
      new Map<
        number,
        {
          answer: Alternative;
          correct: number;
          total: number;
        }
      >();

    for (
      const [
        question,
        answer,
      ] of validAnswerKey
    ) {
      questionAccumulator.set(
        question,
        {
          answer,
          correct: 0,
          total: 0,
        },
      );
    }

    const classroomExamMap =
      new Map<
        string,
        {
          correct: number;
          possible: number;
        }
      >();

    for (
      const result
      of exam.results
    ) {
      const answersByQuestion =
        new Map<
          number,
          Alternative | null
        >();

      for (
        const answer
        of result.answers
      ) {
        if (
          validAnswerKey.has(
            answer.question,
          )
        ) {
          answersByQuestion.set(
            answer.question,
            answer.answer,
          );
        }
      }

      /*
       * O aluno só entra na estatística deste
       * simulado/disciplina se houver algum registro
       * de resposta nas questões da disciplina.
       */
      if (
        answersByQuestion.size === 0
      ) {
        continue;
      }

      const classroom =
        result.student.classRoom;

      examStudentIds.add(
        result.studentId,
      );

      evaluatedStudentIds.add(
        result.studentId,
      );

      evaluatedClassroomIds.add(
        classroom.id,
      );

      let studentCorrect = 0;

      for (
        const [
          question,
          correctAnswer,
        ] of validAnswerKey
      ) {
        const studentAnswer =
          answersByQuestion.get(
            question,
          );

        const questionData =
          questionAccumulator.get(
            question,
          );

        if (!questionData) {
          continue;
        }

        questionData.total++;

        if (
          studentAnswer ===
          correctAnswer
        ) {
          studentCorrect++;
          questionData.correct++;
        }
      }

      const studentPossible =
        validAnswerKey.size;

      examCorrect +=
        studentCorrect;

      examPossible +=
        studentPossible;

      globalCorrect +=
        studentCorrect;

      globalPossible +=
        studentPossible;

      const currentClassExam =
        classroomExamMap.get(
          classroom.id,
        ) ?? {
          correct: 0,
          possible: 0,
        };

      currentClassExam.correct +=
        studentCorrect;

      currentClassExam.possible +=
        studentPossible;

      classroomExamMap.set(
        classroom.id,
        currentClassExam,
      );

      let classroomData =
        classroomMap.get(
          classroom.id,
        );

      if (!classroomData) {
        classroomData = {
          id: classroom.id,
          name: classroom.name,
          grade: classroom.grade,

          correctAnswers: 0,
          possibleAnswers: 0,

          studentIds:
            new Set<string>(),

          examIds:
            new Set<string>(),

          exams: [],
        };

        classroomMap.set(
          classroom.id,
          classroomData,
        );
      }

      classroomData.correctAnswers +=
        studentCorrect;

      classroomData.possibleAnswers +=
        studentPossible;

      classroomData.studentIds.add(
        result.studentId,
      );

      classroomData.examIds.add(
        exam.id,
      );
    }

    if (
      examPossible === 0
    ) {
      continue;
    }

    examMetrics.push({
      id: exam.id,
      title: exam.title,
      createdAt: exam.createdAt,

      accuracy: percentage(
        examCorrect,
        examPossible,
      ),

      evaluatedStudents:
        examStudentIds.size,

      validQuestions:
        validAnswerKey.size,

      correctAnswers:
        examCorrect,

      possibleAnswers:
        examPossible,
    });

    /*
     * Salva o resultado daquele simulado
     * dentro da evolução de cada turma.
     */
    for (
      const [
        classroomId,
        classExam,
      ] of classroomExamMap
    ) {
      const classroom =
        classroomMap.get(
          classroomId,
        );

      if (!classroom) {
        continue;
      }

      classroom.exams.push({
        id: exam.id,
        title: exam.title,
        createdAt: exam.createdAt,

        correctAnswers:
          classExam.correct,

        possibleAnswers:
          classExam.possible,
      });
    }

    for (
      const [
        question,
        data,
      ] of questionAccumulator
    ) {
      if (
        data.total === 0
      ) {
        continue;
      }

      questionMetrics.push({
        examId: exam.id,

        examTitle:
          exam.title,

        question,

        correctAnswer:
          data.answer,

        accuracy: percentage(
          data.correct,
          data.total,
        ),

        correctAnswers:
          data.correct,

        totalStudents:
          data.total,
      });
    }
  }

  const classroomMetrics =
    Array.from(
      classroomMap.values(),
    )
      .map(
        (
          classroom,
        ): TeacherClassMetric => {
          const orderedExams =
            [...classroom.exams].sort(
              (a, b) =>
                a.createdAt.getTime() -
                b.createdAt.getTime(),
            );

          const latest =
            orderedExams.at(-1);

          const previous =
            orderedExams.at(-2);

          const latestAccuracy =
            latest
              ? percentage(
                  latest.correctAnswers,
                  latest.possibleAnswers,
                )
              : null;

          const previousAccuracy =
            previous
              ? percentage(
                  previous.correctAnswers,
                  previous.possibleAnswers,
                )
              : null;

          const evolutionPp =
            latestAccuracy !== null &&
            previousAccuracy !== null
              ? roundOne(
                  latestAccuracy -
                    previousAccuracy,
                )
              : null;

          return {
            id: classroom.id,
            name: classroom.name,
            grade: classroom.grade,

            accuracy: percentage(
              classroom.correctAnswers,
              classroom.possibleAnswers,
            ),

            evaluatedStudents:
              classroom.studentIds.size,

            evaluatedExams:
              classroom.examIds.size,

            evolutionPp,

            latestExam:
              latest &&
              latestAccuracy !== null
                ? {
                    id: latest.id,
                    title: latest.title,

                    accuracy:
                      latestAccuracy,
                  }
                : null,
          };
        },
      )
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
          "pt-BR",
        ),
      );

  const latestExam =
    examMetrics.at(-1) ??
    null;

  const previousExam =
    examMetrics.at(-2) ??
    null;

  const evolutionPp =
    latestExam &&
    previousExam
      ? roundOne(
          latestExam.accuracy -
            previousExam.accuracy,
        )
      : null;

  const criticalQuestion =
    [...questionMetrics]
      .sort(
        (a, b) =>
          a.accuracy -
            b.accuracy ||
          b.totalStudents -
            a.totalStudents ||
          a.question -
            b.question,
      )
      .at(0) ??
    null;

  return {
    summary: {
      accuracy:
        globalPossible > 0
          ? percentage(
              globalCorrect,
              globalPossible,
            )
          : null,

      evolutionPp,

      evaluatedStudents:
        evaluatedStudentIds.size,

      classrooms:
        evaluatedClassroomIds.size,

      exams:
        examMetrics.length,
    },

    classrooms:
      classroomMetrics,

    exams:
      examMetrics,

    latestExam,

    criticalQuestion,
  };
}