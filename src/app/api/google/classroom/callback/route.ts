import {
  cookies,
} from "next/headers";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCurrentUser,
} from "@/lib/auth";

import {
  createGoogleClassroomOAuthClient,
  hasAllRequiredClassroomScopes,
} from "@/lib/classroom/google-oauth";

import {
  encryptClassroomToken,
} from "@/lib/classroom/token-crypto";

import {
  prisma,
} from "@/lib/prisma";

const STATE_COOKIE =
  "classroom_oauth_state";

const RETURN_COOKIE =
  "classroom_oauth_return_to";

function sanitizeReturnTo(
  value:
    | string
    | undefined,
): string {
  if (
    !value ||
    !value.startsWith(
      "/",
    ) ||
    value.startsWith(
      "//",
    )
  ) {
    return "/jornadas";
  }

  return value;
}

function redirectWithStatus(
  request:
    NextRequest,

  returnTo:
    string,

  status:
    | "connected"
    | "denied"
    | "error"
    | "missing_scope",
) {
  const url =
    new URL(
      returnTo,
      request.url,
    );

  url.searchParams.set(
    "classroom",
    status,
  );

  return NextResponse.redirect(
    url,
  );
}

export async function GET(
  request:
    NextRequest,
) {
  const user =
    await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(
        "/login",
        request.url,
      ),
    );
  }

  const cookieStore =
    await cookies();

  const expectedState =
    cookieStore.get(
      STATE_COOKIE,
    )?.value;

  const returnTo =
    sanitizeReturnTo(
      cookieStore.get(
        RETURN_COOKIE,
      )?.value,
    );

  cookieStore.delete(
    STATE_COOKIE,
  );

  cookieStore.delete(
    RETURN_COOKIE,
  );

  const oauthError =
    request.nextUrl
      .searchParams
      .get(
        "error",
      );

  if (oauthError) {
    return redirectWithStatus(
      request,
      returnTo,
      "denied",
    );
  }

  const state =
    request.nextUrl
      .searchParams
      .get(
        "state",
      );

  const code =
    request.nextUrl
      .searchParams
      .get(
        "code",
      );

  if (
    !expectedState ||
    !state ||
    state !==
      expectedState ||
    !code
  ) {
    return redirectWithStatus(
      request,
      returnTo,
      "error",
    );
  }

  try {
    const oauth =
      createGoogleClassroomOAuthClient();

    const {
      tokens,
    } =
      await oauth.getToken(
        code,
      );

    const existing =
      await prisma.googleClassroomConnection.findUnique({
        where: {
          userId:
            user.id,
        },
      });

    const grantedScopes =
      tokens.scope ??
      existing
        ?.grantedScopes ??
      null;

    if (
      !hasAllRequiredClassroomScopes(
        grantedScopes,
      )
    ) {
      if (existing) {
        await prisma.googleClassroomConnection.update({
          where: {
            userId:
              user.id,
          },

          data: {
            grantedScopes,

            status:
              "REAUTH_REQUIRED",
          },
        });
      }

      return redirectWithStatus(
        request,
        returnTo,
        "missing_scope",
      );
    }

    let refreshTokenEncrypted:
      string;

    if (
      tokens.refresh_token
    ) {
      refreshTokenEncrypted =
        encryptClassroomToken(
          tokens.refresh_token,
        );
    } else if (
      existing
    ) {
      refreshTokenEncrypted =
        existing.refreshTokenEncrypted;
    } else {
      throw new Error(
        "O Google não retornou um refresh token.",
      );
    }

    await prisma.googleClassroomConnection.upsert({
      where: {
        userId:
          user.id,
      },

      create: {
        userId:
          user.id,

        refreshTokenEncrypted,

        grantedScopes,

        status:
          "CONNECTED",

        connectedAt:
          new Date(),

        revokedAt:
          null,
      },

      update: {
        refreshTokenEncrypted,

        grantedScopes,

        status:
          "CONNECTED",

        connectedAt:
          new Date(),

        revokedAt:
          null,
      },
    });

    return redirectWithStatus(
      request,
      returnTo,
      "connected",
    );
  } catch (
    error
  ) {
    console.error(
      "Erro no callback do Google Classroom:",
      error,
    );

    return redirectWithStatus(
      request,
      returnTo,
      "error",
    );
  }
}