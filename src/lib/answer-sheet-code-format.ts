export const ANSWER_SHEET_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ANSWER_SHEET_CODE_LENGTH = 8;

const answerSheetCodePattern = new RegExp(
  `^PF-[${ANSWER_SHEET_ALPHABET}]{4}-[${ANSWER_SHEET_ALPHABET}]{4}$`
);

export function isAnswerSheetCode(value: string) {
  return answerSheetCodePattern.test(value);
}

export function normalizeDetectedAnswerSheetCode(value: string) {
  return value.trim().toUpperCase();
}
