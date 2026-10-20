
import "server-only";

import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "alfred_token";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET deve ser configurado com pelo menos 32 caracteres."
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getJwtSecret());

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const verified = await jwtVerify(
      token,
      getJwtSecret(),
      { algorithms: ["HS256"] }
    );

    const userId = verified.payload.userId;

    if (
      !userId ||
      typeof userId !== "string"
    ) {
      return null;
    }

    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(
  allowedRoles: readonly UserRole[]
) {
  const user = await requireUser();

  if (!allowedRoles.includes(user.role)) {
    if (user.role === UserRole.ESSAY_CORRECTOR) {
      redirect("/redacoes");
    }

    redirect("/");
  }

  return user;
}

export async function requireAcademicAccess() {
  return requireRole([
    UserRole.ADMIN,
    UserRole.TEACHER,
  ]);
}

export async function requireEssayAccess() {
  return requireRole([
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.ESSAY_CORRECTOR,
  ]);
}
