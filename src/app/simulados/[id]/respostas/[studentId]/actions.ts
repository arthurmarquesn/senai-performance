"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveStudentAnswer(formData: FormData) {
  const examId = formData.get("examId") as string;
  const studentId = formData.get("studentId") as string;
  const question = Number(formData.get("question"));
  const answerValue = formData.get("answer") as string;

  const answer = answerValue ? answerValue : null;

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
      answer: answer as any,
    },
    create: {
      examResultId: result.id,
      question,
      answer: answer as any,
    },
  });

  revalidatePath(`/simulados/${examId}/respostas/${studentId}`);
}