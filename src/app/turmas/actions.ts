"use server";

import { prisma } from "@/lib/prisma";
import { requireAcademicAccess } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form-state";

export async function createClassRoom(formData: FormData): Promise<FormState> {
  await requireAcademicAccess();

  const nameValue = formData.get("name");
  const gradeValue = formData.get("grade");
  const name = typeof nameValue === "string" ? nameValue.trim().toUpperCase() : "";
  const grade = typeof gradeValue === "string" ? Number(gradeValue) : NaN;

  if (!name) {
    return { fieldErrors: { name: "Informe o nome da turma." } };
  }

  if (![1, 2, 3].includes(grade)) {
    return { fieldErrors: { grade: "Selecione o 1º, 2º ou 3º ano." } };
  }

  try {
    await prisma.classRoom.create({
      data: {
        name,
        grade,
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { fieldErrors: { name: "Já existe uma turma com esse nome." } };
    }
    console.error("Falha ao cadastrar turma", error);
    return { error: "Não foi possível cadastrar a turma. Tente novamente em instantes." };
  }

  revalidatePath("/turmas");
  return { success: "Turma cadastrada com sucesso." };
}
