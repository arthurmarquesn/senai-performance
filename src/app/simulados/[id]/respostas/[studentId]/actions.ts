"use server";

import { Alternative } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const alternatives = new Set<string>(Object.values(Alternative));

export async function saveStudentAnswer(formData: FormData) {
  const examId = formData.get("examId") as string;
  const studentId = formData.get("studentId") as string;
  const question = Number(formData.get("question"));
  const answerValue = formData.get("answer") as string;

  const answer =
    answerValue && alternatives.has(answerValue)
      ? Alternative[answerValue as keyof typeof Alternative]
      : null;

  if (!examId || !studentId || !question) {
    throw new Error("Dados inválidos.");
  }

  const result = await prisma.examResult.upsert({
    where: {
      studentId_examId: {
        studentId,
        examId,
      },
    },
    update: {},
    create: {
      studentId,
      examId,
    },
  });

  await prisma.studentAnswer.upsert({
    where: {
      examResultId_question: {
        examResultId: result.id,
        question,
      },
    },
    update: {
      answer,
    },
    create: {
      examResultId: result.id,
      question,
      answer,
    },
  });

  revalidatePath(`/simulados/${examId}/respostas/${studentId}`);
}
