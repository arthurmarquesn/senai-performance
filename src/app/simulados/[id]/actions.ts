"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createBlock(formData: FormData) {
  const examId = formData.get("examId") as string;

  const subject = formData.get("subject") as any;

  const startQuestion = Number(
    formData.get("startQuestion")
  );

  const endQuestion = Number(
    formData.get("endQuestion")
  );

  if (
    !examId ||
    !subject ||
    !startQuestion ||
    !endQuestion
  ) {
    throw new Error("Dados inválidos.");
  }

  await prisma.examBlock.create({
    data: {
      examId,
      subject,
      startQuestion,
      endQuestion,
    },
  });

  revalidatePath(`/simulados/${examId}`);
}

export async function saveAnswerKey(
  formData: FormData
) {
  const examId = formData.get("examId") as string;

  const question = Number(
    formData.get("question")
  );

  const answer = formData.get("answer") as any;

  if (!examId || !question || !answer) {
    throw new Error("Dados inválidos.");
  }

  await prisma.answerKey.upsert({
    where: {
      examId_question: {
        examId,
        question,
      },
    },

    update: {
      answer,
    },

    create: {
      examId,
      question,
      answer,
    },
  });

  revalidatePath(`/simulados/${examId}`);
}

export async function toggleCanceledQuestion(
  formData: FormData
) {
  const examId = formData.get("examId") as string;

  const question = Number(
    formData.get("question")
  );

  if (!examId || !question) {
    throw new Error("Dados inválidos.");
  }

  const existing =
    await prisma.answerKey.findUnique({
      where: {
        examId_question: {
          examId,
          question,
        },
      },
    });

  if (!existing) {
    throw new Error(
      "Cadastre o gabarito antes de anular."
    );
  }

  await prisma.answerKey.update({
    where: {
      id: existing.id,
    },

    data: {
      canceled: !existing.canceled,
    },
  });

  revalidatePath(`/simulados/${examId}`);
}