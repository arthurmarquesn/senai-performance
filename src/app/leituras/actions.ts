    "use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function updateReadingStatus(formData: FormData) {
  const bookId = String(formData.get("bookId") || "");
  const studentId = String(formData.get("studentId") || "");
  const status = String(formData.get("status") || "");

  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  if (!bookId || !studentId || !status) {
    throw new Error("Dados insuficientes.");
  }

  const progress =
    status === "FINISHED"
      ? 100
      : status === "READING"
        ? 10
        : 0;

  await prisma.bookProgress.upsert({
    where: {
      bookId_studentId: {
        bookId,
        studentId,
      },
    },
    update: {
      status: status as any,
      progress,
      startedAt: status === "READING" ? new Date() : undefined,
      finishedAt: status === "FINISHED" ? new Date() : undefined,
    },
    create: {
      bookId,
      studentId,
      status: status as any,
      progress,
      startedAt: status === "READING" ? new Date() : undefined,
      finishedAt: status === "FINISHED" ? new Date() : undefined,
    },
  });

  revalidatePath(`/leituras/${bookId}`);
  revalidatePath("/leituras");
}