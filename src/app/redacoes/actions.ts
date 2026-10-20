
"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SavedEssayCorrection = {
  id: string;
  studentId: string;
  examId: string | null;
  competency1: number;
  competency2: number;
  competency3: number;
  competency4: number;
  competency5: number;
  totalScore: number;
  comment: string | null;
};

export type SaveEssayCorrectionState = {
  status: "idle" | "success" | "error";
  message?: string;
  correction?: SavedEssayCorrection;
};

const CORRECTION_SELECT = {
  id: true,
  studentId: true,
  examId: true,
  competency1: true,
  competency2: true,
  competency3: true,
  competency4: true,
  competency5: true,
  totalScore: true,
  comment: true,
} as const;

function readCompetency(
  formData: FormData,
  name: string
): number | null {
  const raw = formData.get(name);

  if (typeof raw !== "string" || raw.trim() === "") {
    return null;
  }

  const value = Number(raw);

  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > 200 ||
    value % 40 !== 0
  ) {
    return null;
  }

  return value;
}

export async function saveEssayCorrection(
  _previousState: SaveEssayCorrectionState,
  formData: FormData
): Promise<SaveEssayCorrectionState> {
  // Autorização sempre realizada no servidor
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Sua sessão expirou. Entre novamente.",
    };
  }

  if (
    ![
      UserRole.ADMIN,
      UserRole.TEACHER,
      UserRole.ESSAY_CORRECTOR,
    ].includes(user.role)
  ) {
    return {
      status: "error",
      message: "Você não possui permissão para corrigir redações.",
    };
  }

  const rawStudentId = formData.get("studentId");
  const rawExamId = formData.get("examId");

  const studentId =
    typeof rawStudentId === "string"
      ? rawStudentId.trim()
      : "";

  const examId =
    typeof rawExamId === "string" &&
    rawExamId.trim() !== ""
      ? rawExamId.trim()
      : null;

  if (!studentId) {
    return {
      status: "error",
      message: "Selecione um aluno.",
    };
  }

  const competencies = [
    readCompetency(formData, "competency1"),
    readCompetency(formData, "competency2"),
    readCompetency(formData, "competency3"),
    readCompetency(formData, "competency4"),
    readCompetency(formData, "competency5"),
  ];

  if (competencies.some((value) => value === null)) {
    return {
      status: "error",
      message:
        "Informe as cinco competências com notas válidas: 0, 40, 80, 120, 160 ou 200.",
    };
  }

  const [
    competency1,
    competency2,
    competency3,
    competency4,
    competency5,
  ] = competencies as [
    number,
    number,
    number,
    number,
    number,
  ];

  const totalScore =
    competency1 +
    competency2 +
    competency3 +
    competency4 +
    competency5;

  const rawComment = formData.get("comment");

  const comment =
    typeof rawComment === "string"
      ? rawComment.trim() || null
      : null;

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        classRoom: {
          select: {
            grade: true,
          },
        },
      },
    });

    if (!student) {
      return {
        status: "error",
        message: "Aluno não encontrado.",
      };
    }

    if (examId) {
      const exam = await prisma.exam.findUnique({
        where: { id: examId },
        select: {
          id: true,
          grade: true,
        },
      });

      if (!exam) {
        return {
          status: "error",
          message: "Simulado não encontrado.",
        };
      }

      if (exam.grade !== student.classRoom.grade) {
        return {
          status: "error",
          message:
            "O simulado selecionado não corresponde ao ano do aluno.",
        };
      }
    }

    const data = {
      competency1,
      competency2,
      competency3,
      competency4,
      competency5,
      totalScore,
      comment,
    };

    const existingCorrection =
      await prisma.essayCorrection.findFirst({
        where: {
          studentId,
          examId,
        },
        select: {
          id: true,
        },
      });

    let correction: SavedEssayCorrection;

    if (existingCorrection) {
      correction = await prisma.essayCorrection.update({
        where: {
          id: existingCorrection.id,
        },
        data,
        select: CORRECTION_SELECT,
      });
    } else {
      correction = await prisma.essayCorrection.create({
        data: {
          studentId,
          examId,
          ...data,
        },
        select: CORRECTION_SELECT,
      });
    }

    revalidatePath("/redacoes");

    return {
      status: "success",
      message: "Correção salva com sucesso.",
      correction,
    };
  } catch (error) {
    console.error("Erro ao salvar redação:", error);

    return {
      status: "error",
      message:
        "Não foi possível salvar a correção. Tente novamente.",
    };
  }
}
