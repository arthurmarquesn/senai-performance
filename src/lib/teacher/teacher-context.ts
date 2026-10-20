import "server-only";

import type {
  KnowledgeArea,
  Subject,
} from "@prisma/client";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const SUBJECT_LABELS: Record<Subject, string> = {
  MATEMATICA: "Matemática",
  FISICA: "Física",
  QUIMICA: "Química",
  BIOLOGIA: "Biologia",
  PORTUGUES: "Língua Portuguesa",
  INGLES: "Língua Inglesa",
  ARTES: "Arte",
  EDUCACAO_FISICA: "Educação Física",
  SOCIOLOGIA: "Sociologia",
  FILOSOFIA: "Filosofia",
  GEOGRAFIA: "Geografia",
  HISTORIA: "História",
};

export const KNOWLEDGE_AREA_LABELS: Record<
  KnowledgeArea,
  string
> = {
  LINGUAGENS: "Linguagens",
  MATEMATICA: "Matemática",
  CIENCIAS_DA_NATUREZA: "Ciências da Natureza",
  CIENCIAS_HUMANAS: "Ciências Humanas",
};

export async function getTeacherContext() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const teacherProfile =
    await prisma.teacherProfile.findUnique({
      where: {
        userId: user.id,
      },

      select: {
        id: true,
        userId: true,
        subject: true,
        area: true,
      },
    });

  return {
    user,
    teacherProfile,

    subjectLabel: teacherProfile
      ? SUBJECT_LABELS[teacherProfile.subject]
      : null,

    areaLabel: teacherProfile
      ? KNOWLEDGE_AREA_LABELS[teacherProfile.area]
      : null,

    isPortuguese:
      teacherProfile?.subject === "PORTUGUES",
  };
}