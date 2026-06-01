import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.classRoom.createMany({
    data: [
      { name: "IDEV-3", grade: 3 },
      { name: "IDEV-4", grade: 2 },
      { name: "IDEV-5", grade: 1 },
      { name: "IELEMEC-3", grade: 3 },
      { name: "IELEMEC-4", grade: 2 },
      { name: "IELEMEC-5", grade: 1 },
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