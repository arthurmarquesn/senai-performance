"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createStudent(formData: FormData) {
  const name = formData.get("name") as string;
  const numberValue = formData.get("number") as string;
  const classRoomId = formData.get("classRoomId") as string;

  const number = numberValue ? Number(numberValue) : null;

  if (!name || !classRoomId) {
    throw new Error("Nome e turma são obrigatórios.");
  }

  await prisma.student.create({
    data: {
      name: name.trim(),
      number,
      classRoomId,
    },
  });

  revalidatePath("/alunos");
}