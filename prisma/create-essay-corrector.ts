
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [, , emailArg, ...nameParts] = process.argv;

  const email = emailArg?.trim().toLowerCase();
  const name = nameParts.join(" ").trim();
  const password = process.env.CORRECTOR_PASSWORD;

  if (!email || !name || !password) {
    throw new Error(
      "Informe email, nome completo e CORRECTOR_PASSWORD."
    );
  }

  if (password.length < 12) {
    throw new Error(
      "A senha deve ter pelo menos 12 caracteres."
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error(
      "Este email já pertence a um usuário. Nenhuma alteração foi realizada."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      role: UserRole.ESSAY_CORRECTOR,
    },
  });

  console.log("Corretor cadastrado com sucesso.");
  console.log(`Nome: ${user.name}`);
  console.log(`Email: ${user.email}`);
  console.log(`Perfil: ${user.role}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
