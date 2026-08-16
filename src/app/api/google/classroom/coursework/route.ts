import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCurrentUser,
} from "@/lib/auth";

import {
  createAuthorizedClassroomClient,
} from "@/lib/classroom/google-oauth";

import {
  prisma,
} from "@/lib/prisma";

type JsonRecord =
  Record<
    string,
    unknown
  >;

function asRecord(
  value: unknown,
): JsonRecord | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(
      value,
    )
  ) {
    return null;
  }

  return value as JsonRecord;
}

function readString(
  record: JsonRecord | null,
  key: string,
): string {
  const value =
    record?.[key];

  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function readNumber(
  record: JsonRecord | null,
  key: string,
): number | null {
  const value =
    record?.[key];

  return typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
    ? value
    : null;
}

function readStringArray(
  record: JsonRecord | null,
  key: string,
): string[] {
  const value =
    record?.[key];

  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .filter(
      (
        item,
      ): item is string =>
        typeof item ===
        "string",
    )
    .map(
      (item) =>
        item.trim(),
    )
    .filter(
      Boolean,
    );
}

function readHttpStatus(
  error: unknown,
): number | null {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return null;
  }

  const candidate =
    error as {
      code?: unknown;
      response?: {
        status?: unknown;
      };
    };

  if (
    typeof candidate.response?.status ===
    "number"
  ) {
    return candidate.response.status;
  }

  if (
    typeof candidate.code ===
    "number"
  ) {
    return candidate.code;
  }

  return null;
}

function readGoogleErrorMessage(
  error: unknown,
): string | null {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return null;
  }

  const candidate =
    error as {
      message?: unknown;
      response?: {
        data?: unknown;
      };
    };

  const responseData =
    asRecord(
      candidate.response?.data,
    );

  const nestedError =
    asRecord(
      responseData?.error,
    );

  const googleMessage =
    nestedError?.message;

  if (
    typeof googleMessage ===
      "string" &&
    googleMessage.trim()
  ) {
    return googleMessage.trim();
  }

  if (
    typeof candidate.message ===
      "string" &&
    candidate.message.trim()
  ) {
    return candidate.message.trim();
  }

  return null;
}

function trimToLimit(
  value: string,
  maxLength: number,
): string {
  if (
    value.length <=
    maxLength
  ) {
    return value;
  }

  return value
    .slice(
      0,
      maxLength,
    )
    .trimEnd();
}

function buildCourseWorkDescription(
  activity: {
    objective: string | null;
    instructions: string | null;

    materials: unknown;

    bnccSkills: Array<{
      bnccSkill: {
        code: string;
        description: string;
      };
    }>;
  },
): string {
  const materials =
    asRecord(
      activity.materials,
    );

  const sections:
    string[] =
    [];

  const objective =
    activity.objective?.trim() ??
    "";

  if (objective) {
    sections.push(
      [
        "OBJETIVO",
        objective,
      ].join("\n"),
    );
  }

  const instructions =
    activity.instructions?.trim() ??
    "";

  if (instructions) {
    sections.push(
      [
        "DESENVOLVIMENTO",
        instructions,
      ].join("\n"),
    );
  }

  const estimatedMinutes =
    readNumber(
      materials,
      "estimatedMinutes",
    );

  if (
    estimatedMinutes !==
    null
  ) {
    sections.push(
      [
        "DURAÇÃO ESTIMADA",
        `${estimatedMinutes} minuto(s)`,
      ].join("\n"),
    );
  }

  const studentOrganization =
    readString(
      materials,
      "studentOrganization",
    );

  if (
    studentOrganization
  ) {
    sections.push(
      [
        "ORGANIZAÇÃO DOS ESTUDANTES",
        studentOrganization,
      ].join("\n"),
    );
  }

  const resources =
    readStringArray(
      materials,
      "resources",
    );

  if (
    resources.length >
    0
  ) {
    sections.push(
      [
        "RECURSOS",

        ...resources.map(
          (item) =>
            `• ${item}`,
        ),
      ].join("\n"),
    );
  }

  const expectedProduct =
    readString(
      materials,
      "expectedProduct",
    );

  if (
    expectedProduct
  ) {
    sections.push(
      [
        "PRODUTO ESPERADO",
        expectedProduct,
      ].join("\n"),
    );
  }

  const assessmentCriteria =
    readStringArray(
      materials,
      "assessmentCriteria",
    );

  if (
    assessmentCriteria.length >
    0
  ) {
    sections.push(
      [
        "CRITÉRIOS DE AVALIAÇÃO",

        ...assessmentCriteria.map(
          (item) =>
            `• ${item}`,
        ),
      ].join("\n"),
    );
  }

  const teacherNotes =
    readString(
      materials,
      "teacherNotes",
    );

  if (
    teacherNotes
  ) {
    sections.push(
      [
        "ORIENTAÇÕES AO PROFESSOR",
        teacherNotes,
      ].join("\n"),
    );
  }

  if (
    activity.bnccSkills.length >
    0
  ) {
    sections.push(
      [
        "BNCC",

        ...activity.bnccSkills.map(
          ({
            bnccSkill,
          }) =>
            `• ${bnccSkill.code} — ${bnccSkill.description}`,
        ),
      ].join("\n"),
    );
  }

  return trimToLimit(
    sections.join(
      "\n\n",
    ),
    30_000,
  );
}

