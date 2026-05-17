import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: {
      email: "admin@sistema.local",
    },
    update: {
      password: passwordHash,
      role: "ADMIN",
    },
    create: {
      name: "Administrador",
      email: "admin@sistema.local",
      password: passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Usuário admin criado com sucesso.");
  console.log("Email: admin@sistema.local");
  console.log("Senha: admin123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });