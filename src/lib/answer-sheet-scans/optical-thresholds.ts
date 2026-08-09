import type { ExperimentalThresholds } from "@/lib/answer-sheet-scans/bubble-experimental-fixtures";

// Initial optical-reading calibration from Etapa 5B synthetic fixtures.
// Revisit these values after collecting physical, hand-filled answer sheets.
export const INITIAL_OPTICAL_READING_THRESHOLDS: ExperimentalThresholds = {
  blankThreshold: 0.105082,
  detectedThreshold: 0.236025,
  marginThreshold: 0.232649,
  multipleThreshold: 0.236025,
  coverageThreshold: 0.778742,
  blankCalibrationMax: 0.006875,
  strongCalibrationMin: 0.661588,
  strongMarginP05: 0.664711,
  clearCoverageP05: 0.81119,
};