async function findActiveTeacherCourse(
  classroom: Awaited<
    ReturnType<
      typeof createAuthorizedClassroomClient
    >
  >["classroom"],

  courseId: string,
) {
  let pageToken:
    string | undefined;

  do {
    const response =
      await classroom.courses.list({
        teacherId:
          "me",

        courseStates: [
          "ACTIVE",
        ],

        pageSize:
          100,

        pageToken,
      });

    const course =
      response.data.courses?.find(
        (item) =>
          item.id ===
          courseId,
      );

    if (course) {
      return course;
    }

    pageToken =
      response.data.nextPageToken ??
      undefined;
  } while (
    pageToken
  );

  return null;
}

export async function GET(
  request: NextRequest,
) {
  const user =
    await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Não autenticado.",
      },
      {
        status:
          401,
      },
    );
  }

  const activityId =
    request.nextUrl.searchParams
      .get(
        "activityId",
      )
      ?.trim();

  if (!activityId) {
    return NextResponse.json(
      {
        error:
          "activityId é obrigatório.",
      },
      {
        status:
          400,
      },
    );
  }

  const activity =
    await prisma
      .journeyActivity
      .findUnique({
        where: {
          id:
            activityId,
        },

        select: {
          id:
            true,
        },
      });

  if (!activity) {
    return NextResponse.json(
      {
        error:
          "Atividade não encontrada.",
      },
      {
        status:
          404,
      },
    );
  }

  const publications =
    await prisma
      .classroomPublication
      .findMany({
        where: {
          journeyActivityId:
            activityId,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        select: {
          id:
            true,

          googleCourseId:
            true,

          googleCourseName:
            true,

          googleCourseWorkId:
            true,

          googleCourseWorkState:
            true,

          status:
            true,

          errorMessage:
            true,

          classroomCreatedAt:
            true,

          createdAt:
            true,

          updatedAt:
            true,
        },
      });

  return NextResponse.json({
    publications,
  });
}

