"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export type LoginState = {
  error?: string;
};

export async function login(
  previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return {
      error: "Preencha e-mail e senha para continuar.",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    return {
      error: "E-mail ou senha inválidos.",
    };
  }

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    return {
      error: "E-mail ou senha inválidos.",
    };
  }

  await createSession(user.id);

  redirect("/");
}