import { createCanvas, loadImage, type ImageData } from "@napi-rs/canvas";

import {
  ANSWER_SHEET_ALTERNATIVES,
  getAnswerBubbleGeometry,
} from "@/lib/answer-sheet-pdf/layout";
import type { AnswerSheetAlternative } from "@/lib/answer-sheet-pdf/types";
import { SCAN_RENDER_SCALE } from "@/lib/answer-sheet-scans/rasterize";
import { readNormalizedScanImage } from "@/lib/answer-sheet-scans/storage";

export const BUBBLE_MEASUREMENT_RADIUS_RATIO = 0.58;
export const BACKGROUND_RING_INNER_RADIUS_RATIO = 1.25;
export const BACKGROUND_RING_OUTER_RADIUS_RATIO = 1.65;
export const LOCAL_DARK_DELTA = 45;

export type NormalizedBubbleGeometry = {
  question: number;
  alternative: AnswerSheetAlternative;
  centerX: number;
  centerY: number;
  visualRadius: number;
  measurementRadius: number;
};

export type BubbleFillMetrics = NormalizedBubbleGeometry & {
  sampledPixels: number;
  backgroundPixels: number;
  backgroundIntensity: number;
  meanIntensity: number;
  darkRatio: number;
  score: number;
};

export type QuestionOneBubbleCalibration = {
  question: 1;
  bubbles: BubbleFillMetrics[];
};

function luminanceAt(imageData: ImageData, x: number, y: number) {
  const index = (y * imageData.width + x) * 4;
  const red = imageData.data[index];
  const green = imageData.data[index + 1];
  const blue = imageData.data[index + 2];

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function brightTrimmedMean(values: number[]) {
  if (values.length === 0) {
    return 255;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const start = Math.floor(sorted.length * 0.35);
  const brightest = sorted.slice(start);

  return average(brightest);
}

function collectCircularRegion({
  imageData,
  centerX,
  centerY,
  innerRadius,
  outerRadius,
}: {
  imageData: ImageData;
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
}) {
  const values: number[] = [];
  const left = Math.max(0, Math.floor(centerX - outerRadius));
  const right = Math.min(imageData.width - 1, Math.ceil(centerX + outerRadius));
  const top = Math.max(0, Math.floor(centerY - outerRadius));
  const bottom = Math.min(imageData.height - 1, Math.ceil(centerY + outerRadius));
  const innerSquared = innerRadius * innerRadius;
  const outerSquared = outerRadius * outerRadius;

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const dx = x + 0.5 - centerX;
      const dy = y + 0.5 - centerY;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared < innerSquared || distanceSquared > outerSquared) {
        continue;
      }

      values.push(luminanceAt(imageData, x, y));
    }
  }

  return values;
}

export function getNormalizedBubbleGeometry({
  question,
  totalQuestions,
  alternative,
}: {
  question: number;
  totalQuestions: number;
  alternative: AnswerSheetAlternative;
}): NormalizedBubbleGeometry {
  const bubble = getAnswerBubbleGeometry(question, totalQuestions, alternative);
  const visualRadius = bubble.radius * SCAN_RENDER_SCALE;

  return {
    question: bubble.question,
    alternative: bubble.alternative,
    centerX: bubble.centerX * SCAN_RENDER_SCALE,
    centerY: bubble.centerY * SCAN_RENDER_SCALE,
    visualRadius,
    measurementRadius: visualRadius * BUBBLE_MEASUREMENT_RADIUS_RATIO,
  };
}

export function measureBubbleFill(
  imageData: ImageData,
  geometry: NormalizedBubbleGeometry
): BubbleFillMetrics {
  const measured = collectCircularRegion({
    imageData,
    centerX: geometry.centerX,
    centerY: geometry.centerY,
    innerRadius: 0,
    outerRadius: geometry.measurementRadius,
  });
  const background = collectCircularRegion({
    imageData,
    centerX: geometry.centerX,
    centerY: geometry.centerY,
    innerRadius: geometry.visualRadius * BACKGROUND_RING_INNER_RADIUS_RATIO,
    outerRadius: geometry.visualRadius * BACKGROUND_RING_OUTER_RADIUS_RATIO,
  });
  const backgroundIntensity = brightTrimmedMean(background);
  const meanIntensity = average(measured);
  const darkThreshold = Math.max(0, backgroundIntensity - LOCAL_DARK_DELTA);
  const darkPixels = measured.filter((value) => value <= darkThreshold).length;
  const darkRatio = darkPixels / measured.length;
  const score = Math.max(
    0,
    (backgroundIntensity - meanIntensity) / Math.max(backgroundIntensity, 1)
  );

  return {
    ...geometry,
    sampledPixels: measured.length,
    backgroundPixels: background.length,
    backgroundIntensity,
    meanIntensity,
    darkRatio,
    score,
  };
}

export function analyzeQuestionOneBubbles({
  imageData,
  totalQuestions,
}: {
  imageData: ImageData;
  totalQuestions: number;
}): QuestionOneBubbleCalibration {
  return {
    question: 1,
    bubbles: ANSWER_SHEET_ALTERNATIVES.map((alternative) =>
      measureBubbleFill(
        imageData,
        getNormalizedBubbleGeometry({
          question: 1,
          totalQuestions,
          alternative,
        })
      )
    ),
  };
}

export async function imageDataFromPngBytes(bytes: Uint8Array) {
  const image = await loadImage(bytes);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");

  context.drawImage(image, 0, 0);

  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export async function analyzeQuestionOneFromNormalizedImageKey({
  normalizedImageKey,
  totalQuestions,
}: {
  normalizedImageKey: string;
  totalQuestions: number;
}) {
  const bytes = await readNormalizedScanImage(normalizedImageKey);
  const imageData = await imageDataFromPngBytes(bytes);

  return analyzeQuestionOneBubbles({
    imageData,
    totalQuestions,
  });
}

export function createQuestionOneDiagnosticPng({
  imageData,
  totalQuestions,
}: {
  imageData: ImageData;
  totalQuestions: number;
}) {
  const canvas = createCanvas(imageData.width, imageData.height);
  const context = canvas.getContext("2d");
  const copy = context.createImageData(imageData.width, imageData.height);

  copy.data.set(imageData.data);
  context.putImageData(copy, 0, 0);
  context.lineWidth = 2;

  for (const alternative of ANSWER_SHEET_ALTERNATIVES) {
    const bubble = getNormalizedBubbleGeometry({
      question: 1,
      totalQuestions,
      alternative,
    });

    context.strokeStyle = "#0066FF";
    context.beginPath();
    context.arc(
      bubble.centerX,
      bubble.centerY,
      bubble.measurementRadius,
      0,
      Math.PI * 2
    );
    context.stroke();

    context.fillStyle = "#FF0000";
    context.fillRect(bubble.centerX - 2, bubble.centerY - 2, 4, 4);
  }

  return new Uint8Array(canvas.encodeSync("png"));
}
