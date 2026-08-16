import {
  randomBytes,
} from "node:crypto";

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
  GOOGLE_CLASSROOM_SCOPES,
} from "@/lib/classroom/google-oauth";

const STATE_COOKIE =
  "classroom_oauth_state";

const RETURN_COOKIE =
  "classroom_oauth_return_to";

function sanitizeReturnTo(
  value:
    | string
    | null,
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

  const state =
    randomBytes(
      32,
    ).toString(
      "base64url",
    );

  const returnTo =
    sanitizeReturnTo(
      request.nextUrl
        .searchParams
        .get(
          "returnTo",
        ),
    );

  const cookieStore =
    await cookies();

  const secure =
    process.env
      .NODE_ENV ===
    "production";

  cookieStore.set(
    STATE_COOKIE,
    state,
    {
      httpOnly:
        true,

      sameSite:
        "lax",

      secure,

      path:
        "/",

      maxAge:
        10 * 60,
    },
  );

  cookieStore.set(
    RETURN_COOKIE,
    returnTo,
    {
      httpOnly:
        true,

      sameSite:
        "lax",

      secure,

      path:
        "/",

      maxAge:
        10 * 60,
    },
  );

  const oauth =
    createGoogleClassroomOAuthClient();

  const authorizationUrl =
    oauth.generateAuthUrl({
      access_type:
        "offline",

      include_granted_scopes:
        true,

      prompt:
        "consent",

      scope: [
        ...GOOGLE_CLASSROOM_SCOPES,
      ],

      state,
    });

  return NextResponse.redirect(
    authorizationUrl,
  );
}