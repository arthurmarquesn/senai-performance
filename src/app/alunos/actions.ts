"use server";

import { prisma } from "@/lib/prisma";
import { requireAcademicAccess } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form-state";

export async function createStudent(formData: FormData): Promise<FormState> {
  await requireAcademicAccess();

  const nameValue = formData.get("name");
  const numberValue = formData.get("number");
  const classRoomValue = formData.get("classRoomId");
  const name = typeof nameValue === "string" ? nameValue.trim() : "";
  const classRoomId = typeof classRoomValue === "string" ? classRoomValue.trim() : "";

  const numberText = typeof numberValue === "string" ? numberValue.trim() : "";
  const number = numberText ? Number(numberText) : null;

  if (
    (numberValue !== null && typeof numberValue !== "string") ||
    (number !== null && (!Number.isInteger(number) || number < 0 || number > 2147483647))
  ) {
    return { fieldErrors: { number: "Informe um número inteiro maior ou igual a zero." } };
  }

  if (!name || !classRoomId) {
    return { fieldErrors: {
      ...(!name ? { name: "Informe o nome do aluno." } : {}),
      ...(!classRoomId ? { classRoomId: "Selecione uma turma." } : {}),
    } };
  }

  try {
    await prisma.student.create({
      data: {
        name,
        number,
        classRoomId,
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2003") {
      return { fieldErrors: { classRoomId: "A turma não está mais disponível. Atualize a página e selecione outra." } };
    }
    console.error("Falha ao cadastrar aluno", error);
    return { error: "Não foi possível cadastrar o aluno. Tente novamente em instantes." };
  }

  revalidatePath("/alunos");
  return { success: "Aluno cadastrado com sucesso." };
}
