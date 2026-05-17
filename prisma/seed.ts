import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.classRoom.createMany({
    data: [
      { name: "IDEV-1", grade: 1 },
      { name: "IDEV-2", grade: 2 },
      { name: "IDEV-3", grade: 3 },
      { name: "IELEMEC-1", grade: 1 },
      { name: "IELEMEC-2", grade: 2 },
      { name: "IELEMEC-3", grade: 3 },
    ],
    skipDuplicates: true,
  });

  const idev2 = await prisma.classRoom.findUnique({
    where: { name: "IDEV-2" },
  });

  if (!idev2) {
    throw new Error("Turma IDEV-2 não encontrada.");
  }

  await prisma.student.createMany({
    data: [
      { name: "João Silva", number: 1, classRoomId: idev2.id },
      { name: "Maria Oliveira", number: 2, classRoomId: idev2.id },
      { name: "Carlos Souza", number: 3, classRoomId: idev2.id },
    ],
    skipDuplicates: true,
  });

  console.log("Seed executada com sucesso.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });