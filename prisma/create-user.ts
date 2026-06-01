import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const senhaHash = await bcrypt.hash("senai928", 10);

  const usuarios = [
    "alexandre.asantos@sp.senai.br",
    "gabriel.smoraes@sp.senai.br",
    "simone.almeida@sp.senai.br",
    "fabio.ramos@sp.senai.br",
    "fabricio.oliveira@sp.senai.br",
    "liliana.monetta@sp.senai.br",
    "karime.nogueira@sp.senai.br",
    "juliana.antoniassi@sp.senai.br",
    "marcos.gomes@sp.senai.br",
    "grazielle.gimenez@sp.senai.br",
    "livia.ribeiro@sp.senai.br",
    "julio.neto@sp.senai.br",
    "anacarolina@sp.senai.br",
  ];

  for (const email of usuarios) {
    const nome = email
      .split("@")[0]
      .replace(/\./g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    await prisma.user.upsert({
      where: {
        email,
      },
      update: {},
      create: {
        name: nome,
        email,
        password: senhaHash,
        role: UserRole.TEACHER,
      },
    });

    console.log(`✅ Usuário criado: ${email}`);
  }

  console.log("\n🎉 Processo finalizado.");
  console.log("Senha padrão: senai928");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
