import "server-only";

import {
  AnswerSheetScanStatus,
  ScanBatchStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class BatchCompletionValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export type CompleteAnswerSheetScanBatchReviewSummary = {
  batchId: string;
  alreadyConfirmed: boolean;
  totalPages: number;
  totalQuestions: number;
  confirmedPages: number;
  reviewedAnswers: number;
  expectedAnswers: number;
  status: "CONFIRMED";
  completedAt: Date | null;
};

function fail(message: string): never {
  throw new BatchCompletionValidationError(message);
}

async function loadBatchForCompletion(
  tx: Prisma.TransactionClient,
  {
    examId,
    batchId,
  }: {
    examId: string;
    batchId: string;
  }
) {
  const batch = await tx.answerSheetScanBatch.findFirst({
    where: {
      id: batchId,
      examApplication: {
        examId,
      },
    },
    include: {
      examApplication: {
        include: {
          exam: {
            select: {
              id: true,
              totalQuestions: true,
            },
          },
        },
      },
      scans: {
        include: {
          answers: {
            select: {
              reviewed: true,
            },
          },
        },
        orderBy: {
          pageNumber: "asc",
        },
      },
    },
  });

  if (!batch) {
    fail("Lote de leitura nao encontrado para este simulado.");
  }

  return batch;
}

function validateBatchCanBeCompleted(
  batch: Awaited<ReturnType<typeof loadBatchForCompletion>>
) {
  const totalQuestions = batch.examApplication.exam.totalQuestions;

  if (batch.scans.length !== batch.totalPages) {
    fail(
      `O lote possui ${batch.scans.length} pagina(s) cadastrada(s), mas totalPages indica ${batch.totalPages}.`
    );
  }

  for (const scan of batch.scans) {
    if (scan.status !== AnswerSheetScanStatus.CONFIRMED) {
      fail(
        `Pagina ${scan.pageNumber} ainda esta com status ${scan.status}. Todas precisam estar CONFIRMED.`
      );
    }

    if (!scan.answerSheetId) {
      fail(`Pagina ${scan.pageNumber} nao possui answerSheetId.`);
    }

    if (!scan.normalizedImageKey) {
      fail(`Pagina ${scan.pageNumber} nao possui imagem normalizada.`);
    }

    if (scan.answers.length !== totalQuestions) {
      fail(
        `Pagina ${scan.pageNumber} possui ${scan.answers.length} resposta(s), mas o esperado e ${totalQuestions}.`
      );
    }

    const unreviewed = scan.answers.filter((answer) => !answer.reviewed).length;

    if (unreviewed > 0) {
      fail(`Pagina ${scan.pageNumber} possui ${unreviewed} resposta(s) sem revisao.`);
    }
  }
}

function buildSummary({
  batch,
  alreadyConfirmed,
}: {
  batch: Awaited<ReturnType<typeof loadBatchForCompletion>>;
  alreadyConfirmed: boolean;
}): CompleteAnswerSheetScanBatchReviewSummary {
  const totalQuestions = batch.examApplication.exam.totalQuestions;
  const reviewedAnswers = batch.scans.reduce(
    (sum, scan) => sum + scan.answers.filter((answer) => answer.reviewed).length,
    0
  );

  return {
    batchId: batch.id,
    alreadyConfirmed,
    totalPages: batch.totalPages,
    totalQuestions,
    confirmedPages: batch.scans.length,
    reviewedAnswers,
    expectedAnswers: batch.scans.length * totalQuestions,
    status: "CONFIRMED",
    completedAt: batch.completedAt,
  };
}

export async function completeAnswerSheetScanBatchReview({
  examId,
  batchId,
}: {
  examId: string;
  batchId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const batch = await loadBatchForCompletion(tx, {
      examId,
      batchId,
    });

    validateBatchCanBeCompleted(batch);

    if (batch.status === ScanBatchStatus.CONFIRMED) {
      return buildSummary({
        batch,
        alreadyConfirmed: true,
      });
    }

    const now = new Date();

    await tx.answerSheetScanBatch.update({
      where: {
        id: batch.id,
      },
      data: {
        status: ScanBatchStatus.CONFIRMED,
        completedAt: now,
        identifiedPages: batch.totalPages,
        processedPages: batch.totalPages,
        confirmedPages: batch.totalPages,
        reviewRequiredPages: 0,
      },
    });

    return {
      ...buildSummary({
        batch,
        alreadyConfirmed: false,
      }),
      completedAt: now,
    };
  });
}
