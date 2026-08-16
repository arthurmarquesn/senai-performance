import {
  Alternative,
  AnswerSheetScanStatus,
  AnswerSheetStatus,
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
import { assertSupportedOpticalTotalQuestions } from "@/lib/answer-sheet-total-questions";
import { prisma } from "@/lib/prisma";

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
  persistedStudentAnswers: number;
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

  if (decision.kind === "UNCERTAIN") {
    return {
      detectionStatus: DetectedAnswerStatus.UNCERTAIN,
      detectedAnswer: toPrismaAlternative(decision.top1.alternative),
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
  return (
    metrics.find((metric) => metric.alternative === alternative)?.score ??
    null
  );
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
  assertSupportedOpticalTotalQuestions(totalQuestions);

  if (
    imageData.width !== NORMALIZED_PAGE_WIDTH ||
    imageData.height !== NORMALIZED_PAGE_HEIGHT
  ) {
    throw new Error(
      `Imagem de leitura fora do tamanho canonico (${NORMALIZED_PAGE_WIDTH}x${NORMALIZED_PAGE_HEIGHT}).`
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
      answers: {
        select: {
          id: true,
        },
      },
    },
  });

  const identifiedPages = scans.filter(
    (scan) => Boolean(scan.answerSheetId)
  ).length;

  const reviewRequiredPages = scans.filter(
    (scan) =>
      scan.status === AnswerSheetScanStatus.DUPLICATE ||
      scan.status === AnswerSheetScanStatus.FAILED
  ).length;

  const processedPages = scans.filter(
    (scan) =>
      scan.status === AnswerSheetScanStatus.PROCESSED ||
      scan.status === AnswerSheetScanStatus.CONFIRMED
  ).length;

  await tx.answerSheetScanBatch.update({
    where: {
      id: batchId,
    },
    data: {
      identifiedPages,
      processedPages,
      reviewRequiredPages,
      status: ScanBatchStatus.PROCESSING,
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
              id: true,
              name: true,
            },
          },
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
        },
      },
    },
  });

  if (!scan) {
    throw new Error("Pagina digitalizada nao encontrada.");
  }

  if (!scan.answerSheetId || !scan.answerSheet) {
    throw new Error(
      "Nao foi possivel associar esta pagina a uma folha de respostas."
    );
  }

  /*
   * Guardamos referências já validadas como não nulas.
   *
   * Isso também evita que o TypeScript perca o narrowing dentro
   * do callback assíncrono do Prisma.
   */
  const answerSheetId = scan.answerSheetId;
  const answerSheet = scan.answerSheet;

  if (!scan.normalizedImageKey) {
    throw new Error(
      "A imagem tecnica necessaria para a leitura desta pagina nao esta disponivel."
    );
  }

  const normalizedImageKey = scan.normalizedImageKey;

  const studentId = answerSheet.student.id;
  const studentName = answerSheet.student.name;

  const exam = answerSheet.examApplication.exam;
  const examId = exam.id;
  const totalQuestions = exam.totalQuestions;

  const pngBytes = await readNormalizedScanImage(
    normalizedImageKey
  );

  const imageData = await imageDataFromPngBytes(
    new Uint8Array(pngBytes)
  );

  const readings = analyzeAnswerSheetImage({
    imageData,
    totalQuestions,
  });

  /*
   * Qualquer página cuja leitura óptica tenha sido realizada
   * corretamente é considerada processada.
   *
   * BLANK, MULTIPLE e UNCERTAIN não bloqueiam mais o fluxo.
   */
  const nextScanStatus =
    AnswerSheetScanStatus.PROCESSED;

  const allowedQuestions = Array.from(
    { length: totalQuestions },
    (_, index) => index + 1
  );

  const now = new Date();

  const result = await prisma.$transaction(
    async (tx) => {
      /*
       * ============================================================
       * 1. PRESERVAR DECISÕES HUMANAS JÁ REGISTRADAS
       * ============================================================
       */
      const existingDetectedAnswers =
        await tx.detectedAnswer.findMany({
          where: {
            answerSheetScanId: scan.id,
          },
          select: {
            reviewed: true,
            finalAnswer: true,
          },
        });

      const hasExplicitHumanOpticalDecision =
        existingDetectedAnswers.some(
          (answer) =>
            answer.reviewed ||
            answer.finalAnswer !== null
        );

      if (hasExplicitHumanOpticalDecision) {
        throw new Error(
          "Esta folha possui uma decisao humana registrada e nao sera sobrescrita automaticamente."
        );
      }

      /*
       * ============================================================
       * 2. REMOVER LEITURAS FORA DO INTERVALO DO SIMULADO
       * ============================================================
       */
      await tx.detectedAnswer.deleteMany({
        where: {
          answerSheetScanId: scan.id,
          question: {
            notIn: allowedQuestions,
          },
        },
      });

      /*
       * ============================================================
       * 3. PERSISTIR EVIDÊNCIA ÓPTICA
       * ============================================================
       */
      for (const reading of readings) {
        const data =
          buildDetectedAnswerData(reading);

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

      /*
       * ============================================================
       * 4. CRIAR OU LOCALIZAR O RESULTADO OFICIAL
       * ============================================================
       */
      const examResult =
        await tx.examResult.upsert({
          where: {
            studentId_examId: {
              studentId,
              examId,
            },
          },
          update: {},
          create: {
            studentId,
            examId,
          },
          select: {
            id: true,
          },
        });

      /*
       * Remove respostas oficiais que estejam fora do número atual
       * de questões do simulado.
       */
      await tx.studentAnswer.deleteMany({
        where: {
          examResultId: examResult.id,
          question: {
            notIn: allowedQuestions,
          },
        },
      });

      /*
       * ============================================================
       * 5. PERSISTIR AS RESPOSTAS OFICIAIS
       * ============================================================
       *
       * DETECTED:
       *   alternativa detectada é persistida.
       *
       * UNCERTAIN:
       *   a melhor alternativa escolhida pelo algoritmo é persistida.
       *
       * BLANK:
       *   null.
       *
       * MULTIPLE:
       *   null.
       */
      for (const reading of readings) {
        await tx.studentAnswer.upsert({
          where: {
            examResultId_question: {
              examResultId: examResult.id,
              question: reading.question,
            },
          },
          update: {
            answer: reading.detectedAnswer,
          },
          create: {
            examResultId: examResult.id,
            question: reading.question,
            answer: reading.detectedAnswer,
          },
        });
      }

      /*
       * ============================================================
       * 6. MARCAR A PÁGINA COMO PROCESSADA
       * ============================================================
       */
      await tx.answerSheetScan.update({
        where: {
          id: scan.id,
        },
        data: {
          status: nextScanStatus,
          processedAt: now,
        },
      });

      /*
       * ============================================================
       * 7. MARCAR A FOLHA COMO CORRIGIDA
       * ============================================================
       */
      await tx.answerSheet.update({
        where: {
          id: answerSheetId,
        },
        data: {
          status: AnswerSheetStatus.CORRECTED,
          scannedAt:
            answerSheet.scannedAt ?? now,
          correctedAt: now,
        },
      });

      /*
       * ============================================================
       * 8. ATUALIZAR CONTADORES PARCIAIS DO LOTE
       * ============================================================
       */
      await updateBatchCounters(
        tx,
        scan.scanBatchId
      );

      const persistedAnswers =
        await tx.detectedAnswer.count({
          where: {
            answerSheetScanId: scan.id,
          },
        });

      const persistedStudentAnswers =
        await tx.studentAnswer.count({
          where: {
            examResultId: examResult.id,
          },
        });

      return {
        persistedAnswers,
        persistedStudentAnswers,
      };
    }
  );

  return {
    scanId: scan.id,
    batchId: scan.scanBatchId,
    pageNumber: scan.pageNumber,
    studentName,
    totalQuestions,

    persistedAnswers:
      result.persistedAnswers,

    persistedStudentAnswers:
      result.persistedStudentAnswers,

    detected: readings.filter(
      (reading) =>
        reading.detectionStatus ===
        DetectedAnswerStatus.DETECTED
    ).length,

    blank: readings.filter(
      (reading) =>
        reading.detectionStatus ===
        DetectedAnswerStatus.BLANK
    ).length,

    multiple: readings.filter(
      (reading) =>
        reading.detectionStatus ===
        DetectedAnswerStatus.MULTIPLE
    ).length,

    uncertain: readings.filter(
      (reading) =>
        reading.detectionStatus ===
        DetectedAnswerStatus.UNCERTAIN
    ).length,

    status: "PROCESSED",
  };
}