export async function POST(
  request: NextRequest,
) {
  const user =
    await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Não autenticado.",
      },
      {
        status:
          401,
      },
    );
  }

  let body:
    unknown;

  try {
    body =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Corpo JSON inválido.",
      },
      {
        status:
          400,
      },
    );
  }

  const record =
    asRecord(
      body,
    );

  const activityId =
    typeof record?.activityId ===
      "string"
      ? record.activityId.trim()
      : "";

  const courseId =
    typeof record?.courseId ===
      "string"
      ? record.courseId.trim()
      : "";

  if (
    !activityId ||
    !courseId
  ) {
    return NextResponse.json(
      {
        error:
          "activityId e courseId são obrigatórios.",
      },
      {
        status:
          400,
      },
    );
  }

  const activity =
    await prisma
      .journeyActivity
      .findUnique({
        where: {
          id:
            activityId,
        },

        include: {
          bnccSkills: {
            include: {
              bnccSkill: {
                select: {
                  code:
                    true,

                  description:
                    true,
                },
              },
            },
          },
        },
      });

  if (!activity) {
    return NextResponse.json(
      {
        error:
          "Atividade não encontrada.",
      },
      {
        status:
          404,
      },
    );
  }

  if (
    activity.status !==
    "APPROVED"
  ) {
    return NextResponse.json(
      {
        error:
          "Somente atividades aprovadas podem ser enviadas ao Google Classroom.",
      },
      {
        status:
          409,
      },
    );
  }

  let publication =
    await prisma
      .classroomPublication
      .findUnique({
        where: {
          journeyActivityId_googleCourseId: {
            journeyActivityId:
              activity.id,

            googleCourseId:
              courseId,
          },
        },
      });

  if (
    publication?.status ===
    "PENDING"
  ) {
    return NextResponse.json(
      {
        error:
          "Já existe um envio em andamento para essa turma.",

        publication,
      },
      {
        status:
          409,
      },
    );
  }

  let classroomClient:
    Awaited<
      ReturnType<
        typeof createAuthorizedClassroomClient
      >
    >;

  try {
    classroomClient =
      await createAuthorizedClassroomClient(
        user.id,
      );
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível acessar o Google Classroom.";

    return NextResponse.json(
      {
        error:
          message,

        requiresConnection:
          true,
      },
      {
        status:
          409,
      },
    );
  }

  const {
    classroom,
  } =
    classroomClient;

  try {
    const course =
      await findActiveTeacherCourse(
        classroom,
        courseId,
      );

    if (
      !course ||
      !course.id ||
      !course.name
    ) {
      return NextResponse.json(
        {
          error:
            "A turma selecionada não está ativa ou a conta conectada não é professora dessa turma.",
        },
        {
          status:
            403,
        },
      );
    }

    // ==================================================
    // ATUALIZAR RASCUNHO JÁ EXISTENTE
    // ==================================================

    if (
      publication?.status ===
        "CREATED" &&
      publication.googleCourseWorkId
    ) {
      const remoteCourseWork =
        await classroom
          .courses
          .courseWork
          .get({
            courseId:
              course.id,

            id:
              publication.googleCourseWorkId,
          });

      const remoteState =
        remoteCourseWork
          .data
          .state ??
        null;

      if (
        remoteState !==
        "DRAFT"
      ) {
        const synchronizedPublication =
          await prisma
            .classroomPublication
            .update({
              where: {
                id:
                  publication.id,
              },

              data: {
                googleCourseName:
                  course.name,

                googleCourseWorkState:
                  remoteState,

                errorMessage:
                  null,
              },
            });

        return NextResponse.json(
          {
            error:
              "O item correspondente no Google Classroom não está mais como rascunho. O Performance não vai sobrescrever uma atividade já publicada ou removida.",

            publication:
              synchronizedPublication,
          },
          {
            status:
              409,
          },
        );
      }

      publication =
        await prisma
          .classroomPublication
          .update({
            where: {
              id:
                publication.id,
            },

            data: {
              googleCourseName:
                course.name,

              status:
                "PENDING",

              errorMessage:
                null,
            },
          });

      const response =
        await classroom
          .courses
          .courseWork
          .patch({
            courseId:
              course.id,

            id:
              publication
                .googleCourseWorkId!,

            updateMask:
              "title,description",

            requestBody: {
              title:
                trimToLimit(
                  activity
                    .title
                    .trim(),

                  3_000,
                ),

              description:
                buildCourseWorkDescription(
                  activity,
                ),
            },
          });

      const updatedCourseWork =
        response.data;

      const updatedPublication =
        await prisma
          .classroomPublication
          .update({
            where: {
              id:
                publication.id,
            },

            data: {
              googleCourseWorkState:
                updatedCourseWork.state ??
                "DRAFT",

              status:
                "CREATED",

              errorMessage:
                null,
            },
          });

      await prisma
        .googleClassroomConnection
        .update({
          where: {
            userId:
              user.id,
          },

          data: {
            lastUsedAt:
              new Date(),
          },
        });

      return NextResponse.json({
        ok:
          true,

        action:
          "updated",

        message:
          "Rascunho atualizado no Google Classroom.",

        publication:
          updatedPublication,
      });
    }

    // ==================================================
    // CRIAR NOVA PUBLICAÇÃO PENDENTE
    // ==================================================

    if (publication) {
      publication =
        await prisma
          .classroomPublication
          .update({
            where: {
              id:
                publication.id,
            },

            data: {
              googleCourseName:
                course.name,

              googleCourseWorkId:
                null,

              googleCourseWorkState:
                null,

              status:
                "PENDING",

              errorMessage:
                null,

              classroomCreatedAt:
                null,
            },
          });
    } else {
      publication =
        await prisma
          .classroomPublication
          .create({
            data: {
              journeyActivityId:
                activity.id,

              createdById:
                user.id,

              googleCourseId:
                course.id,

              googleCourseName:
                course.name,

              status:
                "PENDING",
            },
          });
    }

    // ==================================================
    // CRIAR COURSEWORK COMO DRAFT
    // ==================================================

    const response =
      await classroom
        .courses
        .courseWork
        .create({
          courseId:
            course.id,

          requestBody: {
            title:
              trimToLimit(
                activity
                  .title
                  .trim(),

                3_000,
              ),

            description:
              buildCourseWorkDescription(
                activity,
              ),

            state:
              "DRAFT",

            workType:
              "ASSIGNMENT",
          },
        });

    const courseWork =
      response.data;

    if (
      !courseWork.id
    ) {
      throw new Error(
        "O Google Classroom criou a resposta sem retornar o identificador da atividade.",
      );
    }

    const creationTime =
      courseWork.creationTime
        ? new Date(
            courseWork.creationTime,
          )
        : new Date();

    const classroomCreatedAt =
      Number.isNaN(
        creationTime.getTime(),
      )
        ? new Date()
        : creationTime;

    const createdPublication =
      await prisma
        .classroomPublication
        .update({
          where: {
            id:
              publication.id,
          },

          data: {
            googleCourseWorkId:
              courseWork.id,

            googleCourseWorkState:
              courseWork.state ??
              "DRAFT",

            status:
              "CREATED",

            errorMessage:
              null,

            classroomCreatedAt,
          },
        });

    await prisma
      .googleClassroomConnection
      .update({
        where: {
          userId:
            user.id,
        },

        data: {
          lastUsedAt:
            new Date(),
        },
      });

    return NextResponse.json(
      {
        ok:
          true,

        action:
          "created",

        message:
          "Rascunho criado no Google Classroom.",

        publication:
          createdPublication,
      },
      {
        status:
          201,
      },
    );
  } catch (
    error
  ) {
    const httpStatus =
      readHttpStatus(
        error,
      );

    const googleMessage =
      readGoogleErrorMessage(
        error,
      );

    if (
      publication
    ) {
      await prisma
        .classroomPublication
        .update({
          where: {
            id:
              publication.id,
          },

          data: {
            status:
              "FAILED",

            errorMessage:
              trimToLimit(
                googleMessage ??
                  "Falha ao criar o rascunho no Google Classroom.",

                4_000,
              ),
          },
        });
    }

    if (
      httpStatus ===
      401
    ) {
      await prisma
        .googleClassroomConnection
        .updateMany({
          where: {
            userId:
              user.id,
          },

          data: {
            status:
              "REAUTH_REQUIRED",
          },
        });
    }

    console.error(
      "Erro ao criar CourseWork no Google Classroom:",
      error,
    );

    return NextResponse.json(
      {
        ok:
          false,

        requiresConnection:
          httpStatus ===
          401,

        error:
          googleMessage ??
          "Não foi possível criar o rascunho no Google Classroom.",
      },
      {
        status:
          httpStatus ===
          401
            ? 401
            : 502,
      },
    );
  }
}