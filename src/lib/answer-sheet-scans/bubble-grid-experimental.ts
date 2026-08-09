import { createCanvas, ImageData } from "@napi-rs/canvas";

import { ANSWER_SHEET_ALTERNATIVES } from "@/lib/answer-sheet-pdf/layout";
import type { AnswerSheetAlternative } from "@/lib/answer-sheet-pdf/types";
import {
  getNormalizedBubbleGeometry,
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

export type GridMarkStyle = "STRONG_BLACK" | "STRONG_BLUE" | "MEDIUM_BLACK";

export type ExpectedAnswerMap = Map<number, AnswerSheetAlternative>;

export type QuestionGridDecision = {
  question: number;
  metrics: BubbleFillMetrics[];
  decision: ExperimentalDecision;
};

export type FixtureEvaluationSummary = {
  totalQuestions: number;
  correctDetected: number;
  wrongAlternative: number;
  falseDetectedOnBlank: number;
  blankUnexpected: number;
  uncertain: number;
  multiple: number;
  maxSpuriousScore: number;
};

export type GeometryDiagnosticRow = {
  question: number;
  alternatives: Record<AnswerSheetAlternative, { x: number; y: number }>;
};

export type GeometryValidation = {
  rows: GeometryDiagnosticRow[];
  allRegionsInsideImage: boolean;
  allAlternativesOrdered: boolean;
  q20ToQ21Transition: boolean;
  q40ToQ41Transition: boolean;
};

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

export function drawControlledBubbleMark({
  imageData,
  totalQuestions,
  question,
  alternative,
  style,
  seed,
}: {
  imageData: ImageData;
  totalQuestions: number;
  question: number;
  alternative: AnswerSheetAlternative;
  style: GridMarkStyle;
  seed: number;
}) {
  const bubble = getNormalizedBubbleGeometry({
    question,
    totalQuestions,
    alternative,
  });
  const color: readonly [number, number, number] =
    style === "STRONG_BLUE"
      ? [16, 57, 150]
      : style === "MEDIUM_BLACK"
      ? [66, 66, 66]
      : [18, 18, 18];
  const alpha = style === "MEDIUM_BLACK" ? 0.66 : 0.9;
  const coverage = style === "MEDIUM_BLACK" ? 0.68 : 0.88;
  const radius = bubble.measurementRadius * (style === "MEDIUM_BLACK" ? 1 : 1.08);
  const left = Math.max(0, Math.floor(bubble.centerX - radius * 1.15));
  const right = Math.min(imageData.width - 1, Math.ceil(bubble.centerX + radius * 1.15));
  const top = Math.max(0, Math.floor(bubble.centerY - radius * 1.15));
  const bottom = Math.min(imageData.height - 1, Math.ceil(bubble.centerY + radius * 1.15));

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const dx = x + 0.5 - bubble.centerX;
      const dy = y + 0.5 - bubble.centerY;

      if (Math.hypot(dx, dy) > radius) {
        continue;
      }

      const stripe =
        stripeHit(x, y, seed, 6.1, 1.8) ||
        stripeHit(x, y, seed + 41, 7.5, 1.25);

      if (spatialNoise(x, y, seed) > coverage && !stripe) {
        continue;
      }

      blendPixel(imageData.data, (y * imageData.width + x) * 4, color, alpha);
    }
  }
}

export function renderControlledAnswerFixture({
  baseImage,
  totalQuestions,
  answers,
  style,
  seedBase = 9001,
}: {
  baseImage: ImageData;
  totalQuestions: number;
  answers: ExpectedAnswerMap;
  style: GridMarkStyle;
  seedBase?: number;
}) {
  const imageData = cloneImageData(baseImage);

  for (const [question, alternative] of answers) {
    drawControlledBubbleMark({
      imageData,
      totalQuestions,
      question,
      alternative,
      style,
      seed: seedBase + question * 97 + ANSWER_SHEET_ALTERNATIVES.indexOf(alternative),
    });
  }

  return imageData;
}

export function analyzeQuestionBubbles({
  imageData,
  totalQuestions,
  question,
}: {
  imageData: ImageData;
  totalQuestions: number;
  question: number;
}) {
  return ANSWER_SHEET_ALTERNATIVES.map((alternative) =>
    measureBubbleFill(
      imageData,
      getNormalizedBubbleGeometry({
        question,
        totalQuestions,
        alternative,
      })
    )
  );
}

export function classifyAnswerGrid({
  imageData,
  totalQuestions,
  thresholds,
}: {
  imageData: ImageData;
  totalQuestions: number;
  thresholds: ExperimentalThresholds;
}) {
  const decisions: QuestionGridDecision[] = [];

  for (let question = 1; question <= totalQuestions; question++) {
    const metrics = analyzeQuestionBubbles({
      imageData,
      totalQuestions,
      question,
    });

    decisions.push({
      question,
      metrics,
      decision: classifyQuestionOneExperimentally({
        metrics,
        thresholds,
      }),
    });
  }

  return decisions;
}

