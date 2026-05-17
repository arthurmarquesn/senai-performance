"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createClassRoom(formData: FormData) {
  const name = formData.get("name") as string;
  const grade = Number(formData.get("grade"));

  if (!name || !grade) {
    throw new Error("Preencha todos os campos.");
  }

  await prisma.classRoom.create({
    data: {
      name: name.toUpperCase().trim(),
      grade,
    },
  });

  revalidatePath("/turmas");
}