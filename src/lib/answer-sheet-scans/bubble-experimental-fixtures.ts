import {
  createCanvas,
  ImageData,
  type Canvas,
} from "@napi-rs/canvas";

import { ANSWER_SHEET_ALTERNATIVES } from "@/lib/answer-sheet-pdf/layout";
import type { AnswerSheetAlternative } from "@/lib/answer-sheet-pdf/types";
import {
  analyzeQuestionOneBubbles,
  getNormalizedBubbleGeometry,
  type BubbleFillMetrics,
} from "@/lib/answer-sheet-scans/bubble-calibration";

export type ExperimentalFixtureCategory =
  | "EMPTY"
  | "EMPTY_GRAY"
  | "EMPTY_BRIGHTNESS"
  | "EMPTY_NOISE"
  | "EMPTY_BLUR"
  | "EMPTY_SPOTS"
  | "MARKED_STRONG_BLACK"
  | "MARKED_STRONG_BLUE"
  | "MARKED_MEDIUM_BLACK"
  | "MARKED_MEDIUM_BLUE"
  | "MARKED_WEAK"
  | "PARTIAL"
  | "IRREGULAR"
  | "WHITE_GAPS"
  | "SCRIBBLE"
  | "CROOKED_LINE"
  | "OFF_CENTER"
  | "CENTER_ONLY"
  | "SMALL_MARK"
  | "NEAR_FULL"
  | "TOUCH_CONTOUR"
  | "MULTIPLE_STRONG"
  | "ERASURE"
  | "EXTERNAL_NEARBY";

export type ExperimentalExpectedResult =
  | { kind: "BLANK" }
  | { kind: "DETECTED"; alternative: AnswerSheetAlternative }
  | { kind: "MULTIPLE" }
  | { kind: "UNCERTAIN" };

export type QuestionOneSyntheticFixtureDescriptor = {
  id: string;
  split: "calibration" | "validation";
  category: ExperimentalFixtureCategory;
  targetAlternative: AnswerSheetAlternative | null;
  markedAlternatives: AnswerSheetAlternative[];
  expected: ExperimentalExpectedResult;
  seed: number;
};

export type QuestionOneSyntheticFixture = QuestionOneSyntheticFixtureDescriptor & {
  imageData: ImageData;
};

export type ExperimentalDecision =
  | { kind: "BLANK"; top1: RankedBubble; top2: RankedBubble; margin: number }
  | {
      kind: "DETECTED";
      alternative: AnswerSheetAlternative;
      top1: RankedBubble;
      top2: RankedBubble;
      margin: number;
    }
  | { kind: "MULTIPLE"; top1: RankedBubble; top2: RankedBubble; margin: number }
  | { kind: "UNCERTAIN"; top1: RankedBubble; top2: RankedBubble; margin: number };

export type RankedBubble = {
  alternative: AnswerSheetAlternative;
  score: number;
  meanIntensity: number;
  backgroundIntensity: number;
  darkRatio: number;
};

export type ExperimentalThresholds = {
  blankThreshold: number;
  detectedThreshold: number;
  marginThreshold: number;
  multipleThreshold: number;
  coverageThreshold: number;
  blankCalibrationMax: number;
  strongCalibrationMin: number;
  strongMarginP05: number;
  clearCoverageP05: number;
};

export type FixtureEvaluation = {
  fixture: QuestionOneSyntheticFixtureDescriptor;
  metrics: BubbleFillMetrics[];
  ranking: RankedBubble[];
  decision: ExperimentalDecision;
};

const DEFAULT_VARIANTS_PER_CATEGORY = 8;
const QUESTION = 1;
const STRONG_CATEGORIES = [
  "MARKED_STRONG_BLACK",
  "MARKED_STRONG_BLUE",
] satisfies ExperimentalFixtureCategory[];
const BLANK_CATEGORIES = [
  "EMPTY",
  "EMPTY_GRAY",
  "EMPTY_BRIGHTNESS",
  "EMPTY_NOISE",
  "EMPTY_BLUR",
  "EMPTY_SPOTS",
] satisfies ExperimentalFixtureCategory[];

