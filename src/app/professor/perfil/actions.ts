"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Subject } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SUBJECT_TO_KNOWLEDGE_AREA } from "@/lib/teacher/teacher-context";

export async function createTeacherProfileAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "TEACHER") {
    throw new Error(
      "Só é possível configurar o perfil pedagógico para professores."
    );
  }

  const rawSubject = String(formData.get("subject") ?? "").trim();

  if (!rawSubject) {
    throw new Error("Selecione uma disciplina para continuar.");
  }

  const validSubject = Object.keys(
    SUBJECT_TO_KNOWLEDGE_AREA
  ).includes(rawSubject)
    ? (rawSubject as Subject)
    : null;

  if (!validSubject) {
    throw new Error("Disciplina inválida.");
  }

  const existingProfile = await prisma.teacherProfile.findUnique({
    where: {
      userId: user.id,
    },
    select: { id: true },
  });

  if (existingProfile) {
    redirect("/professor");
  }

  await prisma.teacherProfile.create({
    data: {
      userId: user.id,
      subject: validSubject,
      area: SUBJECT_TO_KNOWLEDGE_AREA[validSubject],
    },
  });

  revalidatePath("/professor");
  redirect("/professor");
}

export async function updateTeacherProfileAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "TEACHER") {
    throw new Error(
      "Só é possível editar o perfil pedagógico para professores."
    );
  }

  const rawSubject = String(formData.get("subject") ?? "").trim();

  if (!rawSubject) {
    throw new Error("Selecione uma disciplina para continuar.");
  }

  const validSubject = Object.keys(
    SUBJECT_TO_KNOWLEDGE_AREA
  ).includes(rawSubject)
    ? (rawSubject as Subject)
    : null;

  if (!validSubject) {
    throw new Error("Disciplina inválida.");
  }

  const existingProfile = await prisma.teacherProfile.findUnique({
    where: {
      userId: user.id,
    },
    select: { id: true },
  });

  if (!existingProfile) {
    redirect("/professor/perfil");
  }

  await prisma.teacherProfile.update({
    where: {
      userId: user.id,
    },
    data: {
      subject: validSubject,
      area: SUBJECT_TO_KNOWLEDGE_AREA[validSubject],
    },
  });

  revalidatePath("/professor");
  revalidatePath("/professor/perfil");
  redirect("/professor");
}
