"use server";

import { prisma } from "@/lib/prisma";
import { requireAcademicAccess } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form-state";

export async function createExam(formData: FormData): Promise<FormState> {
  await requireAcademicAccess();

  const titleValue = formData.get("title");
  const gradeValue = formData.get("grade");
  const questionsValue = formData.get("totalQuestions");
  const title = typeof titleValue === "string" ? titleValue.trim() : "";
  const grade = typeof gradeValue === "string" ? Number(gradeValue) : NaN;
  const totalQuestions = typeof questionsValue === "string" ? Number(questionsValue) : NaN;

  if (!title) {
    return { fieldErrors: { title: "Informe o nome do simulado." } };
  }

  if (![1, 2, 3].includes(grade)) {
    return { fieldErrors: { grade: "Selecione o 1º, 2º ou 3º ano." } };
  }

  if (!Number.isInteger(totalQuestions) || totalQuestions < 1 || totalQuestions > 2147483647) {
    return { fieldErrors: { totalQuestions: "Informe uma quantidade inteira maior que zero." } };
  }

  try {
    await prisma.exam.create({
      data: {
        title,
        grade,
        totalQuestions,
      },
    });
  } catch (error) {
    console.error("Falha ao cadastrar simulado", error);
    return { error: "Não foi possível criar o simulado. Tente novamente em instantes." };
  }

  revalidatePath("/simulados");
  return { success: "Simulado criado com sucesso." };
}
