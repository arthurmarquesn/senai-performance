"use server";

import { JourneyStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function readString(
  formData: FormData,
  field: string,
): string {
  const value = formData.get(field);

  return typeof value === "string"
    ? value.trim()
    : "";
}

export async function createJourney(
  formData: FormData,
): Promise<never> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error(
      "Sessão inválida. Entre novamente no sistema.",
    );
  }

  const title = readString(
    formData,
    "title",
  );

  const description = readString(
    formData,
    "description",
  );

  const gradeRaw = readString(
    formData,
    "grade",
  );

  const grade = Number(gradeRaw);

  if (!title) {
    throw new Error(
      "Informe o título da Jornada.",
    );
  }

  if (title.length > 180) {
    throw new Error(
      "O título da Jornada deve ter no máximo 180 caracteres.",
    );
  }

  if (
    !Number.isInteger(grade) ||
    grade < 1 ||
    grade > 3
  ) {
    throw new Error(
      "Selecione uma série válida entre 1º e 3º ano.",
    );
  }

  const journey =
    await prisma.journey.create({
      data: {
        title,
        description:
          description || null,
        grade,
        status:
          JourneyStatus.DRAFT,
        createdById: user.id,
      },
      select: {
        id: true,
      },
    });

  revalidatePath("/jornadas");

  redirect(
    `/jornadas/${journey.id}`,
  );
}