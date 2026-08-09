import type { ImageData } from "@napi-rs/canvas";
import jsQR from "jsqr";

import {
  isAnswerSheetCode,
  normalizeDetectedAnswerSheetCode,
} from "@/lib/answer-sheet-code-format";

type ScanRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const INVALID_DETECTED_CODE_MAX_LENGTH = 32;

function clampRegion(region: ScanRegion, imageData: ImageData): ScanRegion {
  const left = Math.max(0, Math.min(imageData.width - 1, Math.floor(region.left)));
  const top = Math.max(0, Math.min(imageData.height - 1, Math.floor(region.top)));
  const right = Math.max(left + 1, Math.min(imageData.width, Math.ceil(region.left + region.width)));
  const bottom = Math.max(top + 1, Math.min(imageData.height, Math.ceil(region.top + region.height)));

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

function cropImageData(imageData: ImageData, region: ScanRegion) {
  const cropped = new Uint8ClampedArray(region.width * region.height * 4);

  for (let y = 0; y < region.height; y++) {
    const sourceStart = ((region.top + y) * imageData.width + region.left) * 4;
    const targetStart = y * region.width * 4;
    cropped.set(
      imageData.data.subarray(sourceStart, sourceStart + region.width * 4),
      targetStart
    );
  }

  return {
    data: cropped,
    width: region.width,
    height: region.height,
  };
}

function getScanRegions(imageData: ImageData): ScanRegion[] {
  const { width, height } = imageData;
  const topRightSize = Math.min(width * 0.34, height * 0.24);

  return [
    {
      left: 0,
      top: 0,
      width,
      height,
    },
    {
      left: width - topRightSize - width * 0.02,
      top: height * 0.04,
      width: topRightSize,
      height: topRightSize,
    },
    {
      left: width * 0.55,
      top: 0,
      width: width * 0.45,
      height: height * 0.35,
    },
    {
      left: 0,
      top: 0,
      width: width * 0.5,
      height: height * 0.5,
    },
    {
      left: 0,
      top: height * 0.5,
      width: width * 0.5,
      height: height * 0.5,
    },
    {
      left: width * 0.5,
      top: height * 0.5,
      width: width * 0.5,
      height: height * 0.5,
    },
  ].map((region) => clampRegion(region, imageData));
}

function safeDetectedCode(value: string) {
  return normalizeDetectedAnswerSheetCode(value).slice(
    0,
    INVALID_DETECTED_CODE_MAX_LENGTH
  );
}

export type DecodedQrCandidates = {
  all: string[];
  answerSheetCodes: string[];
};

export function decodeQrCandidates(imageData: ImageData): DecodedQrCandidates {
  const detected = new Set<string>();

  for (const region of getScanRegions(imageData)) {
    const cropped = cropImageData(imageData, region);
    const result = jsQR(cropped.data, cropped.width, cropped.height, {
      inversionAttempts: "attemptBoth",
    });

    if (result?.data) {
      detected.add(safeDetectedCode(result.data));
    }
  }

  const all = [...detected];

  return {
    all,
    answerSheetCodes: all.filter(isAnswerSheetCode),
  };
}
