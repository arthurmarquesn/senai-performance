import {
  DetectedAnswerStatus,
  type Alternative,
} from "@prisma/client";

export type EffectiveAnswerInput = {
  reviewed: boolean;
  finalAnswer: Alternative | null;
  detectionStatus: DetectedAnswerStatus;
  detectedAnswer: Alternative | null;
};

export type EffectiveAnswerResolution =
  {
    answer: Alternative | null;
    source: "HUMAN" | "OPTICAL";
  };

export function resolveEffectiveDetectedAnswer(
  answer: EffectiveAnswerInput
): EffectiveAnswerResolution {
  if (answer.reviewed) {
    return {
      answer: answer.finalAnswer,
      source: "HUMAN",
    };
  }

  return {
    answer: answer.detectedAnswer,
    source: "OPTICAL",
  };
}

export function isDetectedAnswerResolved(answer: EffectiveAnswerInput) {
  resolveEffectiveDetectedAnswer(answer);

  return true;
}

export function isReviewRecommended(answer: EffectiveAnswerInput) {
  return (
    !answer.reviewed &&
    (answer.detectionStatus === DetectedAnswerStatus.MULTIPLE ||
      answer.detectionStatus === DetectedAnswerStatus.UNCERTAIN)
  );
}

export function requiresHumanReview(answer: EffectiveAnswerInput) {
  return isReviewRecommended(answer);
}