export function evaluateAnswerGridFixture({
  decisions,
  expectedAnswers,
  totalQuestions,
}: {
  decisions: QuestionGridDecision[];
  expectedAnswers: ExpectedAnswerMap;
  totalQuestions: number;
}): FixtureEvaluationSummary {
  let correctDetected = 0;
  let wrongAlternative = 0;
  let falseDetectedOnBlank = 0;
  let blankUnexpected = 0;
  let uncertain = 0;
  let multiple = 0;
  let maxSpuriousScore = 0;

  for (const result of decisions) {
    const expected = expectedAnswers.get(result.question) ?? null;

    for (const metric of result.metrics) {
      if (expected !== metric.alternative) {
        maxSpuriousScore = Math.max(maxSpuriousScore, metric.score);
      }
    }

    if (result.decision.kind === "UNCERTAIN") {
      uncertain++;
      continue;
    }

    if (result.decision.kind === "MULTIPLE") {
      multiple++;

      if (!expected) {
        falseDetectedOnBlank++;
      }

      continue;
    }

    if (result.decision.kind === "BLANK") {
      if (expected) {
        blankUnexpected++;
      }

      continue;
    }

    if (!expected) {
      falseDetectedOnBlank++;
    } else if (result.decision.alternative === expected) {
      correctDetected++;
    } else {
      wrongAlternative++;
    }
  }

  return {
    totalQuestions,
    correctDetected,
    wrongAlternative,
    falseDetectedOnBlank,
    blankUnexpected,
    uncertain,
    multiple,
    maxSpuriousScore,
  };
}

export function createCyclicAnswers(totalQuestions: number): ExpectedAnswerMap {
  const answers: ExpectedAnswerMap = new Map();

  for (let question = 1; question <= totalQuestions; question++) {
    answers.set(
      question,
      ANSWER_SHEET_ALTERNATIVES[(question - 1) % ANSWER_SHEET_ALTERNATIVES.length]
    );
  }

  return answers;
}

export function createSingleAlternativeAnswers(
  totalQuestions: number,
  alternative: AnswerSheetAlternative
): ExpectedAnswerMap {
  const answers: ExpectedAnswerMap = new Map();

  for (let question = 1; question <= totalQuestions; question++) {
    answers.set(question, alternative);
  }

  return answers;
}

export function createBoundaryAnswers(): ExpectedAnswerMap {
  return new Map([
    [19, "A"],
    [20, "B"],
    [21, "C"],
    [22, "D"],
    [39, "E"],
    [40, "A"],
    [41, "B"],
    [42, "C"],
  ]);
}

export function createSingleQuestionAnswer(
  question: number,
  alternative: AnswerSheetAlternative
): ExpectedAnswerMap {
  return new Map([[question, alternative]]);
}

export function validateAnswerGridGeometry(totalQuestions: number): GeometryValidation {
  const rows: GeometryDiagnosticRow[] = [];
  let allRegionsInsideImage = true;
  let allAlternativesOrdered = true;

  for (let question = 1; question <= totalQuestions; question++) {
    const alternatives = Object.fromEntries(
      ANSWER_SHEET_ALTERNATIVES.map((alternative) => {
        const bubble = getNormalizedBubbleGeometry({
          question,
          totalQuestions,
          alternative,
        });
        const inside =
          bubble.centerX - bubble.visualRadius >= 0 &&
          bubble.centerX + bubble.visualRadius <= NORMALIZED_PAGE_WIDTH &&
          bubble.centerY - bubble.visualRadius >= 0 &&
          bubble.centerY + bubble.visualRadius <= NORMALIZED_PAGE_HEIGHT;

        if (!inside) {
          allRegionsInsideImage = false;
        }

        return [
          alternative,
          {
            x: bubble.centerX,
            y: bubble.centerY,
          },
        ];
      })
    ) as Record<AnswerSheetAlternative, { x: number; y: number }>;

    for (let index = 1; index < ANSWER_SHEET_ALTERNATIVES.length; index++) {
      const previous = alternatives[ANSWER_SHEET_ALTERNATIVES[index - 1]];
      const current = alternatives[ANSWER_SHEET_ALTERNATIVES[index]];

      if (current.x <= previous.x || Math.abs(current.y - previous.y) > 0.001) {
        allAlternativesOrdered = false;
      }
    }

    rows.push({
      question,
      alternatives,
    });
  }

  const q20 = rows[19].alternatives.A;
  const q21 = rows[20].alternatives.A;
  const q40 = rows[39].alternatives.A;
  const q41 = rows[40].alternatives.A;

  return {
    rows,
    allRegionsInsideImage,
    allAlternativesOrdered,
    q20ToQ21Transition: q21.x > q20.x && q21.y < q20.y,
    q40ToQ41Transition: q41.x > q40.x && q41.y < q40.y,
  };
}

export function createGridDiagnosticPng({
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
  context.lineWidth = 1.4;
  context.font = "10px Arial";

  for (let question = 1; question <= totalQuestions; question++) {
    for (const alternative of ANSWER_SHEET_ALTERNATIVES) {
      const bubble = getNormalizedBubbleGeometry({
        question,
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

      context.fillStyle = "#CC0000";
      context.fillText(
        `${question}${alternative}`,
        bubble.centerX - 9,
        bubble.centerY - bubble.measurementRadius - 3
      );
    }
  }

  return new Uint8Array(canvas.encodeSync("png"));
}
