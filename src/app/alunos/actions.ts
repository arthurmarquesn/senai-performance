"use server";

import { prisma } from "@/lib/prisma";
import { requireAcademicAccess } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createStudent(formData: FormData) {
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
    throw new Error("O número do aluno deve ser um inteiro maior ou igual a zero.");
  }

  if (!name || !classRoomId) {
    throw new Error("Nome e turma são obrigatórios.");
  }

  await prisma.student.create({
    data: {
      name,
      number,
      classRoomId,
    },
  });

  revalidatePath("/alunos");
}
