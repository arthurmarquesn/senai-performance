import {
  AnswerSheetScanStatus,
  ScanBatchStatus,
  type AnswerSheetScan,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { decodeQrCandidates } from "@/lib/answer-sheet-scans/qr";
import {
  loadScanPdfDocument,
  renderScanPdfPage,
  SCAN_RENDER_SCALE,
} from "@/lib/answer-sheet-scans/rasterize";
import { readOriginalScanPdf } from "@/lib/answer-sheet-scans/storage";

type ScanCandidate = {
  code: string;
  answerSheetId: string;
};

type ScanIdentificationResult = {
  scanId: string;
  pageNumber: number;
  status: AnswerSheetScanStatus;
  detectedCode: string | null;
  answerSheetId: string | null;
};

export type IdentifyScanBatchInput = {
  examId: string;
  examApplicationId: string;
  batchId: string;
};

export type IdentifyScanBatchSummary = {
  batchId: string;
  totalPages: number;
  processedPages: number;
  identifiedPages: number;
  reviewRequiredPages: number;
  duplicatePages: number;
  failedPages: number;
  status: ScanBatchStatus;
  renderScale: number;
  results: ScanIdentificationResult[];
};

function isProblemStatus(status: AnswerSheetScanStatus) {
  return (
    status === AnswerSheetScanStatus.REVIEW_REQUIRED ||
    status === AnswerSheetScanStatus.DUPLICATE ||
    status === AnswerSheetScanStatus.FAILED
  );
}

async function resolveCandidates({
  codes,
  examApplicationId,
}: {
  codes: string[];
  examApplicationId: string;
}) {
  const candidates: ScanCandidate[] = [];

  for (const code of codes) {
    const answerSheet = await prisma.answerSheet.findUnique({
      where: {
        code,
      },
      select: {
        id: true,
        examApplicationId: true,
      },
    });

    if (answerSheet?.examApplicationId === examApplicationId) {
      candidates.push({
        code,
        answerSheetId: answerSheet.id,
      });
    }
  }

  return candidates;
}

async function processScanPage({
  scan,
  pdf,
  examApplicationId,
  identifiedAnswerSheetIds,
}: {
  scan: Pick<AnswerSheetScan, "id" | "pageNumber">;
  pdf: Awaited<ReturnType<typeof loadScanPdfDocument>>;
  examApplicationId: string;
  identifiedAnswerSheetIds: Set<string>;
}): Promise<ScanIdentificationResult> {
  await prisma.answerSheetScan.update({
    where: {
      id: scan.id,
    },
    data: {
      status: AnswerSheetScanStatus.PROCESSING,
      answerSheetId: null,
      detectedCode: null,
      qrConfidence: null,
      processedAt: null,
    },
  });

  try {
    const imageData = await renderScanPdfPage(pdf, scan.pageNumber);
    const decoded = decodeQrCandidates(imageData);

    if (decoded.all.length === 0) {
      return {
        scanId: scan.id,
        pageNumber: scan.pageNumber,
        status: AnswerSheetScanStatus.REVIEW_REQUIRED,
        detectedCode: null,
        answerSheetId: null,
      };
    }

    const matchingCandidates = await resolveCandidates({
      codes: decoded.answerSheetCodes,
      examApplicationId,
    });

    if (matchingCandidates.length === 1) {
      const [candidate] = matchingCandidates;

      if (identifiedAnswerSheetIds.has(candidate.answerSheetId)) {
        return {
          scanId: scan.id,
          pageNumber: scan.pageNumber,
          status: AnswerSheetScanStatus.DUPLICATE,
          detectedCode: candidate.code,
          answerSheetId: null,
        };
      }

      identifiedAnswerSheetIds.add(candidate.answerSheetId);

      return {
        scanId: scan.id,
        pageNumber: scan.pageNumber,
        status: AnswerSheetScanStatus.IDENTIFIED,
        detectedCode: candidate.code,
        answerSheetId: candidate.answerSheetId,
      };
    }

    return {
      scanId: scan.id,
      pageNumber: scan.pageNumber,
      status: AnswerSheetScanStatus.REVIEW_REQUIRED,
      detectedCode: decoded.answerSheetCodes[0] ?? decoded.all[0] ?? null,
      answerSheetId: null,
    };
  } catch (error) {
    console.error(`Erro ao identificar QR da página ${scan.pageNumber}:`, error);

    return {
      scanId: scan.id,
      pageNumber: scan.pageNumber,
      status: AnswerSheetScanStatus.FAILED,
      detectedCode: null,
      answerSheetId: null,
    };
  }
}

async function persistScanResult(result: ScanIdentificationResult) {
  await prisma.answerSheetScan.update({
    where: {
      id: result.scanId,
    },
    data: {
      status: result.status,
      detectedCode: result.detectedCode,
      answerSheetId: result.answerSheetId,
      qrConfidence: null,
      processedAt: new Date(),
    },
  });
}

async function updateBatchCounters(batchId: string) {
  const scans = await prisma.answerSheetScan.findMany({
    where: {
      scanBatchId: batchId,
    },
    select: {
      status: true,
    },
  });

  const identifiedPages = scans.filter(
    (scan) => scan.status === AnswerSheetScanStatus.IDENTIFIED
  ).length;
  const reviewRequiredPages = scans.filter((scan) =>
    isProblemStatus(scan.status)
  ).length;
  const processedPages = scans.filter(
    (scan) => scan.status !== AnswerSheetScanStatus.PROCESSING
  ).length;
  const duplicatePages = scans.filter(
    (scan) => scan.status === AnswerSheetScanStatus.DUPLICATE
  ).length;
  const failedPages = scans.filter(
    (scan) => scan.status === AnswerSheetScanStatus.FAILED
  ).length;
  const status =
    reviewRequiredPages > 0
      ? ScanBatchStatus.REVIEW_REQUIRED
      : ScanBatchStatus.PROCESSING;

  await prisma.answerSheetScanBatch.update({
    where: {
      id: batchId,
    },
    data: {
      processedPages,
      identifiedPages,
      reviewRequiredPages,
      confirmedPages: 0,
      status,
      completedAt: new Date(),
    },
  });

  return {
    processedPages,
    identifiedPages,
    reviewRequiredPages,
    duplicatePages,
    failedPages,
    status,
  };
}

export async function identifyScanBatch(
  input: IdentifyScanBatchInput
): Promise<IdentifyScanBatchSummary> {
  const batch = await prisma.answerSheetScanBatch.findFirst({
    where: {
      id: input.batchId,
      examApplicationId: input.examApplicationId,
      examApplication: {
        examId: input.examId,
      },
    },
    include: {
      scans: {
        select: {
          id: true,
          pageNumber: true,
        },
        orderBy: {
          pageNumber: "asc",
        },
      },
    },
  });

  if (!batch) {
    throw new Error("Lote de digitalização não encontrado.");
  }

  if (!batch.sourceFileKey) {
    throw new Error("O PDF original deste lote não está disponível.");
  }

  await prisma.answerSheetScanBatch.update({
    where: {
      id: batch.id,
    },
    data: {
      status: ScanBatchStatus.PROCESSING,
      startedAt: new Date(),
      completedAt: null,
      processedPages: 0,
      identifiedPages: 0,
      reviewRequiredPages: 0,
      confirmedPages: 0,
    },
  });

  const pdfBytes = await readOriginalScanPdf(batch.sourceFileKey);
  const pdf = await loadScanPdfDocument(new Uint8Array(pdfBytes));
  const identifiedAnswerSheetIds = new Set<string>();
  const results: ScanIdentificationResult[] = [];

  for (const scan of batch.scans) {
    const result = await processScanPage({
      scan,
      pdf,
      examApplicationId: batch.examApplicationId,
      identifiedAnswerSheetIds,
    });

    await persistScanResult(result);
    results.push(result);
  }

  const counters = await updateBatchCounters(batch.id);

  return {
    batchId: batch.id,
    totalPages: batch.totalPages,
    processedPages: counters.processedPages,
    identifiedPages: counters.identifiedPages,
    reviewRequiredPages: counters.reviewRequiredPages,
    duplicatePages: counters.duplicatePages,
    failedPages: counters.failedPages,
    status: counters.status,
    renderScale: SCAN_RENDER_SCALE,
    results,
  };
}
