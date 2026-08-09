import {
  AnswerSheetScanStatus,
  Prisma,
  ScanBatchStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ImportScanBatchInput = {
  examId: string;
  examApplicationId: string;
  sourceFileName: string;
  sourceFileKey: string;
  totalPages: number;
};

export type ImportScanBatchSummary = {
  batchId: string;
  sourceFileName: string;
  sourceFileKey: string;
  totalPages: number;
  registeredPages: number;
  status: ScanBatchStatus;
};

function buildPendingScans(totalPages: number) {
  return Array.from({ length: totalPages }, (_, index) => ({
    pageNumber: index + 1,
    answerSheetId: null,
    detectedCode: null,
    status: AnswerSheetScanStatus.PENDING,
  }));
}

export async function createScanBatchWithPendingPages(
  input: ImportScanBatchInput
): Promise<ImportScanBatchSummary> {
  if (input.totalPages < 1) {
    throw new Error("O PDF precisa ter ao menos uma página.");
  }

  return prisma.$transaction(
    async (tx) => {
      const application = await tx.examApplication.findFirst({
        where: {
          id: input.examApplicationId,
          examId: input.examId,
        },
        select: {
          id: true,
        },
      });

      if (!application) {
        throw new Error("Aplicação de simulado não encontrada.");
      }

      const batch = await tx.answerSheetScanBatch.create({
        data: {
          examApplicationId: application.id,
          sourceFileName: input.sourceFileName.slice(0, 255),
          sourceFileKey: input.sourceFileKey,
          totalPages: input.totalPages,
          processedPages: 0,
          identifiedPages: 0,
          reviewRequiredPages: 0,
          confirmedPages: 0,
          status: ScanBatchStatus.UPLOADED,
          scans: {
            create: buildPendingScans(input.totalPages),
          },
        },
        select: {
          id: true,
          sourceFileName: true,
          sourceFileKey: true,
          totalPages: true,
          status: true,
          _count: {
            select: {
              scans: true,
            },
          },
        },
      });

      return {
        batchId: batch.id,
        sourceFileName: batch.sourceFileName,
        sourceFileKey: batch.sourceFileKey ?? input.sourceFileKey,
        totalPages: batch.totalPages,
        registeredPages: batch._count.scans,
        status: batch.status,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    }
  );
}
