import "server-only";

import {
  Alternative,
  AnswerSheetScanStatus,
  ScanBatchStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isReviewRecommended } from "@/lib/answer-sheet-effective-answer";
import { assertSupportedOpticalTotalQuestions } from "@/lib/answer-sheet-total-questions";

export class IncompleteScanReviewError extends Error {
  constructor(public readonly pendingCount: number) {
    super(
      `Ha ${pendingCount} questao(oes) com revisao recomendada nesta folha.`
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

  assertSupportedOpticalTotalQuestions(
    scan.answerSheet.examApplication.exam.totalQuestions
  );

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
      answers: {
        select: {
          reviewed: true,
          finalAnswer: true,
          detectionStatus: true,
          detectedAnswer: true,
        },
      },
    },
  });
  const identifiedPages = scans.filter((scan) => scan.answerSheetId).length;
  const confirmedPages = scans.filter(
    (scan) => scan.status === AnswerSheetScanStatus.CONFIRMED
  ).length;
  const reviewRequiredPages = scans.filter(
    (scan) =>
      scan.status === AnswerSheetScanStatus.DUPLICATE ||
      scan.status === AnswerSheetScanStatus.FAILED ||
      scan.answers.some(isReviewRecommended)
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
  if (!Number.isInteger(question) || question < 1) {
    throw new Error("Questao invalida.");
  }

  return prisma.$transaction(async (tx) => {
    const scan = await requireScanForExam(tx, {
      examId,
      scanId,
    });

    if (question > scan.totalQuestions) {
      throw new Error("Questao invalida.");
    }

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
        detectionStatus: true,
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
        detectionStatus: answer.detectionStatus,
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
    const answers = await tx.detectedAnswer.findMany({
      where: {
        answerSheetScanId: scan.id,
      },
      select: {
        reviewed: true,
        finalAnswer: true,
        detectionStatus: true,
        detectedAnswer: true,
      },
    });
    const totalAnswers = answers.length;

    if (totalAnswers !== scan.totalQuestions) {
      throw new Error(
        `A folha possui ${totalAnswers} resposta(s) detectada(s), mas o esperado e ${scan.totalQuestions}.`
      );
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
