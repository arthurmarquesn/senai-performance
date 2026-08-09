import "server-only";

import {
  AnswerSheetScanStatus,
  AnswerSheetStatus,
  ScanBatchStatus,
  type Alternative,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class AnswerSheetCorrectionError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export type CorrectConfirmedAnswerSheetScanSummary = {
  scanId: string;
  answerSheetId: string;
  examResultId: string;
  studentId: string;
  examId: string;
  totalQuestions: number;
  studentAnswers: number;
  correctAnswers: number;
  validQuestions: number;
  canceledQuestions: number;
  blankAnswers: number;
  alreadyCorrected: boolean;
  answerSheetStatus: "CORRECTED";
  answerSheetCorrectedAt: Date | null;
  scanStatus: "CONFIRMED";
  batchStatus: "CONFIRMED";
};

type LoadedScan = NonNullable<Awaited<ReturnType<typeof loadScanForCorrection>>>;
type ReadyScan = LoadedScan & {
  answerSheet: NonNullable<LoadedScan["answerSheet"]>;
};

type FinalAnswer = {
  question: number;
  answer: Alternative | null;
};

function fail(message: string): never {
  throw new AnswerSheetCorrectionError(message);
}

async function loadScanForCorrection(
  tx: Prisma.TransactionClient,
  {
    scanId,
  }: {
    scanId: string;
  }
) {
  return tx.answerSheetScan.findUnique({
    where: {
      id: scanId,
    },
    include: {
      scanBatch: {
        include: {
          examApplication: true,
        },
      },
      answerSheet: {
        include: {
          student: true,
          examApplication: {
            include: {
              exam: {
                include: {
                  answerKey: {
                    orderBy: {
                      question: "asc",
                    },
                  },
                },
              },
            },
          },
        },
      },
      answers: {
        orderBy: {
          question: "asc",
        },
      },
    },
  });
}

function assertScanReady(scan: LoadedScan | null, examId: string): asserts scan is ReadyScan {
  if (!scan) {
    fail("Folha digitalizada nao encontrada.");
  }

  if (scan.status !== AnswerSheetScanStatus.CONFIRMED) {
    fail(`A folha esta com status ${scan.status}. Apenas folhas CONFIRMED podem ser corrigidas.`);
  }

  if (!scan.confirmedAt) {
    fail("A folha esta CONFIRMED, mas nao possui confirmedAt.");
  }

  if (!scan.answerSheetId || !scan.answerSheet) {
    fail("A folha digitalizada nao possui AnswerSheet associado.");
  }

  const answerSheetApplicationId = scan.answerSheet.examApplicationId;

  if (scan.answerSheet.examApplication.examId !== examId) {
    fail("A folha nao pertence ao simulado esperado.");
  }

  if (scan.scanBatch.examApplicationId !== answerSheetApplicationId) {
    fail("O lote da digitalizacao nao pertence a mesma aplicacao da folha.");
  }

  if (scan.scanBatch.examApplication.examId !== examId) {
    fail("O lote da digitalizacao nao pertence ao simulado esperado.");
  }

  if (scan.scanBatch.status !== ScanBatchStatus.CONFIRMED) {
    fail(`O lote esta com status ${scan.scanBatch.status}. Apenas lotes CONFIRMED podem gerar correcao oficial.`);
  }
}

function validateAnswerKey(scan: ReadyScan) {
  const exam = scan.answerSheet.examApplication.exam;
  const keyByQuestion = new Map(
    exam.answerKey.map((answerKey) => [answerKey.question, answerKey])
  );

  if (keyByQuestion.size !== exam.totalQuestions) {
    fail(
      `Gabarito incompleto: ${keyByQuestion.size}/${exam.totalQuestions} questoes cadastradas.`
    );
  }

  for (let question = 1; question <= exam.totalQuestions; question++) {
    if (!keyByQuestion.has(question)) {
      fail(`Gabarito incompleto: questao ${question} ausente.`);
    }
  }

  return keyByQuestion;
}

function getFinalAnswers(scan: ReadyScan): FinalAnswer[] {
  const totalQuestions = scan.answerSheet.examApplication.exam.totalQuestions;
  const answersByQuestion = new Map(
    scan.answers.map((answer) => [answer.question, answer])
  );

  if (answersByQuestion.size !== totalQuestions) {
    fail(
      `A folha possui ${answersByQuestion.size} resposta(s) detectada(s), mas o esperado e ${totalQuestions}.`
    );
  }

  for (let question = 1; question <= totalQuestions; question++) {
    const answer = answersByQuestion.get(question);

    if (!answer) {
      fail(`A folha nao possui resposta detectada para a questao ${question}.`);
    }

    if (!answer.reviewed) {
      fail(`A questao ${question} ainda nao foi revisada.`);
    }
  }

  return Array.from({ length: totalQuestions }, (_, index) => {
    const question = index + 1;
    const answer = answersByQuestion.get(question);

    if (!answer) {
      fail(`A folha nao possui resposta detectada para a questao ${question}.`);
    }

    return {
      question,
      answer: answer.finalAnswer,
    };
  });
}

function answersMatchOfficialResult({
  finalAnswers,
  officialAnswers,
}: {
  finalAnswers: FinalAnswer[];
  officialAnswers: Array<{
    question: number;
    answer: Alternative | null;
  }>;
}) {
  if (officialAnswers.length !== finalAnswers.length) {
    return false;
  }

  const officialByQuestion = new Map(
    officialAnswers.map((answer) => [answer.question, answer.answer])
  );

  return finalAnswers.every(
    (answer) => officialByQuestion.get(answer.question) === answer.answer
  );
}

function summarize({
  scan,
  examResultId,
  finalAnswers,
  alreadyCorrected,
  correctedAt,
}: {
  scan: ReadyScan;
  examResultId: string;
  finalAnswers: FinalAnswer[];
  alreadyCorrected: boolean;
  correctedAt: Date | null;
}): CorrectConfirmedAnswerSheetScanSummary {
  const keyByQuestion = validateAnswerKey(scan);
  let correctAnswers = 0;
  let validQuestions = 0;
  let canceledQuestions = 0;
  let blankAnswers = 0;

  for (const finalAnswer of finalAnswers) {
    const answerKey = keyByQuestion.get(finalAnswer.question);

    if (!answerKey) {
      fail(`Gabarito incompleto: questao ${finalAnswer.question} ausente.`);
    }

    if (finalAnswer.answer === null) {
      blankAnswers++;
    }

    if (answerKey.canceled) {
      canceledQuestions++;
      continue;
    }

    validQuestions++;

    if (finalAnswer.answer === answerKey.answer) {
      correctAnswers++;
    }
  }

  return {
    scanId: scan.id,
    answerSheetId: scan.answerSheet.id,
    examResultId,
    studentId: scan.answerSheet.studentId,
    examId: scan.answerSheet.examApplication.examId,
    totalQuestions: scan.answerSheet.examApplication.exam.totalQuestions,
    studentAnswers: finalAnswers.length,
    correctAnswers,
    validQuestions,
    canceledQuestions,
    blankAnswers,
    alreadyCorrected,
    answerSheetStatus: "CORRECTED",
    answerSheetCorrectedAt: correctedAt,
    scanStatus: "CONFIRMED",
    batchStatus: "CONFIRMED",
  };
}

async function getExistingResult(
  tx: Prisma.TransactionClient,
  {
    studentId,
    examId,
  }: {
    studentId: string;
    examId: string;
  }
) {
  return tx.examResult.findUnique({
    where: {
      studentId_examId: {
        studentId,
        examId,
      },
    },
    include: {
      answers: {
        orderBy: {
          question: "asc",
        },
      },
    },
  });
}

export async function correctConfirmedAnswerSheetScan({
  examId,
  scanId,
}: {
  examId: string;
  scanId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const scan = await loadScanForCorrection(tx, {
      scanId,
    });

    assertScanReady(scan, examId);
    validateAnswerKey(scan);

    const finalAnswers = getFinalAnswers(scan);
    const existingResult = await getExistingResult(tx, {
      studentId: scan.answerSheet.studentId,
      examId,
    });

    if (existingResult) {
      const sameAnswers = answersMatchOfficialResult({
        finalAnswers,
        officialAnswers: existingResult.answers,
      });

      if (
        scan.answerSheet.status === AnswerSheetStatus.CORRECTED &&
        sameAnswers
      ) {
        return summarize({
          scan,
          examResultId: existingResult.id,
          finalAnswers,
          alreadyCorrected: true,
          correctedAt: scan.answerSheet.correctedAt,
        });
      }

      fail(
        "Ja existe resultado oficial para este aluno e simulado. A correcao optica nao sobrescreve respostas existentes."
      );
    }

    if (scan.answerSheet.status === AnswerSheetStatus.CORRECTED) {
      fail("A folha ja esta marcada como CORRECTED, mas nao ha resultado oficial compativel.");
    }

    const now = new Date();
    const examResult = await tx.examResult.create({
      data: {
        studentId: scan.answerSheet.studentId,
        examId,
      },
    });

    await tx.studentAnswer.createMany({
      data: finalAnswers.map((answer) => ({
        examResultId: examResult.id,
        question: answer.question,
        answer: answer.answer,
      })),
    });

    await tx.answerSheet.update({
      where: {
        id: scan.answerSheet.id,
      },
      data: {
        status: AnswerSheetStatus.CORRECTED,
        correctedAt: now,
      },
    });

    return summarize({
      scan,
      examResultId: examResult.id,
      finalAnswers,
      alreadyCorrected: false,
      correctedAt: now,
    });
  });
}
