-- CreateTable
CREATE TABLE `GoogleClassroomConnection` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `refreshTokenEncrypted` TEXT NOT NULL,
    `grantedScopes` TEXT NULL,
    `status` ENUM('CONNECTED', 'REAUTH_REQUIRED', 'REVOKED') NOT NULL DEFAULT 'CONNECTED',
    `connectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GoogleClassroomConnection_userId_key`(`userId`),
    INDEX `GoogleClassroomConnection_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassroomPublication` (
    `id` VARCHAR(191) NOT NULL,
    `journeyActivityId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `googleCourseId` VARCHAR(255) NOT NULL,
    `googleCourseName` VARCHAR(500) NULL,
    `googleCourseWorkId` VARCHAR(255) NULL,
    `googleCourseWorkState` VARCHAR(50) NULL,
    `status` ENUM('PENDING', 'CREATED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `errorMessage` TEXT NULL,
    `classroomCreatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClassroomPublication_journeyActivityId_idx`(`journeyActivityId`),
    INDEX `ClassroomPublication_createdById_idx`(`createdById`),
    INDEX `ClassroomPublication_googleCourseId_idx`(`googleCourseId`),
    INDEX `ClassroomPublication_googleCourseWorkId_idx`(`googleCourseWorkId`),
    INDEX `ClassroomPublication_status_idx`(`status`),
    UNIQUE INDEX `ClassroomPublication_journeyActivityId_googleCourseId_key`(`journeyActivityId`, `googleCourseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GoogleClassroomConnection` ADD CONSTRAINT `GoogleClassroomConnection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassroomPublication` ADD CONSTRAINT `ClassroomPublication_journeyActivityId_fkey` FOREIGN KEY (`journeyActivityId`) REFERENCES `JourneyActivity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassroomPublication` ADD CONSTRAINT `ClassroomPublication_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
