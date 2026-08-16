import {
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

type ClassroomCourse = {
  id: string;
  name: string;
  section: string | null;
  state: string | null;
};

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

export async function GET() {
  const user =
    await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        connected:
          false,
        error:
          "Não autenticado.",
      },
      {
        status:
          401,
      },
    );
  }

  try {
    const {
      classroom,
    } =
      await createAuthorizedClassroomClient(
        user.id,
      );

    const courses:
      ClassroomCourse[] =
      [];

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

      for (
        const course of
        response.data.courses ??
        []
      ) {
        if (
          !course.id ||
          !course.name
        ) {
          continue;
        }

        courses.push({
          id:
            course.id,

          name:
            course.name,

          section:
            course.section ??
            null,

          state:
            course.courseState ??
            null,
        });
      }

      pageToken =
        response.data.nextPageToken ??
        undefined;
    } while (
      pageToken
    );

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
      connected:
        true,

      courses,
    });
  } catch (
    error
  ) {
    const status =
      readHttpStatus(
        error,
      );

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
      "Google Classroom não está conectado."
    ) {
      return NextResponse.json(
        {
          connected:
            false,

          requiresConnection:
            true,

          error:
            "Conecte sua conta Google para acessar o Classroom.",
        },
        {
          status:
            409,
        },
      );
    }

    if (
      status ===
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

      return NextResponse.json(
        {
          connected:
            false,

          requiresConnection:
            true,

          error:
            "A autorização do Google Classroom expirou ou foi revogada. Conecte novamente.",
        },
        {
          status:
            401,
        },
      );
    }

    console.error(
      "Erro ao listar turmas do Classroom:",
      error,
    );

    return NextResponse.json(
      {
        connected:
          false,

        requiresConnection:
          false,

        error:
          "Não foi possível acessar as turmas do Google Classroom.",
      },
      {
        status:
          500,
      },
    );
  }
}