import { Alternative } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { reviewAnswerQuestion } from "@/lib/answer-sheet-review/mutations";

const alternatives = new Set<string>(Object.values(Alternative));

function parseFinalAnswer(value: unknown) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string" || !alternatives.has(value)) {
    throw new Error("Alternativa invalida.");
  }

  return Alternative[value as keyof typeof Alternative];
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      scanId: string;
      question: string;
    }>;
  }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        message: "Sessao expirada. Faca login novamente.",
      },
      {
        status: 401,
      }
    );
  }

  const { id, scanId, question } = await params;
  const body = await request.json().catch(() => null);

  try {
    const finalAnswer = parseFinalAnswer(body?.finalAnswer);
    const questionNumber = Number(question);

    if (!Number.isInteger(questionNumber)) {
      throw new Error("Questao invalida.");
    }

    const result = await reviewAnswerQuestion({
      examId: id,
      scanId,
      question: questionNumber,
      finalAnswer,
    });

    return NextResponse.json({
      status: "success",
      question: result.question,
      finalAnswer: result.finalAnswer,
      message:
        result.finalAnswer === null
          ? `Q${result.question} confirmada em branco.`
          : `Q${result.question} confirmada como ${result.finalAnswer}.`,
      preserved: result.preserved,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel revisar a questao.",
      },
      {
        status: 400,
      }
    );
  }
}
