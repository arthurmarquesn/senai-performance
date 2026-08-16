import "server-only";

import {
  google,
} from "googleapis";

import {
  prisma,
} from "@/lib/prisma";

import {
  decryptClassroomToken,
} from "./token-crypto";

export const GOOGLE_CLASSROOM_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.students",
] as const;

function requireEnv(
  name: string,
): string {
  const value =
    process.env[
      name
    ]?.trim();

  if (!value) {
    throw new Error(
      `${name} não está configurada.`,
    );
  }

  return value;
}

export function createGoogleClassroomOAuthClient() {
  return new google.auth.OAuth2(
    requireEnv(
      "GOOGLE_CLASSROOM_CLIENT_ID",
    ),

    requireEnv(
      "GOOGLE_CLASSROOM_CLIENT_SECRET",
    ),

    requireEnv(
      "GOOGLE_CLASSROOM_REDIRECT_URI",
    ),
  );
}

export function hasAllRequiredClassroomScopes(
  grantedScopes:
    | string
    | null
    | undefined,
): boolean {
  if (!grantedScopes) {
    return false;
  }

  const granted =
    new Set(
      grantedScopes
        .split(
          /\s+/,
        )
        .map(
          (scope) =>
            scope.trim(),
        )
        .filter(
          Boolean,
        ),
    );

  return GOOGLE_CLASSROOM_SCOPES.every(
    (scope) =>
      granted.has(
        scope,
      ),
  );
}

export async function createAuthorizedClassroomClient(
  userId: string,
) {
  const connection =
    await prisma.googleClassroomConnection.findUnique({
      where: {
        userId,
      },
    });

  if (
    !connection ||
    connection.status !==
      "CONNECTED"
  ) {
    throw new Error(
      "Google Classroom não está conectado.",
    );
  }

  const refreshToken =
    decryptClassroomToken(
      connection.refreshTokenEncrypted,
    );

  const auth =
    createGoogleClassroomOAuthClient();

  auth.setCredentials({
    refresh_token:
      refreshToken,
  });

  return {
    auth,

    classroom:
      google.classroom({
        version:
          "v1",

        auth,
      }),

    connection,
  };
}