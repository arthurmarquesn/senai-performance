import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

function readLines(fileName: string) {
  const filePath = path.join(process.cwd(), "prisma", "import", fileName);

  return fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function importAlunos() {
  const lines = readLines("alunos.txt");

  for (const line of lines) {
    const [id, nome, tecnico, serie] = line.split("\t");

    if (!id || !nome || !tecnico || !serie) {
      console.warn("Aluno ignorado:", line);
      continue;
    }

    await prisma.legacyAluno.upsert({
      where: {
        id: Number(id),
      },
      update: {
        nome,
        tecnico,
        serie,
      },
      create: {
        id: Number(id),
        nome,
        tecnico,
        serie,
      },
    });
  }

  console.log("Alunos importados.");
}

async function importSimulados() {
  const simulados = [
    {
      id: 44,
      jornada: "As Descobertas",
      numeroProva: 1,
      serie: "primeiro",
    },
    {
      id: 43,
      jornada: "Si 928",
      numeroProva: 1,
      serie: "terceiro",
    },
    {
      id: 70,
      jornada: "SI928",
      numeroProva: 1,
      serie: "terceiro",
    },
  ];

  for (const simulado of simulados) {
    await prisma.legacySimulado.upsert({
      where: {
        id: simulado.id,
      },
      update: {
        jornada: simulado.jornada,
        numeroProva: simulado.numeroProva,
        serie: simulado.serie,
      },
      create: simulado,
    });
  }

  console.log("Simulados importados.");
}

async function importResultados() {
  const lines = readLines("resultados.txt");

  for (const line of lines) {
    const values = line.split(/\s+/).map(Number);

    if (values.length !== 18) {
      console.warn("Resultado ignorado:", line);
      continue;
    }

    const [
      id,
      alunoId,
      simuladoId,
      matematica,
      portugues,
      biologia,
      fisica,
      quimica,
      ingles,
      sociologia,
      filosofia,
      historia,
      geografia,
      educacaoFisica,
      artes,
      totalAcertos,
      totalErros,
      totalQuestoes,
    ] = values;

    await prisma.legacyResultado.upsert({
      where: {
        id,
      },
      update: {
        alunoId,
        simuladoId,
        matematica,
        portugues,
        biologia,
        fisica,
        quimica,
        ingles,
        sociologia,
        filosofia,
        historia,
        geografia,
        educacaoFisica,
        artes,
        totalAcertos,
        totalErros,
        totalQuestoes,
      },
      create: {
        id,
        alunoId,
        simuladoId,
        matematica,
        portugues,
        biologia,
        fisica,
        quimica,
        ingles,
        sociologia,
        filosofia,
        historia,
        geografia,
        educacaoFisica,
        artes,
        totalAcertos,
        totalErros,
        totalQuestoes,
      },
    });
  }

  console.log("Resultados importados.");
}

async function main() {
  await importAlunos();
  await importSimulados();
  await importResultados();

  console.log("Importação legada concluída.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });