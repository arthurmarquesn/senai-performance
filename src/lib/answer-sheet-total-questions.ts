export const MAX_SUPPORTED_OPTICAL_QUESTIONS = 60;

export function assertSupportedOpticalTotalQuestions(totalQuestions: number) {
  if (
    !Number.isInteger(totalQuestions) ||
    totalQuestions < 1 ||
    totalQuestions > MAX_SUPPORTED_OPTICAL_QUESTIONS
  ) {
    throw new Error(
      `A leitura optica atual suporta de 1 a ${MAX_SUPPORTED_OPTICAL_QUESTIONS} questoes por folha.`
    );
  }
}
