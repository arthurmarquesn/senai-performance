import "server-only";

import {
  Alternative,
  AnswerSheetScanStatus,
  DetectedAnswerStatus,
  ScanBatchStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

const CURRENTLY_VALIDATED_TOTAL_QUESTIONS = 60;

export class IncompleteScanReviewError extends Error {
  constructor(public readonly pendingCount: number) {
    super(
      `Ainda faltam ${pendingCount} questao(oes) para concluir a revisao da folha.`
    );
  }
}

async function requireScanForExam(
  tx: Prisma.TransactionClient,
  {
    examId,
    scanId,
  }: {
    examId: string;
    scanId: string;
  }
) {
  const scan = await tx.answerSheetScan.findFirst({
    where: {
      id: scanId,
      answerSheet: {
        examApplication: {
          examId,
        },
      },
    },
    select: {
      id: true,
      scanBatchId: true,
      answerSheet: {
        select: {
          examApplication: {
            select: {
              exam: {
                select: {
                  totalQuestions: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!scan?.answerSheet) {
    throw new Error("Folha digitalizada nao encontrada para este simulado.");
  }

  if (
    scan.answerSheet.examApplication.exam.totalQuestions !==
    CURRENTLY_VALIDATED_TOTAL_QUESTIONS
  ) {
    throw new Error("A revisao atual esta validada apenas para 60 questoes.");
  }

  return {
    id: scan.id,
    scanBatchId: scan.scanBatchId,
    totalQuestions: scan.answerSheet.examApplication.exam.totalQuestions,
  };
}

async function updateBatchReviewCounters(
  tx: Prisma.TransactionClient,
  batchId: string
) {
  const scans = await tx.answerSheetScan.findMany({
    where: {
      scanBatchId: batchId,
    },
    select: {
      answerSheetId: true,
      status: true,
    },
  });
  const identifiedPages = scans.filter((scan) => scan.answerSheetId).length;
  const confirmedPages = scans.filter(
    (scan) => scan.status === AnswerSheetScanStatus.CONFIRMED
  ).length;
  const reviewRequiredPages = scans.filter(
    (scan) =>
      scan.status === AnswerSheetScanStatus.REVIEW_REQUIRED ||
      scan.status === AnswerSheetScanStatus.DUPLICATE ||
      scan.status === AnswerSheetScanStatus.FAILED
  ).length;

  await tx.answerSheetScanBatch.update({
    where: {
      id: batchId,
    },
    data: {
      identifiedPages,
      confirmedPages,
      reviewRequiredPages,
      status:
        reviewRequiredPages > 0
          ? ScanBatchStatus.REVIEW_REQUIRED
          : ScanBatchStatus.PROCESSING,
    },
  });
}

export async function confirmClearDetectedAnswers({
  examId,
  scanId,
}: {
  examId: string;
  scanId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const scan = await requireScanForExam(tx, {
      examId,
      scanId,
    });
    const answers = await tx.detectedAnswer.findMany({
      where: {
        answerSheetScanId: scan.id,
        detectionStatus: DetectedAnswerStatus.DETECTED,
        reviewed: false,
      },
      select: {
        id: true,
        detectedAnswer: true,
      },
    });
    const now = new Date();

    for (const answer of answers) {
      if (!answer.detectedAnswer) {
        throw new Error("Leitura DETECTED sem alternativa automatica.");
      }

      await tx.detectedAnswer.update({
        where: {
          id: answer.id,
        },
        data: {
          finalAnswer: answer.detectedAnswer,
          reviewed: true,
          reviewedAt: now,
        },
      });
    }

    const pending = await tx.detectedAnswer.count({
      where: {
        answerSheetScanId: scan.id,
        reviewed: false,
      },
    });

    return {
      updated: answers.length,
      pending,
    };
  });
}

export async function reviewAnswerQuestion({
  examId,
  scanId,
  question,
  finalAnswer,
}: {
  examId: string;
  scanId: string;
  question: number;
  finalAnswer: Alternative | null;
}) {
  if (!Number.isInteger(question) || question < 1 || question > 60) {
    throw new Error("Questao invalida.");
  }

  return prisma.$transaction(async (tx) => {
    const scan = await requireScanForExam(tx, {
      examId,
      scanId,
    });
    const answer = await tx.detectedAnswer.findUnique({
      where: {
        answerSheetScanId_question: {
          answerSheetScanId: scan.id,
          question,
        },
      },
      select: {
        id: true,
        fillA: true,
        fillB: true,
        fillC: true,
        fillD: true,
        fillE: true,
        detectedAnswer: true,
      },
    });

    if (!answer) {
      throw new Error("Questao nao pertence a esta folha.");
    }

    await tx.detectedAnswer.update({
      where: {
        id: answer.id,
      },
      data: {
        finalAnswer,
        reviewed: true,
        reviewedAt: new Date(),
      },
    });

    return {
      question,
      finalAnswer,
      preserved: {
        fillA: answer.fillA,
        fillB: answer.fillB,
        fillC: answer.fillC,
        fillD: answer.fillD,
        fillE: answer.fillE,
        detectedAnswer: answer.detectedAnswer,
      },
    };
  });
}

export async function completeAnswerSheetScanReview({
  examId,
  scanId,
}: {
  examId: string;
  scanId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const scan = await requireScanForExam(tx, {
      examId,
      scanId,
    });
    const [totalAnswers, pending] = await Promise.all([
      tx.detectedAnswer.count({
        where: {
          answerSheetScanId: scan.id,
        },
      }),
      tx.detectedAnswer.count({
        where: {
          answerSheetScanId: scan.id,
          reviewed: false,
        },
      }),
    ]);

    if (totalAnswers !== scan.totalQuestions) {
      throw new Error(
        `A folha possui ${totalAnswers} resposta(s) detectada(s), mas o esperado e ${scan.totalQuestions}.`
      );
    }

    if (pending > 0) {
      throw new IncompleteScanReviewError(pending);
    }

    await tx.answerSheetScan.update({
      where: {
        id: scan.id,
      },
      data: {
        status: AnswerSheetScanStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    });

    await updateBatchReviewCounters(tx, scan.scanBatchId);

    return {
      status: AnswerSheetScanStatus.CONFIRMED,
      confirmed: totalAnswers,
    };
  });
}
