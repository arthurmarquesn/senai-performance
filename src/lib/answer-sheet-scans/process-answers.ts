import {
  Alternative,
  AnswerSheetScanStatus,
  DetectedAnswerStatus,
  ScanBatchStatus,
  type Prisma,
} from "@prisma/client";
import type { ImageData } from "@napi-rs/canvas";

import {
  ANSWER_SHEET_ALTERNATIVES,
} from "@/lib/answer-sheet-pdf/layout";
import type { AnswerSheetAlternative } from "@/lib/answer-sheet-pdf/types";
import {
  getNormalizedBubbleGeometry,
  imageDataFromPngBytes,
  measureBubbleFill,
  type BubbleFillMetrics,
} from "@/lib/answer-sheet-scans/bubble-calibration";
import {
  classifyQuestionOneExperimentally,
  type ExperimentalDecision,
  type ExperimentalThresholds,
} from "@/lib/answer-sheet-scans/bubble-experimental-fixtures";
import {
  NORMALIZED_PAGE_HEIGHT,
  NORMALIZED_PAGE_WIDTH,
} from "@/lib/answer-sheet-scans/normalization-geometry";
import { INITIAL_OPTICAL_READING_THRESHOLDS } from "@/lib/answer-sheet-scans/optical-thresholds";
import { readNormalizedScanImage } from "@/lib/answer-sheet-scans/storage";
import { prisma } from "@/lib/prisma";

const CURRENTLY_VALIDATED_TOTAL_QUESTIONS = 60;

type QuestionReading = {
  question: number;
  metrics: BubbleFillMetrics[];
  decision: ExperimentalDecision;
  detectionStatus: DetectedAnswerStatus;
  detectedAnswer: Alternative | null;
};

export type ProcessAnswerSheetScanSummary = {
  scanId: string;
  batchId: string;
  pageNumber: number;
  studentName: string | null;
  totalQuestions: number;
  persistedAnswers: number;
  detected: number;
  blank: number;
  multiple: number;
  uncertain: number;
  status: "PROCESSED" | "REVIEW_REQUIRED";
};

function toPrismaAlternative(
  alternative: AnswerSheetAlternative | null
): Alternative | null {
  return alternative ? Alternative[alternative] : null;
}

function mapDecision(decision: ExperimentalDecision) {
  if (decision.kind === "DETECTED") {
    return {
      detectionStatus: DetectedAnswerStatus.DETECTED,
      detectedAnswer: toPrismaAlternative(decision.alternative),
    };
  }

  return {
    detectionStatus: DetectedAnswerStatus[decision.kind],
    detectedAnswer: null,
  };
}

function fillValue(
  metrics: BubbleFillMetrics[],
  alternative: AnswerSheetAlternative
) {
  return metrics.find((metric) => metric.alternative === alternative)?.score ?? null;
}

export function analyzeAnswerQuestion({
  imageData,
  totalQuestions,
  question,
  thresholds = INITIAL_OPTICAL_READING_THRESHOLDS,
}: {
  imageData: ImageData;
  totalQuestions: number;
  question: number;
  thresholds?: ExperimentalThresholds;
}): QuestionReading {
  const metrics = ANSWER_SHEET_ALTERNATIVES.map((alternative) =>
    measureBubbleFill(
      imageData,
      getNormalizedBubbleGeometry({
        question,
        totalQuestions,
        alternative,
      })
    )
  );
  const decision = classifyQuestionOneExperimentally({
    metrics,
    thresholds,
  });
  const mapped = mapDecision(decision);

  return {
    question,
    metrics,
    decision,
    detectionStatus: mapped.detectionStatus,
    detectedAnswer: mapped.detectedAnswer,
  };
}

export function analyzeAnswerSheetImage({
  imageData,
  totalQuestions,
  thresholds = INITIAL_OPTICAL_READING_THRESHOLDS,
}: {
  imageData: ImageData;
  totalQuestions: number;
  thresholds?: ExperimentalThresholds;
}) {
  if (totalQuestions !== CURRENTLY_VALIDATED_TOTAL_QUESTIONS) {
    throw new Error(
      "A leitura optica atual esta validada apenas para gabaritos de 60 questoes."
    );
  }

  if (
    imageData.width !== NORMALIZED_PAGE_WIDTH ||
    imageData.height !== NORMALIZED_PAGE_HEIGHT
  ) {
    throw new Error(
      `Imagem normalizada fora do tamanho canonico (${NORMALIZED_PAGE_WIDTH}x${NORMALIZED_PAGE_HEIGHT}).`
    );
  }

  const readings: QuestionReading[] = [];

  for (let question = 1; question <= totalQuestions; question++) {
    readings.push(
      analyzeAnswerQuestion({
        imageData,
        totalQuestions,
        question,
        thresholds,
      })
    );
  }

  return readings;
}

