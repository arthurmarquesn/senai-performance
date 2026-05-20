import { PrismaClient, BookCategory, BookDifficulty, BookType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.book.createMany({
    data: [
      {
        title: "Dom Casmurro",
        author: "Machado de Assis",
        category: BookCategory.LITERATURA_BRASILEIRA,
        type: BookType.ROMANCE,
        difficulty: BookDifficulty.MEDIUM,
        literarySchool: "Realismo",
        originalYear: 1899,
        enemRelevance:
          "Importante para vestibulares por abordar ciúme, memória, sociedade e construção narrativa.",
        themes:
          "Ciúme, memória, traição, sociedade brasileira.",
      },

      {
        title: "Memórias Póstumas de Brás Cubas",
        author: "Machado de Assis",
        category: BookCategory.LITERATURA_BRASILEIRA,
        type: BookType.ROMANCE,
        difficulty: BookDifficulty.HARD,
        literarySchool: "Realismo",
        originalYear: 1881,
        enemRelevance:
          "Extremamente recorrente em vestibulares e importante para interpretação crítica.",
        themes:
          "Ironia, elite brasileira, existência, crítica social.",
      },

      {
        title: "A República",
        author: "Platão",
        category: BookCategory.FILOSOFIA,
        type: BookType.FILOSOFIA,
        difficulty: BookDifficulty.HARD,
        originalYear: -380,
        enemRelevance:
          "Fundamental para compreender política, epistemologia e o Mito da Caverna.",
        themes:
          "Justiça, política, verdade, educação.",
      },

      {
        title: "O Príncipe",
        author: "Nicolau Maquiavel",
        category: BookCategory.FILOSOFIA,
        type: BookType.POLITICA,
        difficulty: BookDifficulty.MEDIUM,
        originalYear: 1532,
        enemRelevance:
          "Muito usado em filosofia política e discussões sobre poder.",
        themes:
          "Estado, poder, liderança, política.",
      },
    ],
  });

  console.log("Livros inseridos.");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });