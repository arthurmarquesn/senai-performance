-- CreateTable
CREATE TABLE `AnswerSheetScanBatch` (
    `id` VARCHAR(191) NOT NULL,
    `examApplicationId` VARCHAR(191) NOT NULL,
    `sourceFileName` VARCHAR(255) NOT NULL,
    `sourceFileKey` VARCHAR(500) NULL,
    `totalPages` INTEGER NOT NULL DEFAULT 0,
    `processedPages` INTEGER NOT NULL DEFAULT 0,
    `identifiedPages` INTEGER NOT NULL DEFAULT 0,
    `reviewRequiredPages` INTEGER NOT NULL DEFAULT 0,
    `confirmedPages` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('UPLOADED', 'PROCESSING', 'REVIEW_REQUIRED', 'READY_FOR_CONFIRMATION', 'CONFIRMED', 'FAILED') NOT NULL DEFAULT 'UPLOADED',
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AnswerSheetScanBatch_examApplicationId_idx`(`examApplicationId`),
    INDEX `AnswerSheetScanBatch_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnswerSheetScan` (
    `id` VARCHAR(191) NOT NULL,
    `scanBatchId` VARCHAR(191) NOT NULL,
    `pageNumber` INTEGER NOT NULL,
    `answerSheetId` VARCHAR(191) NULL,
    `detectedCode` VARCHAR(32) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'IDENTIFIED', 'PROCESSED', 'REVIEW_REQUIRED', 'CONFIRMED', 'DUPLICATE', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `qrConfidence` DOUBLE NULL,
    `alignmentConfidence` DOUBLE NULL,
    `overallConfidence` DOUBLE NULL,
    `rotationDegrees` DOUBLE NULL,
    `sourceImageKey` VARCHAR(500) NULL,
    `normalizedImageKey` VARCHAR(500) NULL,
    `processedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AnswerSheetScan_answerSheetId_idx`(`answerSheetId`),
    INDEX `AnswerSheetScan_detectedCode_idx`(`detectedCode`),
    INDEX `AnswerSheetScan_status_idx`(`status`),
    UNIQUE INDEX `AnswerSheetScan_scanBatchId_pageNumber_key`(`scanBatchId`, `pageNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetectedAnswer` (
    `id` VARCHAR(191) NOT NULL,
    `answerSheetScanId` VARCHAR(191) NOT NULL,
    `question` INTEGER NOT NULL,
    `detectedAnswer` ENUM('A', 'B', 'C', 'D', 'E') NULL,
    `detectionStatus` ENUM('DETECTED', 'BLANK', 'MULTIPLE', 'UNCERTAIN') NOT NULL,
    `confidence` DOUBLE NULL,
    `fillA` DOUBLE NULL,
    `fillB` DOUBLE NULL,
    `fillC` DOUBLE NULL,
    `fillD` DOUBLE NULL,
    `fillE` DOUBLE NULL,
    `finalAnswer` ENUM('A', 'B', 'C', 'D', 'E') NULL,
    `reviewed` BOOLEAN NOT NULL DEFAULT false,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DetectedAnswer_detectionStatus_idx`(`detectionStatus`),
    UNIQUE INDEX `DetectedAnswer_answerSheetScanId_question_key`(`answerSheetScanId`, `question`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AnswerSheetScanBatch` ADD CONSTRAINT `AnswerSheetScanBatch_examApplicationId_fkey` FOREIGN KEY (`examApplicationId`) REFERENCES `ExamApplication`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnswerSheetScan` ADD CONSTRAINT `AnswerSheetScan_scanBatchId_fkey` FOREIGN KEY (`scanBatchId`) REFERENCES `AnswerSheetScanBatch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnswerSheetScan` ADD CONSTRAINT `AnswerSheetScan_answerSheetId_fkey` FOREIGN KEY (`answerSheetId`) REFERENCES `AnswerSheet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetectedAnswer` ADD CONSTRAINT `DetectedAnswer_answerSheetScanId_fkey` FOREIGN KEY (`answerSheetScanId`) REFERENCES `AnswerSheetScan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
