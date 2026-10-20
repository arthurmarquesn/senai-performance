"use server";

import { prisma } from "@/lib/prisma";
import { requireAcademicAccess } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createClassRoom(formData: FormData) {
  await requireAcademicAccess();

  const nameValue = formData.get("name");
  const gradeValue = formData.get("grade");
  const name = typeof nameValue === "string" ? nameValue.trim().toUpperCase() : "";
  const grade = typeof gradeValue === "string" ? Number(gradeValue) : NaN;

  if (!name || !grade) {
    throw new Error("Preencha todos os campos.");
  }

  if (![1, 2, 3].includes(grade)) {
    throw new Error("Selecione uma série válida: 1º, 2º ou 3º ano.");
  }

  await prisma.classRoom.create({
    data: {
      name,
      grade,
    },
  });

  revalidatePath("/turmas");
}