type Random = () => number;

function createSeededRandom(seed: number): Random {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function imageDataToCanvas(imageData: ImageData): Canvas {
  const canvas = createCanvas(imageData.width, imageData.height);
  const context = canvas.getContext("2d");
  const copy = context.createImageData(imageData.width, imageData.height);

  copy.data.set(imageData.data);
  context.putImageData(copy, 0, 0);

  return canvas;
}

function randomBetween(random: Random, min: number, max: number) {
  return min + (max - min) * random();
}

function applyPixelTransform(
  imageData: ImageData,
  transform: (red: number, green: number, blue: number, random: Random) => number[],
  random: Random
) {
  const data = new Uint8ClampedArray(imageData.data);

  for (let index = 0; index < data.length; index += 4) {
    const [red, green, blue] = transform(
      data[index],
      data[index + 1],
      data[index + 2],
      random
    );

    data[index] = red;
    data[index + 1] = green;
    data[index + 2] = blue;
  }

  return new ImageData(data, imageData.width, imageData.height);
}

function cloneImageData(imageData: ImageData) {
  return new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
}

function blendPixel(
  data: Uint8ClampedArray,
  index: number,
  color: readonly [number, number, number],
  alpha: number
) {
  data[index] = data[index] * (1 - alpha) + color[0] * alpha;
  data[index + 1] = data[index + 1] * (1 - alpha) + color[1] * alpha;
  data[index + 2] = data[index + 2] * (1 - alpha) + color[2] * alpha;
}

function spatialNoise(x: number, y: number, seed: number) {
  let value = Math.imul(x + 1013, 374761393) ^ Math.imul(y + 9176, 668265263);
  value = Math.imul(value ^ seed, 1274126177);
  value ^= value >>> 16;

  return (value >>> 0) / 4294967296;
}

function stripeHit(x: number, y: number, seed: number, spacing: number, width: number) {
  const angle = ((seed % 360) * Math.PI) / 180;
  const projected = x * Math.cos(angle) + y * Math.sin(angle) + seed * 0.31;
  const position = ((projected % spacing) + spacing) % spacing;

  return position < width || position > spacing - width;
}

function blurImageData(imageData: ImageData) {
  const output = new Uint8ClampedArray(imageData.data);
  const source = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const outputIndex = (y * width + x) * 4;

      for (let channel = 0; channel < 3; channel++) {
        let sum = 0;

        for (let yy = -1; yy <= 1; yy++) {
          for (let xx = -1; xx <= 1; xx++) {
            sum += source[((y + yy) * width + x + xx) * 4 + channel];
          }
        }

        output[outputIndex + channel] = sum / 9;
      }
    }
  }

  return new ImageData(output, width, height);
}

function drawDirectSpot({
  imageData,
  centerX,
  centerY,
  radius,
  color,
  alpha,
}: {
  imageData: ImageData;
  centerX: number;
  centerY: number;
  radius: number;
  color: readonly [number, number, number];
  alpha: number;
}) {
  const left = Math.max(0, Math.floor(centerX - radius));
  const right = Math.min(imageData.width - 1, Math.ceil(centerX + radius));
  const top = Math.max(0, Math.floor(centerY - radius));
  const bottom = Math.min(imageData.height - 1, Math.ceil(centerY + radius));
  const radiusSquared = radius * radius;

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const dx = x + 0.5 - centerX;
      const dy = y + 0.5 - centerY;

      if (dx * dx + dy * dy > radiusSquared) {
        continue;
      }

      blendPixel(imageData.data, (y * imageData.width + x) * 4, color, alpha);
    }
  }
}

