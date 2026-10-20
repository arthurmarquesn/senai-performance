-- CreateTable
CREATE TABLE `TeacherPerformanceBand` (
    `id` VARCHAR(191) NOT NULL,
    `teacherProfileId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `minPercentage` INTEGER NOT NULL,
    `maxPercentage` INTEGER NOT NULL,
    `requiresComplementaryActivity` BOOLEAN NOT NULL DEFAULT false,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeacherPerformanceBand_teacherProfileId_idx`(`teacherProfileId`),
    INDEX `TeacherPerformanceBand_teacherProfileId_position_idx`(`teacherProfileId`, `position`),
    INDEX `TeacherPerformanceBand_requiresComplementaryActivity_idx`(`requiresComplementaryActivity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TeacherPerformanceBand` ADD CONSTRAINT `TeacherPerformanceBand_teacherProfileId_fkey` FOREIGN KEY (`teacherProfileId`) REFERENCES `TeacherProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
