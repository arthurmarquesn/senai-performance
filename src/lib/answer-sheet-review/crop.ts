import "server-only";

import { createCanvas } from "@napi-rs/canvas";

import { ANSWER_SHEET_ALTERNATIVES } from "@/lib/answer-sheet-pdf/layout";
import {
  getNormalizedBubbleGeometry,
  imageDataFromPngBytes,
} from "@/lib/answer-sheet-scans/bubble-calibration";
import { readNormalizedScanImage } from "@/lib/answer-sheet-scans/storage";
import { prisma } from "@/lib/prisma";

export async function createQuestionReviewCropPng({
  examId,
  scanId,
  question,
}: {
  examId: string;
  scanId: string;
  question: number;
}) {
  if (!Number.isInteger(question) || question < 1 || question > 60) {
    throw new Error("Questao invalida.");
  }

  const scan = await prisma.answerSheetScan.findFirst({
    where: {
      id: scanId,
      answerSheet: {
        examApplication: {
          examId,
        },
      },
    },
    select: {
      normalizedImageKey: true,
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

  if (!scan?.answerSheet || !scan.normalizedImageKey) {
    throw new Error("Imagem normalizada nao encontrada.");
  }

  const totalQuestions = scan.answerSheet.examApplication.exam.totalQuestions;
  const bytes = await readNormalizedScanImage(scan.normalizedImageKey);
  const imageData = await imageDataFromPngBytes(new Uint8Array(bytes));
  const bubbles = ANSWER_SHEET_ALTERNATIVES.map((alternative) =>
    getNormalizedBubbleGeometry({
      question,
      totalQuestions,
      alternative,
    })
  );
  const minX = Math.min(...bubbles.map((bubble) => bubble.centerX));
  const maxX = Math.max(...bubbles.map((bubble) => bubble.centerX));
  const minY = Math.min(...bubbles.map((bubble) => bubble.centerY));
  const maxY = Math.max(...bubbles.map((bubble) => bubble.centerY));
  const visualRadius = Math.max(...bubbles.map((bubble) => bubble.visualRadius));
  const left = Math.max(0, Math.floor(minX - visualRadius - 90));
  const top = Math.max(0, Math.floor(minY - visualRadius - 24));
  const right = Math.min(imageData.width, Math.ceil(maxX + visualRadius + 36));
  const bottom = Math.min(imageData.height, Math.ceil(maxY + visualRadius + 24));
  const width = right - left;
  const height = bottom - top;
  const source = createCanvas(imageData.width, imageData.height);
  const sourceContext = source.getContext("2d");
  const copy = sourceContext.createImageData(imageData.width, imageData.height);

  copy.data.set(imageData.data);
  sourceContext.putImageData(copy, 0, 0);

  const crop = createCanvas(width, height);
  const cropContext = crop.getContext("2d");

  cropContext.fillStyle = "#FFFFFF";
  cropContext.fillRect(0, 0, width, height);
  cropContext.drawImage(source, left, top, width, height, 0, 0, width, height);

  return new Uint8Array(crop.encodeSync("png"));
}
