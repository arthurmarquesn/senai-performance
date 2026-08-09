import { NextResponse } from "next/server";

import { buildAnswerSheetsPdfFilename } from "@/lib/answer-sheet-pdf/filename";
import { generateAnswerSheetsPdf } from "@/lib/answer-sheet-pdf/generate";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      applicationId: string;
    }>;
  }
) {
  const { id: examId, applicationId } = await params;

  const application = await prisma.examApplication.findFirst({
    where: {
      id: applicationId,
      examId,
    },
    include: {
      exam: {
        select: {
          id: true,
          title: true,
          grade: true,
          totalQuestions: true,
        },
      },
      classRoom: {
        select: {
          id: true,
          name: true,
          grade: true,
        },
      },
      answerSheets: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              number: true,
            },
          },
        },
      },
    },
  });

  if (!application) {
    return NextResponse.json(
      {
        error: "Aplicação de simulado não encontrada.",
      },
      {
        status: 404,
      }
    );
  }

  if (application.answerSheets.length === 0) {
    return NextResponse.json(
      {
        error: "Não existem folhas geradas para esta aplicação.",
      },
      {
        status: 400,
      }
    );
  }

  const sheets = [...application.answerSheets]
    .sort((left, right) => {
      const leftNumber = left.student.number ?? Number.MAX_SAFE_INTEGER;
      const rightNumber = right.student.number ?? Number.MAX_SAFE_INTEGER;

      if (leftNumber !== rightNumber) {
        return leftNumber - rightNumber;
      }

      return left.student.name.localeCompare(right.student.name, "pt-BR");
    })
    .map((sheet) => ({
      code: sheet.code,
      studentName: sheet.student.name,
      studentNumber: sheet.student.number,
    }));

  const pdf = await generateAnswerSheetsPdf({
    examTitle: application.exam.title,
    totalQuestions: application.exam.totalQuestions,
    classRoomName: application.classRoom.name,
    grade: application.classRoom.grade,
    sheets,
  });

  const filename = buildAnswerSheetsPdfFilename(
    application.exam.title,
    application.classRoom.name
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
