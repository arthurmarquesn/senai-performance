import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createQuestionReviewCropPng } from "@/lib/answer-sheet-review/crop";

export async function GET(
  _request: Request,
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
    return new NextResponse("Unauthorized", {
      status: 401,
    });
  }

  const { id, scanId, question } = await params;

  try {
    const png = await createQuestionReviewCropPng({
      examId: id,
      scanId,
      question: Number(question),
    });

    return new NextResponse(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel gerar o recorte.",
      },
      {
        status: 404,
      }
    );
  }
}
