import "server-only";

import { AnswerSheetStatus, ScanBatchStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  AnswerSheetCorrectionError,
  correctConfirmedAnswerSheetScan,
  validateCompleteAnswerKey,
} from "@/lib/answer-sheet-correction/correct-scan";

export class AnswerSheetBatchCorrectionError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export type BatchScanCorrectionKind =
  | "CORRECTED"
  | "ALREADY_CORRECTED"
  | "EXISTING_RESULT_PROTECTED"
  | "DIVERGENT"
  | "FAILED";

export type BatchScanCorrectionIssue = {
  kind: BatchScanCorrectionKind;
  scanId: string;
  pageNumber: number;
  studentId: string | null;
  reason: string;
};

export type CorrectAnswerSheetScanBatchSummary = {
  batchId: string;
  examId: string;
  totalScans: number;
  eligible: number;
  corrected: number;
  alreadyCorrected: number;
  protectedExistingResult: number;
  divergent: number;
  failed: number;
  correctedAnswerSheetsBefore: number;
  correctedAnswerSheetsAfter: number;
  totalAnswerSheets: number;
  elapsedMs: number;
  issues: BatchScanCorrectionIssue[];
};

function fail(message: string): never {
  throw new AnswerSheetBatchCorrectionError(message);
}

function classifyCorrectionError(message: string): BatchScanCorrectionKind {
  if (message.includes("Resultado oficial divergente")) {
    return "DIVERGENT";
  }

  if (message.includes("Ja existe resultado oficial")) {
    return "EXISTING_RESULT_PROTECTED";
  }

  return "FAILED";
}

async function loadBatchForCorrection({
  examId,
  batchId,
}: {
  examId: string;
  batchId: string;
}) {
  return prisma.answerSheetScanBatch.findFirst({
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
      scans: {
        orderBy: {
          pageNumber: "asc",
        },
        include: {
          answerSheet: {
            select: {
              id: true,
              studentId: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

async function countCorrectedAnswerSheets(scanIds: string[]) {
  const scans = await prisma.answerSheetScan.findMany({
    where: {
      id: {
        in: scanIds,
      },
    },
    select: {
      answerSheet: {
        select: {
          status: true,
        },
      },
    },
  });

  return scans.filter(
    (scan) => scan.answerSheet?.status === AnswerSheetStatus.CORRECTED
  ).length;
}

export async function correctAnswerSheetScanBatch({
  examId,
  batchId,
}: {
  examId: string;
  batchId: string;
}): Promise<CorrectAnswerSheetScanBatchSummary> {
  const startedAt = Date.now();
  const batch = await loadBatchForCorrection({
    examId,
    batchId,
  });

  if (!batch) {
    fail("Lote de leitura nao encontrado para este simulado.");
  }

  if (batch.status !== ScanBatchStatus.CONFIRMED) {
    fail(
      `O lote esta com status ${batch.status}. Apenas lotes CONFIRMED podem ser corrigidos.`
    );
  }

  const exam = batch.examApplication.exam;

  try {
    validateCompleteAnswerKey({
      totalQuestions: exam.totalQuestions,
      answerKey: exam.answerKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    fail(message);
  }

  const scanIds = batch.scans.map((scan) => scan.id);
  const correctedAnswerSheetsBefore = batch.scans.filter(
    (scan) => scan.answerSheet?.status === AnswerSheetStatus.CORRECTED
  ).length;
  const totalAnswerSheets = batch.scans.filter((scan) => scan.answerSheet).length;
  const issues: BatchScanCorrectionIssue[] = [];
  let corrected = 0;
  let alreadyCorrected = 0;
  let protectedExistingResult = 0;
  let divergent = 0;
  let failed = 0;

  for (const scan of batch.scans) {
    try {
      const result = await correctConfirmedAnswerSheetScan({
        examId,
        scanId: scan.id,
      });

      if (result.alreadyCorrected) {
        alreadyCorrected++;
      } else {
        corrected++;
      }
    } catch (error) {
      const message =
        error instanceof AnswerSheetCorrectionError || error instanceof Error
          ? error.message
          : "Nao foi possivel corrigir a folha.";
      const kind = classifyCorrectionError(message);

      if (kind === "EXISTING_RESULT_PROTECTED") {
        protectedExistingResult++;
      } else if (kind === "DIVERGENT") {
        divergent++;
      } else {
        failed++;
      }

      issues.push({
        kind,
        scanId: scan.id,
        pageNumber: scan.pageNumber,
        studentId: scan.answerSheet?.studentId ?? null,
        reason: message,
      });
    }
  }

  const correctedAnswerSheetsAfter = await countCorrectedAnswerSheets(scanIds);

  return {
    batchId: batch.id,
    examId,
    totalScans: batch.scans.length,
    eligible: batch.scans.length,
    corrected,
    alreadyCorrected,
    protectedExistingResult,
    divergent,
    failed,
    correctedAnswerSheetsBefore,
    correctedAnswerSheetsAfter,
    totalAnswerSheets,
    elapsedMs: Date.now() - startedAt,
    issues,
  };
}
