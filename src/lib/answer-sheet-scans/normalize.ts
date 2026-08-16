import { createCanvas, type ImageData } from "@napi-rs/canvas";
import {
  AnswerSheetScanStatus,
  ScanBatchStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  computeHomography,
  warpPerspective,
} from "@/lib/answer-sheet-scans/homography";
import {
  InvalidMarkerGeometryError,
  MarkerNotFoundError,
  detectRegistrationMarkers,
} from "@/lib/answer-sheet-scans/marker-detection";
import {
  CANONICAL_MARKERS,
  MARKER_RESIDUAL_TOLERANCE_PX,
  NORMALIZED_PAGE_HEIGHT,
  NORMALIZED_PAGE_WIDTH,
  estimateRotationDegrees,
  markerArray,
} from "@/lib/answer-sheet-scans/normalization-geometry";
import {
  loadScanPdfDocument,
  renderScanPdfPage,
} from "@/lib/answer-sheet-scans/rasterize";
import {
  readOriginalScanPdf,
  saveNormalizedScanImage,
} from "@/lib/answer-sheet-scans/storage";

type ScanNormalizationResult = {
  scanId: string;
  pageNumber: number;
  status: AnswerSheetScanStatus;
  normalizedImageKey: string | null;
  rotationDegrees: number | null;
  residualAverage: number | null;
  residualMax: number | null;
};

type DisposablePdfDocument = {
  destroy?: () => Promise<void> | void;
  cleanup?: () => Promise<void> | void;
};

export type NormalizeScanBatchInput = {
  examId: string;
  examApplicationId: string;
  batchId: string;
};

export type NormalizeScanBatchSummary = {
  batchId: string;
  identifiedPages: number;
  normalizedPages: number;
  reviewRequiredPages: number;
  failedPages: number;
  residualAverage: number | null;
  residualMax: number | null;
  results: ScanNormalizationResult[];
};

function pngFromImageData(imageData: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}) {
  const canvas = createCanvas(
    imageData.width,
    imageData.height
  );

  const context = canvas.getContext("2d");

  const output = context.createImageData(
    imageData.width,
    imageData.height
  );

  output.data.set(imageData.data);

  context.putImageData(output, 0, 0);

  return new Uint8Array(
    canvas.encodeSync("png")
  );
}

async function normalizeScanPage({
  batchId,
  scan,
  imageData,
}: {
  batchId: string;
  scan: {
    id: string;
    pageNumber: number;
  };
  imageData: ImageData;
}): Promise<ScanNormalizationResult> {
  try {
    const detection =
      detectRegistrationMarkers(imageData);

    const alreadyCanonical =
      imageData.width ===
        NORMALIZED_PAGE_WIDTH &&
      imageData.height ===
        NORMALIZED_PAGE_HEIGHT &&
      detection.residualMax <=
        MARKER_RESIDUAL_TOLERANCE_PX;

    const normalized = alreadyCanonical
      ? imageData
      : warpPerspective({
          source: imageData,
          destinationToSource:
            computeHomography(
              markerArray(CANONICAL_MARKERS),
              markerArray(
                detection.markers
              )
            ),
        });

    const normalizedDetection =
      alreadyCanonical
        ? detection
        : detectRegistrationMarkers(
            normalized as ImageData
          );

    if (
      normalizedDetection.residualMax >
      MARKER_RESIDUAL_TOLERANCE_PX
    ) {
      throw new InvalidMarkerGeometryError(
        "Preparacao geometrica fora da tolerancia."
      );
    }

    const pngBytes =
      pngFromImageData(normalized);

    const stored =
      await saveNormalizedScanImage({
        batchId,
        pageNumber: scan.pageNumber,
        bytes: pngBytes,
      });

    const rotationDegrees =
      estimateRotationDegrees(
        detection.markers
      );

    await prisma.answerSheetScan.update({
      where: {
        id: scan.id,
      },
      data: {
        status:
          AnswerSheetScanStatus.IDENTIFIED,

        normalizedImageKey:
          stored.normalizedImageKey,

        sourceImageKey: null,

        alignmentConfidence: null,

        rotationDegrees,
      },
    });

    return {
      scanId: scan.id,
      pageNumber: scan.pageNumber,
      status:
        AnswerSheetScanStatus.IDENTIFIED,
      normalizedImageKey:
        stored.normalizedImageKey,
      rotationDegrees,
      residualAverage:
        normalizedDetection.residualAverage,
      residualMax:
        normalizedDetection.residualMax,
    };
  } catch (error) {
    /*
     * REVIEW_REQUIRED permanece apenas como um status técnico
     * legado.
     *
     * No novo fluxo ele NÃO significa que o professor precisa
     * revisar antes que o restante do lote continue.
     *
     * A página vira uma ocorrência e as demais seguem normalmente.
     */
    const status =
      error instanceof MarkerNotFoundError ||
      error instanceof InvalidMarkerGeometryError
        ? AnswerSheetScanStatus.REVIEW_REQUIRED
        : AnswerSheetScanStatus.FAILED;

    if (
      status ===
      AnswerSheetScanStatus.FAILED
    ) {
      console.error(
        `Erro ao preparar página ${scan.pageNumber}:`,
        error
      );
    }

    await prisma.answerSheetScan.update({
      where: {
        id: scan.id,
      },
      data: {
        status,
        normalizedImageKey: null,
        alignmentConfidence: null,
        rotationDegrees: null,
        processedAt: new Date(),
      },
    });

    return {
      scanId: scan.id,
      pageNumber: scan.pageNumber,
      status,
      normalizedImageKey: null,
      rotationDegrees: null,
      residualAverage: null,
      residualMax: null,
    };
  }
}

async function persistRenderFailure({
  scanId,
  pageNumber,
  error,
}: {
  scanId: string;
  pageNumber: number;
  error: unknown;
}): Promise<ScanNormalizationResult> {
  console.error(
    `Erro ao renderizar página ${pageNumber} para leitura:`,
    error
  );

  await prisma.answerSheetScan.update({
    where: {
      id: scanId,
    },
    data: {
      status:
        AnswerSheetScanStatus.FAILED,
      normalizedImageKey: null,
      alignmentConfidence: null,
      rotationDegrees: null,
      processedAt: new Date(),
    },
  });

  return {
    scanId,
    pageNumber,
    status:
      AnswerSheetScanStatus.FAILED,
    normalizedImageKey: null,
    rotationDegrees: null,
    residualAverage: null,
    residualMax: null,
  };
}

async function updateBatchAfterPreparation(
  batchId: string
) {
  const scans =
    await prisma.answerSheetScan.findMany({
      where: {
        scanBatchId: batchId,
      },
      select: {
        answerSheetId: true,
        status: true,
      },
    });

  /*
   * Uma página continua identificada mesmo que posteriormente
   * ocorra algum problema técnico na preparação da imagem.
   */
  const identifiedPages =
    scans.filter(
      (scan) =>
        Boolean(scan.answerSheetId)
    ).length;

  /*
   * Este campo possui nome legado.
   *
   * Aqui ele representa ocorrências técnicas, e não uma etapa
   * obrigatória de revisão humana.
   */
  const reviewRequiredPages =
    scans.filter(
      (scan) =>
        scan.status ===
          AnswerSheetScanStatus.REVIEW_REQUIRED ||
        scan.status ===
          AnswerSheetScanStatus.DUPLICATE ||
        scan.status ===
          AnswerSheetScanStatus.FAILED
    ).length;

  /*
   * A preparação da imagem é uma operação interna.
   *
   * O processamento do lote ainda não terminou nesse ponto.
   */
  await prisma.answerSheetScanBatch.update({
    where: {
      id: batchId,
    },
    data: {
      identifiedPages,
      reviewRequiredPages,
      status:
        ScanBatchStatus.PROCESSING,
      completedAt: null,
    },
  });
}

