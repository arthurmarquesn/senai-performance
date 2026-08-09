-- CreateTable
CREATE TABLE `ExamApplication` (
    `id` VARCHAR(191) NOT NULL,
    `examId` VARCHAR(191) NOT NULL,
    `classRoomId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExamApplication_examId_idx`(`examId`),
    INDEX `ExamApplication_classRoomId_idx`(`classRoomId`),
    UNIQUE INDEX `ExamApplication_examId_classRoomId_key`(`examId`, `classRoomId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnswerSheet` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `examApplicationId` VARCHAR(191) NOT NULL,
    `status` ENUM('GENERATED', 'SCANNED', 'REVIEW_REQUIRED', 'CORRECTED') NOT NULL DEFAULT 'GENERATED',
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `scannedAt` DATETIME(3) NULL,
    `correctedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AnswerSheet_code_key`(`code`),
    INDEX `AnswerSheet_studentId_idx`(`studentId`),
    INDEX `AnswerSheet_examApplicationId_idx`(`examApplicationId`),
    UNIQUE INDEX `AnswerSheet_studentId_examApplicationId_key`(`studentId`, `examApplicationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ExamApplication` ADD CONSTRAINT `ExamApplication_examId_fkey` FOREIGN KEY (`examId`) REFERENCES `Exam`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamApplication` ADD CONSTRAINT `ExamApplication_classRoomId_fkey` FOREIGN KEY (`classRoomId`) REFERENCES `ClassRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnswerSheet` ADD CONSTRAINT `AnswerSheet_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnswerSheet` ADD CONSTRAINT `AnswerSheet_examApplicationId_fkey` FOREIGN KEY (`examApplicationId`) REFERENCES `ExamApplication`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
