"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveEssayCorrection(formData: FormData) {
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
    throw new Error("Selecione um aluno.");
  }

  const totalScore =
    competency1 +
    competency2 +
    competency3 +
    competency4 +
    competency5;

  const existingCorrection = await prisma.essayCorrection.findFirst({
    where: {
      studentId,
      examId,
    },
  });

  if (existingCorrection) {
    await prisma.essayCorrection.update({
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
    });
  } else {
    await prisma.essayCorrection.create({
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
    });
  }

  revalidatePath("/redacoes");
}