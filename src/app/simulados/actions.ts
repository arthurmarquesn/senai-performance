"use server";

import { prisma } from "@/lib/prisma";
import { requireAcademicAccess } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createExam(formData: FormData) {
  await requireAcademicAccess();

  const titleValue = formData.get("title");
  const gradeValue = formData.get("grade");
  const questionsValue = formData.get("totalQuestions");
  const title = typeof titleValue === "string" ? titleValue.trim() : "";
  const grade = typeof gradeValue === "string" ? Number(gradeValue) : NaN;
  const totalQuestions = typeof questionsValue === "string" ? Number(questionsValue) : NaN;

  if (!title || !grade || !totalQuestions) {
    throw new Error("Preencha todos os campos.");
  }

  if (![1, 2, 3].includes(grade)) {
    throw new Error("Selecione uma série válida: 1º, 2º ou 3º ano.");
  }

  if (!Number.isInteger(totalQuestions) || totalQuestions < 1 || totalQuestions > 2147483647) {
    throw new Error("A quantidade de questões deve ser um inteiro maior que zero.");
  }

  await prisma.exam.create({
    data: {
      title,
      grade,
      totalQuestions,
    },
  });

  revalidatePath("/simulados");
}
