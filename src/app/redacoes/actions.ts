"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type SavedEssayCorrection = {
  id: string;
  studentId: string;
  examId: string | null;
  competency1: number;
  competency2: number;
  competency3: number;
  competency4: number;
  competency5: number;
  totalScore: number;
  comment: string | null;
};

export type SaveEssayCorrectionState = {
  status: "idle" | "success" | "error";
  message?: string;
  correction?: SavedEssayCorrection;
};

export async function saveEssayCorrection(
  _previousState: SaveEssayCorrectionState,
  formData: FormData
): Promise<SaveEssayCorrectionState> {
  const studentId = formData.get("studentId") as string;
  const examIdValue = formData.get("examId") as string;

  const competency1 = Number(formData.get("competency1"));
  const competency2 = Number(formData.get("competency2"));
  const competency3 = Number(formData.get("competency3"));
  const competency4 = Number(formData.get("competency4"));
  const competency5 = Number(formData.get("competency5"));

  const comment = formData.get("comment") as string;

  const examId = examIdValue ? examIdValue : null;

  if (!studentId) {
    return {
      status: "error",
      message: "Selecione um aluno.",
    };
  }

  const totalScore =
    competency1 +
    competency2 +
    competency3 +
    competency4 +
    competency5;

  try {
    const existingCorrection = await prisma.essayCorrection.findFirst({
      where: {
        studentId,
        examId,
      },
    });

    let correction: SavedEssayCorrection;

    if (existingCorrection) {
      correction = await prisma.essayCorrection.update({
        where: {
          id: existingCorrection.id,
        },
        data: {
          competency1,
          competency2,
          competency3,
          competency4,
          competency5,
          totalScore,
          comment,
        },
        select: {
          id: true,
          studentId: true,
          examId: true,
          competency1: true,
          competency2: true,
          competency3: true,
          competency4: true,
          competency5: true,
          totalScore: true,
          comment: true,
        },
      });
    } else {
      correction = await prisma.essayCorrection.create({
        data: {
          studentId,
          examId,
          competency1,
          competency2,
          competency3,
          competency4,
          competency5,
          totalScore,
          comment,
        },
        select: {
          id: true,
          studentId: true,
          examId: true,
          competency1: true,
          competency2: true,
          competency3: true,
          competency4: true,
          competency5: true,
          totalScore: true,
          comment: true,
        },
      });
    }

    revalidatePath("/redacoes");

    return {
      status: "success",
      message: "Correcao salva.",
      correction,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar a correcao.",
    };
  }
}
