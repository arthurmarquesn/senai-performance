"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createExam(formData: FormData) {
  const title = formData.get("title") as string;
  const grade = Number(formData.get("grade"));
  const totalQuestions = Number(formData.get("totalQuestions"));

  if (!title || !grade || !totalQuestions) {
    throw new Error("Preencha todos os campos.");
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