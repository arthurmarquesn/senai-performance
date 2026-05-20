-- CreateTable
CREATE TABLE `Book` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `author` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` ENUM('LITERATURA_BRASILEIRA', 'LITERATURA_PORTUGUESA', 'CLASSICO_UNIVERSAL', 'FILOSOFIA', 'SOCIOLOGIA', 'REPERTORIO_ENEM') NOT NULL,
    `type` ENUM('ROMANCE', 'CONTO', 'POESIA', 'TEATRO', 'ENSAIO', 'FILOSOFIA', 'POLITICA') NOT NULL,
    `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
    `literarySchool` VARCHAR(191) NULL,
    `originalYear` INTEGER NULL,
    `publicDomain` BOOLEAN NOT NULL DEFAULT true,
    `sourceUrl` VARCHAR(191) NULL,
    `vestibularRelevance` VARCHAR(191) NULL,
    `enemRelevance` TEXT NULL,
    `themes` TEXT NULL,
    `readingTimeMinutes` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Book_title_author_key`(`title`, `author`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookProgress` (
    `id` VARCHAR(191) NOT NULL,
    `bookId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `status` ENUM('WANT_TO_READ', 'READING', 'FINISHED', 'PAUSED') NOT NULL DEFAULT 'WANT_TO_READ',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BookProgress_bookId_studentId_key`(`bookId`, `studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BookProgress` ADD CONSTRAINT `BookProgress_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `Book`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookProgress` ADD CONSTRAINT `BookProgress_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `redacoes_aluno_id_idx` ON `redacoes`(`aluno_id`);
DROP INDEX `aluno_id` ON `redacoes`;

-- RedefineIndex
CREATE INDEX `redacoes_simulado_id_idx` ON `redacoes`(`simulado_id`);
DROP INDEX `simulado_id` ON `redacoes`;

-- RedefineIndex
CREATE INDEX `resultados_aluno_id_idx` ON `resultados`(`aluno_id`);
DROP INDEX `aluno_id` ON `resultados`;

-- RedefineIndex
CREATE INDEX `resultados_simulado_id_idx` ON `resultados`(`simulado_id`);
DROP INDEX `simulado_id` ON `resultados`;