function applyEmptyVariant(
  baseImage: ImageData,
  category: ExperimentalFixtureCategory,
  seed: number
) {
  const random = createSeededRandom(seed);

  if (category === "EMPTY") {
    return cloneImageData(baseImage);
  }

  if (category === "EMPTY_GRAY") {
    const target = randomBetween(random, 238, 248);

    return applyPixelTransform(
      baseImage,
      (red, green, blue) => [
        red * 0.3 + target * 0.7,
        green * 0.3 + target * 0.7,
        blue * 0.3 + target * 0.7,
      ],
      random
    );
  }

  if (category === "EMPTY_BRIGHTNESS") {
    const delta = randomBetween(random, -10, 6);

    return applyPixelTransform(
      baseImage,
      (red, green, blue) => [red + delta, green + delta, blue + delta],
      random
    );
  }

  if (category === "EMPTY_NOISE") {
    return applyPixelTransform(
      baseImage,
      (red, green, blue, localRandom) => {
        const noise = randomBetween(localRandom, -7, 7);

        return [red + noise, green + noise, blue + noise];
      },
      random
    );
  }

  if (category === "EMPTY_BLUR") {
    return blurImageData(baseImage);
  }

  if (category === "EMPTY_SPOTS") {
    const imageData = cloneImageData(baseImage);

    for (let index = 0; index < 10; index++) {
      const x = randomBetween(random, 210, 590);
      const y = randomBetween(random, 635, 742);
      const radius = randomBetween(random, 1.1, 2.6);

      drawDirectSpot({
        imageData,
        centerX: x,
        centerY: y,
        radius,
        color: [80, 80, 80],
        alpha: 0.16,
      });
    }

    return imageData;
  }

  return cloneImageData(baseImage);
}

function expectedForCategory(
  category: ExperimentalFixtureCategory,
  alternative: AnswerSheetAlternative
): ExperimentalExpectedResult {
  if (BLANK_CATEGORIES.includes(category as (typeof BLANK_CATEGORIES)[number])) {
    return { kind: "BLANK" };
  }

  if (category === "MULTIPLE_STRONG") {
    return { kind: "MULTIPLE" };
  }

  if (
    category === "MARKED_STRONG_BLACK" ||
    category === "MARKED_STRONG_BLUE" ||
    category === "MARKED_MEDIUM_BLACK" ||
    category === "MARKED_MEDIUM_BLUE" ||
    category === "NEAR_FULL" ||
    category === "TOUCH_CONTOUR" ||
    category === "WHITE_GAPS"
  ) {
    return {
      kind: "DETECTED",
      alternative,
    };
  }

  if (category === "EXTERNAL_NEARBY") {
    return { kind: "BLANK" };
  }

  return { kind: "UNCERTAIN" };
}

function categoriesForGeneration() {
  return [
    "EMPTY",
    "EMPTY_GRAY",
    "EMPTY_BRIGHTNESS",
    "EMPTY_NOISE",
    "EMPTY_BLUR",
    "EMPTY_SPOTS",
    "MARKED_STRONG_BLACK",
    "MARKED_STRONG_BLUE",
    "MARKED_MEDIUM_BLACK",
    "MARKED_MEDIUM_BLUE",
    "MARKED_WEAK",
    "PARTIAL",
    "IRREGULAR",
    "WHITE_GAPS",
    "SCRIBBLE",
    "CROOKED_LINE",
    "OFF_CENTER",
    "CENTER_ONLY",
    "SMALL_MARK",
    "NEAR_FULL",
    "TOUCH_CONTOUR",
    "MULTIPLE_STRONG",
    "ERASURE",
    "EXTERNAL_NEARBY",
  ] satisfies ExperimentalFixtureCategory[];
}

function drawSyntheticMarkOnImageData({
  imageData,
  totalQuestions,
  alternative,
  category,
  seed,
}: {
  imageData: ImageData;
  totalQuestions: number;
  alternative: AnswerSheetAlternative;
  category: ExperimentalFixtureCategory;
  seed: number;
}) {
  const bubble = getNormalizedBubbleGeometry({
    question: QUESTION,
    totalQuestions,
    alternative,
  });
  const random = createSeededRandom(seed);
  const black: [number, number, number] =
    category === "MARKED_MEDIUM_BLACK" ? [66, 66, 66] : [18, 18, 18];
  const blue: [number, number, number] =
    category === "MARKED_MEDIUM_BLUE" ? [58, 88, 168] : [16, 57, 150];
  const color =
    category.includes("BLUE") || (random() > 0.5 && !category.includes("BLACK"))
      ? blue
      : black;
  let centerX = bubble.centerX;
  let centerY = bubble.centerY;
  let radius = bubble.measurementRadius;
  let coverage = 0.7;
  let alpha = 0.8;
  let stripeWidth = 1.7;
  let spacing = 6.2;
  let allowOutsideMeasurement = false;
  let whitenGaps = false;
  let lineOnly = false;
  let lineWidth = 3.4;

  if (category === "MARKED_STRONG_BLACK" || category === "MARKED_STRONG_BLUE") {
    coverage = 0.86;
    alpha = 0.9;
    radius = bubble.measurementRadius * 1.08;
  } else if (
    category === "MARKED_MEDIUM_BLACK" ||
    category === "MARKED_MEDIUM_BLUE"
  ) {
    coverage = 0.58;
    alpha = 0.64;
    radius = bubble.measurementRadius;
  } else if (category === "MARKED_WEAK") {
    coverage = 0.24;
    alpha = 0.34;
    radius = bubble.measurementRadius * 0.95;
  } else if (category === "PARTIAL") {
    coverage = 0.62;
    alpha = 0.72;
    radius = bubble.measurementRadius * 0.78;
    centerX -= bubble.measurementRadius * 0.28;
  } else if (category === "IRREGULAR") {
    coverage = 0.52;
    alpha = 0.74;
    radius = bubble.measurementRadius;
    whitenGaps = true;
  } else if (category === "WHITE_GAPS") {
    coverage = 0.86;
    alpha = 0.9;
    radius = bubble.measurementRadius * 1.05;
    whitenGaps = true;
  } else if (category === "SCRIBBLE") {
    coverage = 0.35;
    alpha = 0.86;
    radius = bubble.visualRadius * 0.96;
    stripeWidth = 2.8;
    spacing = 8.5;
  } else if (category === "CROOKED_LINE") {
    lineOnly = true;
    alpha = 0.86;
    lineWidth = 3.1;
    radius = bubble.measurementRadius * 1.35;
  } else if (category === "OFF_CENTER") {
    coverage = 0.68;
    alpha = 0.74;
    centerX += bubble.measurementRadius * 0.38;
    centerY -= bubble.measurementRadius * 0.2;
    radius = bubble.measurementRadius;
    allowOutsideMeasurement = true;
  } else if (category === "CENTER_ONLY") {
    coverage = 0.78;
    alpha = 0.78;
    radius = bubble.measurementRadius * 0.55;
  } else if (category === "SMALL_MARK") {
    coverage = 0.78;
    alpha = 0.76;
    radius = bubble.measurementRadius * 0.34;
  } else if (category === "NEAR_FULL") {
    coverage = 0.9;
    alpha = 0.9;
    radius = bubble.visualRadius * 0.82;
  } else if (category === "TOUCH_CONTOUR") {
    coverage = 0.86;
    alpha = 0.88;
    radius = bubble.visualRadius * 1.03;
    allowOutsideMeasurement = true;
  } else if (category === "ERASURE") {
    coverage = 0.56;
    alpha = 0.56;
    radius = bubble.measurementRadius * 0.92;
    whitenGaps = true;
  } else if (category === "EXTERNAL_NEARBY") {
    centerX += bubble.visualRadius * 1.15;
    centerY -= bubble.visualRadius * 0.28;
    radius = bubble.measurementRadius * 0.62;
    coverage = 0.82;
    alpha = 0.82;
    allowOutsideMeasurement = true;
  }

  const boundsRadius = Math.ceil(
    Math.max(radius, bubble.visualRadius) * (allowOutsideMeasurement ? 1.35 : 1.1)
  );
  const left = Math.max(0, Math.floor(centerX - boundsRadius));
  const right = Math.min(imageData.width - 1, Math.ceil(centerX + boundsRadius));
  const top = Math.max(0, Math.floor(centerY - boundsRadius));
  const bottom = Math.min(imageData.height - 1, Math.ceil(centerY + boundsRadius));

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const dx = x + 0.5 - centerX;
      const dy = y + 0.5 - centerY;
      const distance = Math.hypot(dx, dy);
      const lineDistance = Math.abs(dy - dx * 0.18);
      const lineHit = lineOnly && distance <= radius && lineDistance <= lineWidth;
      const circularHit = !lineOnly && distance <= radius;

      if (!lineHit && !circularHit) {
        continue;
      }

      const noise = spatialNoise(x, y, seed);
      const stripe =
        stripeHit(x, y, seed, spacing, stripeWidth) ||
        stripeHit(x, y, seed + 41, spacing * 1.23, stripeWidth * 0.75);

      if (!lineOnly && noise > coverage && !stripe) {
        continue;
      }

      const index = (y * imageData.width + x) * 4;

      if (whitenGaps && spatialNoise(x, y, seed + 207) < 0.16) {
        blendPixel(imageData.data, index, [255, 255, 255], 0.72);
        continue;
      }

      blendPixel(imageData.data, index, color, alpha);
    }
  }
}

export function generateQuestionOneSyntheticFixtureDescriptors({
  variantsPerCategory = DEFAULT_VARIANTS_PER_CATEGORY,
}: {
  variantsPerCategory?: number;
} = {}) {
  const fixtures: QuestionOneSyntheticFixtureDescriptor[] = [];
  let globalIndex = 0;

  for (const category of categoriesForGeneration()) {
    for (let variant = 0; variant < variantsPerCategory; variant++) {
      const split = variant % 2 === 0 ? "calibration" : "validation";
      const alternative =
        ANSWER_SHEET_ALTERNATIVES[
          (variant + globalIndex) % ANSWER_SHEET_ALTERNATIVES.length
        ];
      const seed = 1009 + globalIndex * 97 + variant * 17;

      fixtures.push({
        id: `${category}-${String(variant + 1).padStart(2, "0")}`,
        split,
        category,
        targetAlternative: BLANK_CATEGORIES.includes(
          category as (typeof BLANK_CATEGORIES)[number]
        )
          ? null
          : alternative,
        markedAlternatives:
          category === "MULTIPLE_STRONG"
            ? ["B", "D"]
            : BLANK_CATEGORIES.includes(
                category as (typeof BLANK_CATEGORIES)[number]
              ) || category === "EXTERNAL_NEARBY"
              ? []
              : [alternative],
        expected: expectedForCategory(category, alternative),
        seed,
      });
      globalIndex++;
    }
  }

  return fixtures;
}

export function renderQuestionOneSyntheticFixture({
  baseImage,
  totalQuestions,
  descriptor,
}: {
  baseImage: ImageData;
  totalQuestions: number;
  descriptor: QuestionOneSyntheticFixtureDescriptor;
}): QuestionOneSyntheticFixture {
  let imageData = applyEmptyVariant(baseImage, "EMPTY", descriptor.seed);

  if (
    BLANK_CATEGORIES.includes(
      descriptor.category as (typeof BLANK_CATEGORIES)[number]
    )
  ) {
    imageData = applyEmptyVariant(baseImage, descriptor.category, descriptor.seed);
  } else {
    if (descriptor.category === "MULTIPLE_STRONG") {
      drawSyntheticMarkOnImageData({
        imageData,
        totalQuestions,
        alternative: "B",
        category: "MARKED_STRONG_BLACK",
        seed: descriptor.seed,
      });
      drawSyntheticMarkOnImageData({
        imageData,
        totalQuestions,
        alternative: "D",
        category: "MARKED_STRONG_BLUE",
        seed: descriptor.seed + 11,
      });
    } else if (descriptor.targetAlternative) {
      drawSyntheticMarkOnImageData({
        imageData,
        totalQuestions,
        alternative: descriptor.targetAlternative,
        category: descriptor.category,
        seed: descriptor.seed,
      });
    }
  }

  return {
    ...descriptor,
    imageData,
  };
}

export function generateQuestionOneSyntheticFixtures({
  baseImage,
  totalQuestions,
  variantsPerCategory = DEFAULT_VARIANTS_PER_CATEGORY,
}: {
  baseImage: ImageData;
  totalQuestions: number;
  variantsPerCategory?: number;
}) {
  return generateQuestionOneSyntheticFixtureDescriptors({
    variantsPerCategory,
  }).map((descriptor) =>
    renderQuestionOneSyntheticFixture({
      baseImage,
      totalQuestions,
      descriptor,
    })
  );
}

function rankMetrics(metrics: BubbleFillMetrics[]): RankedBubble[] {
  return metrics
    .map((metric) => ({
      alternative: metric.alternative,
      score: metric.score,
      meanIntensity: metric.meanIntensity,
      backgroundIntensity: metric.backgroundIntensity,
      darkRatio: metric.darkRatio,
    }))
    .sort((left, right) => right.score - left.score);
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * percentileValue;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  if (lower === upper) {
    return sorted[lower];
  }

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function deriveExperimentalThresholds(
  calibration: FixtureEvaluation[]
): ExperimentalThresholds {
  const blankTopScores = calibration
    .filter((evaluation) => evaluation.fixture.expected.kind === "BLANK")
    .map((evaluation) => evaluation.ranking[0].score);
  const strongEvaluations = calibration.filter(
    (evaluation) =>
      evaluation.fixture.expected.kind === "DETECTED" &&
      STRONG_CATEGORIES.includes(
        evaluation.fixture.category as (typeof STRONG_CATEGORIES)[number]
      )
  );
  const strongTopScores = strongEvaluations.map(
    (evaluation) => evaluation.ranking[0].score
  );
  const strongMargins = strongEvaluations.map(
    (evaluation) => evaluation.ranking[0].score - evaluation.ranking[1].score
  );
  const clearDetectedCoverage = calibration
    .filter((evaluation) => evaluation.fixture.expected.kind === "DETECTED")
    .map((evaluation) => evaluation.ranking[0].darkRatio);
  const blankCalibrationMax = Math.max(...blankTopScores);
  const strongCalibrationMin = Math.min(...strongTopScores);
  const separation = Math.max(strongCalibrationMin - blankCalibrationMax, 0.001);
  const strongMarginP05 = percentile(strongMargins, 0.05);
  const clearCoverageP05 = percentile(clearDetectedCoverage, 0.05);

  return {
    blankThreshold: blankCalibrationMax + separation * 0.15,
    detectedThreshold: blankCalibrationMax + separation * 0.35,
    marginThreshold: strongMarginP05 * 0.35,
    multipleThreshold: blankCalibrationMax + separation * 0.35,
    coverageThreshold: clearCoverageP05 * 0.96,
    blankCalibrationMax,
    strongCalibrationMin,
    strongMarginP05,
    clearCoverageP05,
  };
}

export function classifyQuestionOneExperimentally({
  metrics,
  thresholds,
}: {
  metrics: BubbleFillMetrics[];
  thresholds: ExperimentalThresholds;
}): ExperimentalDecision {
  const ranking = rankMetrics(metrics);
  const top1 = ranking[0];
  const top2 = ranking[1];
  const margin = top1.score - top2.score;
  const strongCandidates = ranking.filter(
    (bubble) =>
      bubble.score >= thresholds.multipleThreshold &&
      bubble.darkRatio >= thresholds.coverageThreshold
  );

  if (strongCandidates.length >= 2) {
    return {
      kind: "MULTIPLE",
      top1,
      top2,
      margin,
    };
  }

  if (top1.score <= thresholds.blankThreshold) {
    return {
      kind: "BLANK",
      top1,
      top2,
      margin,
    };
  }

  if (
    top1.score >= thresholds.detectedThreshold &&
    top1.darkRatio >= thresholds.coverageThreshold &&
    margin >= thresholds.marginThreshold
  ) {
    return {
      kind: "DETECTED",
      alternative: top1.alternative,
      top1,
      top2,
      margin,
    };
  }

  return {
    kind: "UNCERTAIN",
    top1,
    top2,
    margin,
  };
}

export function measureQuestionOneFixture({
  fixture,
  totalQuestions,
}: {
  fixture: QuestionOneSyntheticFixture;
  totalQuestions: number;
}) {
  const metrics = analyzeQuestionOneBubbles({
    imageData: fixture.imageData,
    totalQuestions,
  }).bubbles;
  const ranking = rankMetrics(metrics);
  const descriptor: QuestionOneSyntheticFixtureDescriptor = {
    id: fixture.id,
    split: fixture.split,
    category: fixture.category,
    targetAlternative: fixture.targetAlternative,
    markedAlternatives: fixture.markedAlternatives,
    expected: fixture.expected,
    seed: fixture.seed,
  };

  return {
    fixture: descriptor,
    metrics,
    ranking,
  };
}

export function evaluateQuestionOneFixtures({
  fixtures,
  totalQuestions,
}: {
  fixtures: QuestionOneSyntheticFixture[];
  totalQuestions: number;
}) {
  const measured = fixtures.map((fixture) =>
    measureQuestionOneFixture({
      fixture,
      totalQuestions,
    })
  );
  const measuredCalibration = measured.filter(
    (item) => item.fixture.split === "calibration"
  );
  const calibrationThresholds = deriveExperimentalThresholds(
    measuredCalibration.map((item) => ({
      ...item,
      decision: {
        kind: "UNCERTAIN",
        top1: item.ranking[0],
        top2: item.ranking[1],
        margin: item.ranking[0].score - item.ranking[1].score,
      },
    }))
  );
  const evaluations = measured.map((item) => ({
    ...item,
    decision: classifyQuestionOneExperimentally({
      metrics: item.metrics,
      thresholds: calibrationThresholds,
    }),
  }));

  return {
    thresholds: calibrationThresholds,
    evaluations,
  };
}

export function createFixtureDiagnosticPng({
  fixture,
  totalQuestions,
}: {
  fixture: QuestionOneSyntheticFixture;
  totalQuestions: number;
}) {
  const canvas = imageDataToCanvas(fixture.imageData);
  const context = canvas.getContext("2d");

  context.lineWidth = 2;
  context.font = "18px Arial";

  for (const alternative of ANSWER_SHEET_ALTERNATIVES) {
    const bubble = getNormalizedBubbleGeometry({
      question: QUESTION,
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
  }

  const metrics = analyzeQuestionOneBubbles({
    imageData: fixture.imageData,
    totalQuestions,
  }).bubbles;

  context.fillStyle = "#CC0000";
  context.fillText(
    `${fixture.category} ${fixture.id}`,
    210,
    620
  );

  for (const metric of metrics) {
    context.fillText(
      `${metric.alternative}: ${metric.score.toFixed(3)}`,
      metric.centerX - 24,
      metric.centerY + 42
    );
  }

  return new Uint8Array(canvas.encodeSync("png"));
}
