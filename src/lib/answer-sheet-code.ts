import "server-only";

import { randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";

import {
  ANSWER_SHEET_ALPHABET,
  ANSWER_SHEET_CODE_LENGTH,
} from "@/lib/answer-sheet-code-format";

export function generateAnswerSheetCode() {
  let token = "";

  for (let index = 0; index < ANSWER_SHEET_CODE_LENGTH; index++) {
    token += ANSWER_SHEET_ALPHABET[randomInt(ANSWER_SHEET_ALPHABET.length)];
  }

  return `PF-${token.slice(0, 4)}-${token.slice(4)}`;
}

export async function generateUniqueAnswerSheetCode(
  tx: Prisma.TransactionClient,
  reservedCodes = new Set<string>()
) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateAnswerSheetCode();

    if (reservedCodes.has(code)) {
      continue;
    }

    const existing = await tx.answerSheet.findUnique({
      where: {
        code,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      reservedCodes.add(code);
      return code;
    }
  }

  throw new Error("Não foi possível gerar um código único para a folha.");
}