function buildDetectedAnswerData(reading: QuestionReading) {
  return {
    detectedAnswer: reading.detectedAnswer,
    detectionStatus: reading.detectionStatus,
    confidence: null,
    fillA: fillValue(reading.metrics, "A"),
    fillB: fillValue(reading.metrics, "B"),
    fillC: fillValue(reading.metrics, "C"),
    fillD: fillValue(reading.metrics, "D"),
    fillE: fillValue(reading.metrics, "E"),
    finalAnswer: null,
    reviewed: false,
    reviewedAt: null,
  } satisfies Omit<
    Prisma.DetectedAnswerUncheckedCreateInput,
    "id" | "answerSheetScanId" | "question" | "createdAt" | "updatedAt"
  >;
}

async function updateBatchCounters(
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
      reviewRequiredPages,
      status:
        reviewRequiredPages > 0
          ? ScanBatchStatus.REVIEW_REQUIRED
          : ScanBatchStatus.PROCESSING,
    },
  });
}

export async function processAnswerSheetScan({
  scanId,
}: {
  scanId: string;
}): Promise<ProcessAnswerSheetScanSummary> {
  const scan = await prisma.answerSheetScan.findUnique({
    where: {
      id: scanId,
    },
    include: {
      answerSheet: {
        include: {
          student: {
            select: {
              name: true,
            },
          },
          examApplication: {
            include: {
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

  if (!scan) {
    throw new Error("Pagina digitalizada nao encontrada.");
  }

  if (!scan.answerSheetId || !scan.answerSheet) {
    throw new Error("A pagina precisa estar identificada antes da leitura.");
  }

  if (!scan.normalizedImageKey) {
    throw new Error("A pagina precisa estar normalizada antes da leitura.");
  }

  const totalQuestions = scan.answerSheet.examApplication.exam.totalQuestions;
  const pngBytes = await readNormalizedScanImage(scan.normalizedImageKey);
  const imageData = await imageDataFromPngBytes(new Uint8Array(pngBytes));
  const readings = analyzeAnswerSheetImage({
    imageData,
    totalQuestions,
  });
  const nextScanStatus = readings.some(
    (reading) =>
      reading.detectionStatus === DetectedAnswerStatus.MULTIPLE ||
      reading.detectionStatus === DetectedAnswerStatus.UNCERTAIN
  )
    ? AnswerSheetScanStatus.REVIEW_REQUIRED
    : AnswerSheetScanStatus.PROCESSED;
  const allowedQuestions = Array.from(
    { length: totalQuestions },
    (_, index) => index + 1
  );

  const persistedAnswers = await prisma.$transaction(async (tx) => {
    const existingAnswers = await tx.detectedAnswer.findMany({
      where: {
        answerSheetScanId: scan.id,
      },
      select: {
        question: true,
        reviewed: true,
        finalAnswer: true,
      },
    });
    const hasHumanDecision = existingAnswers.some(
      (answer) => answer.reviewed || answer.finalAnswer !== null
    );

    if (hasHumanDecision) {
      throw new Error(
        "Esta folha possui revisao humana ou resposta final e nao pode ser sobrescrita automaticamente."
      );
    }

    await tx.detectedAnswer.deleteMany({
      where: {
        answerSheetScanId: scan.id,
        question: {
          notIn: allowedQuestions,
        },
      },
    });

    for (const reading of readings) {
      const data = buildDetectedAnswerData(reading);

      await tx.detectedAnswer.upsert({
        where: {
          answerSheetScanId_question: {
            answerSheetScanId: scan.id,
            question: reading.question,
          },
        },
        update: data,
        create: {
          answerSheetScanId: scan.id,
          question: reading.question,
          ...data,
        },
      });
    }

    await tx.answerSheetScan.update({
      where: {
        id: scan.id,
      },
      data: {
        status: nextScanStatus,
        processedAt: new Date(),
      },
    });

    await updateBatchCounters(tx, scan.scanBatchId);

    return tx.detectedAnswer.count({
      where: {
        answerSheetScanId: scan.id,
      },
    });
  });

  return {
    scanId: scan.id,
    batchId: scan.scanBatchId,
    pageNumber: scan.pageNumber,
    studentName: scan.answerSheet.student.name,
    totalQuestions,
    persistedAnswers,
    detected: readings.filter(
      (reading) => reading.detectionStatus === DetectedAnswerStatus.DETECTED
    ).length,
    blank: readings.filter(
      (reading) => reading.detectionStatus === DetectedAnswerStatus.BLANK
    ).length,
    multiple: readings.filter(
      (reading) => reading.detectionStatus === DetectedAnswerStatus.MULTIPLE
    ).length,
    uncertain: readings.filter(
      (reading) => reading.detectionStatus === DetectedAnswerStatus.UNCERTAIN
    ).length,
    status: nextScanStatus,
  };
}
