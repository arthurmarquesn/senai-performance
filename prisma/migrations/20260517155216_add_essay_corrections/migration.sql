-- CreateTable
CREATE TABLE `EssayCorrection` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `examId` VARCHAR(191) NULL,
    `competency1` INTEGER NOT NULL DEFAULT 0,
    `competency2` INTEGER NOT NULL DEFAULT 0,
    `competency3` INTEGER NOT NULL DEFAULT 0,
    `competency4` INTEGER NOT NULL DEFAULT 0,
    `competency5` INTEGER NOT NULL DEFAULT 0,
    `totalScore` INTEGER NOT NULL DEFAULT 0,
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EssayCorrection_studentId_examId_key`(`studentId`, `examId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EssayCorrection` ADD CONSTRAINT `EssayCorrection_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EssayCorrection` ADD CONSTRAINT `EssayCorrection_examId_fkey` FOREIGN KEY (`examId`) REFERENCES `Exam`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