async function releasePdfDocument(
  pdf: unknown
) {
  /*
   * Dependendo da build/tipagem usada pelo pdfjs-dist, o objeto
   * retornado pode disponibilizar destroy() ou cleanup() sem que
   * isso esteja declarado na interface TypeScript exposta pelo
   * projeto.
   *
   * Fazemos feature detection em runtime sem acoplar o restante
   * da aplicação a essa diferença de tipagem.
   */
  const disposable =
    pdf as DisposablePdfDocument;

  if (
    typeof disposable.destroy === "function"
  ) {
    await disposable.destroy();
    return;
  }

  if (
    typeof disposable.cleanup === "function"
  ) {
    await disposable.cleanup();
  }
}

export async function normalizeScanBatch(
  input: NormalizeScanBatchInput
): Promise<NormalizeScanBatchSummary> {
  const batch =
    await prisma.answerSheetScanBatch.findFirst({
      where: {
        id: input.batchId,
        examApplicationId:
          input.examApplicationId,
        examApplication: {
          examId: input.examId,
        },
      },
      include: {
        scans: {
          /*
           * Somente páginas cujo QR já permitiu identificar
           * AnswerSheet/aluno seguem para a preparação técnica.
           */
          where: {
            status:
              AnswerSheetScanStatus.IDENTIFIED,
            answerSheetId: {
              not: null,
            },
          },
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
    throw new Error(
      "Lote de digitalizacao nao encontrado."
    );
  }

  if (!batch.sourceFileKey) {
    throw new Error(
      "O PDF original deste lote nao esta disponivel."
    );
  }

  const pdfBytes =
    await readOriginalScanPdf(
      batch.sourceFileKey
    );

  const pdf =
    await loadScanPdfDocument(
      new Uint8Array(pdfBytes)
    );

  const results:
    ScanNormalizationResult[] = [];

  try {
    /*
     * Cada página é independente.
     *
     * Uma falha em uma página NÃO encerra o processamento das
     * páginas seguintes.
     */
    for (const scan of batch.scans) {
      try {
        const imageData =
          await renderScanPdfPage(
            pdf,
            scan.pageNumber
          );

        const result =
          await normalizeScanPage({
            batchId: batch.id,
            scan,
            imageData,
          });

        results.push(result);
      } catch (error) {
        /*
         * Um erro de rasterização também vira apenas uma ocorrência
         * daquela página.
         */
        const result =
          await persistRenderFailure({
            scanId: scan.id,
            pageNumber:
              scan.pageNumber,
            error,
          });

        results.push(result);
      }
    }
  } finally {
    /*
     * A liberação é feita por feature detection porque a tipagem
     * atual do PDFDocumentProxy no projeto não expõe destroy().
     */
    await releasePdfDocument(pdf);
  }

  await updateBatchAfterPreparation(
    batch.id
  );

  const normalizedResults =
    results.filter(
      (result) =>
        result.status ===
          AnswerSheetScanStatus.IDENTIFIED &&
        result.normalizedImageKey !== null
    );

  const residuals =
    normalizedResults
      .map(
        (result) =>
          result.residualAverage
      )
      .filter(
        (value): value is number =>
          value !== null
      );

  const residualMaxValues =
    normalizedResults
      .map(
        (result) =>
          result.residualMax
      )
      .filter(
        (value): value is number =>
          value !== null
      );

  return {
    batchId: batch.id,

    identifiedPages:
      batch.scans.length,

    normalizedPages:
      normalizedResults.length,

    reviewRequiredPages:
      results.filter(
        (result) =>
          result.status ===
          AnswerSheetScanStatus.REVIEW_REQUIRED
      ).length,

    failedPages:
      results.filter(
        (result) =>
          result.status ===
          AnswerSheetScanStatus.FAILED
      ).length,

    residualAverage:
      residuals.length > 0
        ? residuals.reduce(
            (sum, residual) =>
              sum + residual,
            0
          ) / residuals.length
        : null,

    residualMax:
      residualMaxValues.length > 0
        ? Math.max(
            ...residualMaxValues
          )
        : null,

    results,
  };
}

export const NORMALIZED_OUTPUT_SIZE = {
  width: NORMALIZED_PAGE_WIDTH,
  height: NORMALIZED_PAGE_HEIGHT,
};