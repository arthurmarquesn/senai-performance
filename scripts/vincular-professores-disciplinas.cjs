const {
  PrismaClient,
} = require("@prisma/client");

const prisma =
  new PrismaClient();

const professores = [
  {
    email:
      "alexandre.asantos@sp.senai.br",
    subject: "SOCIOLOGIA",
    area: "CIENCIAS_HUMANAS",
  },

  {
    email:
      "gabriel.smoraes@sp.senai.br",
    subject: "FILOSOFIA",
    area: "CIENCIAS_HUMANAS",
  },

  {
    email:
      "simone.almeida@sp.senai.br",
    subject: "HISTORIA",
    area: "CIENCIAS_HUMANAS",
  },

  {
    email:
      "fabio.ramos@sp.senai.br",
    subject: "INGLES",
    area: "LINGUAGENS",
  },

  {
    email:
      "fabricio.oliveira@sp.senai.br",
    subject: "EDUCACAO_FISICA",
    area: "LINGUAGENS",
  },

  {
    email:
      "liliana.monetta@sp.senai.br",
    subject: "ARTES",
    area: "LINGUAGENS",
  },

  {
    email:
      "karime.nogueira@sp.senai.br",
    subject: "PORTUGUES",
    area: "LINGUAGENS",
  },

  {
    email:
      "juliana.antoniassi@sp.senai.br",
    subject: "BIOLOGIA",
    area: "CIENCIAS_DA_NATUREZA",
  },

  {
    email:
      "marcos.gomes@sp.senai.br",
    subject: "QUIMICA",
    area: "CIENCIAS_DA_NATUREZA",
  },

  {
    email:
      "grazielle.gimenez@sp.senai.br",
    subject: "FISICA",
    area: "CIENCIAS_DA_NATUREZA",
  },

  {
    email:
      "livia.ribeiro@sp.senai.br",
    subject: "MATEMATICA",
    area: "MATEMATICA",
  },

  {
    email:
      "julio.neto@sp.senai.br",
    subject: "GEOGRAFIA",
    area: "CIENCIAS_HUMANAS",
  },
];

async function main() {
  console.log();
  console.log(
    "========================================",
  );

  console.log(
    "VINCULANDO PROFESSORES ÀS DISCIPLINAS",
  );

  console.log(
    "========================================",
  );

  console.log();

  let configurados = 0;
  let naoEncontrados = 0;
  let rolesInvalidas = 0;

  for (
    const professor
    of professores
  ) {
    console.log(
      `Buscando: ${professor.email}`,
    );

    const user =
      await prisma.user.findUnique({
        where: {
          email:
            professor.email,
        },

        select: {
          id: true,
          name: true,
          email: true,
          role: true,

          teacherProfile: {
            select: {
              id: true,
              subject: true,
              area: true,
            },
          },
        },
      });

    if (!user) {
      console.log(
        `❌ Usuário não encontrado: ${professor.email}`,
      );

      console.log();

      naoEncontrados++;

      continue;
    }

    if (
      user.role !==
      "TEACHER"
    ) {
      console.log(
        `⚠️ Usuário encontrado, mas role = ${user.role}`,
      );

      console.log(
        `   ${user.name} não foi alterado.`,
      );

      console.log();

      rolesInvalidas++;

      continue;
    }

    const profile =
      await prisma.teacherProfile.upsert({
        where: {
          userId:
            user.id,
        },

        update: {
          subject:
            professor.subject,

          area:
            professor.area,
        },

        create: {
          userId:
            user.id,

          subject:
            professor.subject,

          area:
            professor.area,
        },
      });

    console.log(
      `✅ ${user.name}`,
    );

    console.log(
      `   ${user.email}`,
    );

    console.log(
      `   Disciplina: ${profile.subject}`,
    );

    console.log(
      `   Área: ${profile.area}`,
    );

    console.log();

    configurados++;
  }

  console.log(
    "========================================",
  );

  console.log(
    "RESULTADO",
  );

  console.log(
    "========================================",
  );

  console.log(
    `Configurados: ${configurados}`,
  );

  console.log(
    `Não encontrados: ${naoEncontrados}`,
  );

  console.log(
    `Role diferente de TEACHER: ${rolesInvalidas}`,
  );

  console.log(
    `Total esperado: ${professores.length}`,
  );

  console.log();
}

main()
  .catch((error) => {
    console.error();
    console.error(
      "ERRO AO VINCULAR PROFESSORES:",
    );

    console.error(
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });