import {
  AnswerSheetScanStatus,
  ScanBatchStatus,
} from "@prisma/client";

import {
  processAnswerSheetScan,
  type ProcessAnswerSheetScanSummary,
} from "@/lib/answer-sheet-scans/process-answers";
import { prisma } from "@/lib/prisma";

type BatchScanCandidate = {
  id: string;
  pageNumber: number;
  answerSheetId: string | null;
  normalizedImageKey: string | null;
  status: AnswerSheetScanStatus;
  answers: Array<{
    reviewed: boolean;
    finalAnswer: string | null;
  }>;
};

export type BatchPageProcessResult =
  | {
      kind: "PROCESSED";
      scanId: string;
      pageNumber: number;
      status: "PROCESSED" | "REVIEW_REQUIRED";
      detected: number;
      blank: number;
      multiple: number;
      uncertain: number;
      persistedAnswers: number;
    }
  | {
      kind:
        | "SKIPPED_CONFIRMED"
        | "SKIPPED_HUMAN_DECISION"
        | "SKIPPED_NOT_IDENTIFIED"
        | "SKIPPED_NOT_NORMALIZED";
      scanId: string;
      pageNumber: number;
      status: AnswerSheetScanStatus;
      reason: string;
    }
  | {
      kind: "FAILED";
      scanId: string;
      pageNumber: number;
      reason: string;
    };

export type BatchCountersSummary = {
  totalPages: number;
  identifiedPages: number;
  processedPages: number;
  reviewRequiredPages: number;
  confirmedPages: number;
  detectedAnswerTotal: number;
  status: ScanBatchStatus;
};

export type ProcessAnswerSheetScanBatchSummary = BatchCountersSummary & {
  batchId: string;
  eligiblePages: number;
  processedNow: number;
  reviewRequiredNow: number;
  previouslyConfirmed: number;
  protectedPages: number;
  skippedNotIdentified: number;
  skippedNotNormalized: number;
  technicalFailures: number;
  durationMs: number;
  results: BatchPageProcessResult[];
};

function hasHumanDecision(scan: BatchScanCandidate) {
  return scan.answers.some(
    (answer) => answer.reviewed || answer.finalAnswer !== null
  );
}

function summarizeProcessed(
  result: ProcessAnswerSheetScanSummary
): BatchPageProcessResult {
  return {
    kind: "PROCESSED",
    scanId: result.scanId,
    pageNumber: result.pageNumber,
    status: result.status,
    detected: result.detected,
    blank: result.blank,
    multiple: result.multiple,
    uncertain: result.uncertain,
    persistedAnswers: result.persistedAnswers,
  };
}

async function recalculateBatchCounters(
  batchId: string
): Promise<BatchCountersSummary> {
  const batch = await prisma.answerSheetScanBatch.findUnique({
    where: {
      id: batchId,
    },
    include: {
      scans: {
        include: {
          answers: {
            select: {
              reviewed: true,
              finalAnswer: true,
              detectionStatus: true,
            },
          },
        },
      },
    },
  });

  if (!batch) {
    throw new Error("Lote de digitalizacao nao encontrado.");
  }

  const identifiedPages = batch.scans.filter((scan) => scan.answerSheetId).length;
  const confirmedPages = batch.scans.filter(
    (scan) => scan.status === AnswerSheetScanStatus.CONFIRMED
  ).length;
  const processedPages = batch.scans.filter(
    (scan) =>
      Boolean(scan.answerSheetId) &&
      scan.answers.length === 60 &&
      (scan.status === AnswerSheetScanStatus.PROCESSED ||
        scan.status === AnswerSheetScanStatus.REVIEW_REQUIRED ||
        scan.status === AnswerSheetScanStatus.CONFIRMED)
  ).length;
  const reviewRequiredPages = batch.scans.filter((scan) => {
    const humanDecisionPendingConfirmation =
      scan.status !== AnswerSheetScanStatus.CONFIRMED &&
      scan.answers.some((answer) => answer.reviewed || answer.finalAnswer !== null);

    return (
      scan.status === AnswerSheetScanStatus.REVIEW_REQUIRED ||
      scan.status === AnswerSheetScanStatus.DUPLICATE ||
      scan.status === AnswerSheetScanStatus.FAILED ||
      humanDecisionPendingConfirmation
    );
  }).length;
  const detectedAnswerTotal = batch.scans.reduce(
    (sum, scan) => sum + scan.answers.length,
    0
  );
  const allPagesReady =
    batch.totalPages > 0 &&
    identifiedPages === batch.totalPages &&
    processedPages === identifiedPages &&
    reviewRequiredPages === 0;
  const status = allPagesReady
    ? ScanBatchStatus.READY_FOR_CONFIRMATION
    : ScanBatchStatus.REVIEW_REQUIRED;

  await prisma.answerSheetScanBatch.update({
    where: {
      id: batch.id,
    },
    data: {
      processedPages,
      identifiedPages,
      reviewRequiredPages,
      confirmedPages,
      status,
      completedAt: new Date(),
    },
  });

  return {
    totalPages: batch.totalPages,
    identifiedPages,
    processedPages,
    reviewRequiredPages,
    confirmedPages,
    detectedAnswerTotal,
    status,
  };
}

export async function processAnswerSheetScanBatch({
  examId,
  examApplicationId,
  batchId,
}: {
  examId: string;
  examApplicationId: string;
  batchId: string;
}): Promise<ProcessAnswerSheetScanBatchSummary> {
  const startedAt = Date.now();
  const batch = await prisma.answerSheetScanBatch.findFirst({
    where: {
      id: batchId,
      examApplicationId,
      examApplication: {
        examId,
      },
    },
    include: {
      scans: {
        orderBy: {
          pageNumber: "asc",
        },
        select: {
          id: true,
          pageNumber: true,
          answerSheetId: true,
          normalizedImageKey: true,
          status: true,
          answers: {
            select: {
              reviewed: true,
              finalAnswer: true,
            },
          },
        },
      },
    },
  });

  if (!batch) {
    throw new Error("Lote de digitalizacao nao encontrado.");
  }

  await prisma.answerSheetScanBatch.update({
    where: {
      id: batch.id,
    },
    data: {
      status: ScanBatchStatus.PROCESSING,
      startedAt: new Date(),
      completedAt: null,
    },
  });

  const results: BatchPageProcessResult[] = [];

  for (const scan of batch.scans) {
    if (scan.status === AnswerSheetScanStatus.CONFIRMED) {
      results.push({
        kind: "SKIPPED_CONFIRMED",
        scanId: scan.id,
        pageNumber: scan.pageNumber,
        status: scan.status,
        reason: "Folha ja confirmada por revisao humana.",
      });
      continue;
    }

    if (hasHumanDecision(scan)) {
      results.push({
        kind: "SKIPPED_HUMAN_DECISION",
        scanId: scan.id,
        pageNumber: scan.pageNumber,
        status: scan.status,
        reason: "Folha possui revisao humana ou resposta final.",
      });
      continue;
    }

    if (!scan.answerSheetId) {
      results.push({
        kind: "SKIPPED_NOT_IDENTIFIED",
        scanId: scan.id,
        pageNumber: scan.pageNumber,
        status: scan.status,
        reason: "Pagina sem QR identificado.",
      });
      continue;
    }

    if (!scan.normalizedImageKey) {
      results.push({
        kind: "SKIPPED_NOT_NORMALIZED",
        scanId: scan.id,
        pageNumber: scan.pageNumber,
        status: scan.status,
        reason: "Pagina identificada sem imagem normalizada.",
      });
      continue;
    }

    try {
      const pageResult = await processAnswerSheetScan({
        scanId: scan.id,
      });

      results.push(summarizeProcessed(pageResult));
    } catch (error) {
      await prisma.answerSheetScan.update({
        where: {
          id: scan.id,
        },
        data: {
          status: AnswerSheetScanStatus.FAILED,
          processedAt: new Date(),
        },
      });

      results.push({
        kind: "FAILED",
        scanId: scan.id,
        pageNumber: scan.pageNumber,
        reason:
          error instanceof Error
            ? error.message
            : "Falha tecnica ao processar pagina.",
      });
    }
  }

  const counters = await recalculateBatchCounters(batch.id);

  return {
    batchId: batch.id,
    ...counters,
    eligiblePages: batch.scans.filter(
      (scan) => scan.answerSheetId && scan.normalizedImageKey
    ).length,
    processedNow: results.filter((result) => result.kind === "PROCESSED").length,
    reviewRequiredNow: results.filter(
      (result) =>
        result.kind === "PROCESSED" && result.status === "REVIEW_REQUIRED"
    ).length,
    previouslyConfirmed: results.filter(
      (result) => result.kind === "SKIPPED_CONFIRMED"
    ).length,
    protectedPages: results.filter(
      (result) => result.kind === "SKIPPED_HUMAN_DECISION"
    ).length,
    skippedNotIdentified: results.filter(
      (result) => result.kind === "SKIPPED_NOT_IDENTIFIED"
    ).length,
    skippedNotNormalized: results.filter(
      (result) => result.kind === "SKIPPED_NOT_NORMALIZED"
    ).length,
    technicalFailures: results.filter((result) => result.kind === "FAILED")
      .length,
    durationMs: Date.now() - startedAt,
    results,
  };
}
