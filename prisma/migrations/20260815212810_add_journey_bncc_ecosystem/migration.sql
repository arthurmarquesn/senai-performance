-- CreateTable
CREATE TABLE `TeacherProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `subject` ENUM('MATEMATICA', 'FISICA', 'QUIMICA', 'BIOLOGIA', 'PORTUGUES', 'INGLES', 'ARTES', 'EDUCACAO_FISICA', 'SOCIOLOGIA', 'FILOSOFIA', 'GEOGRAFIA', 'HISTORIA') NOT NULL,
    `area` ENUM('LINGUAGENS', 'MATEMATICA', 'CIENCIAS_DA_NATUREZA', 'CIENCIAS_HUMANAS') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TeacherProfile_userId_key`(`userId`),
    INDEX `TeacherProfile_subject_idx`(`subject`),
    INDEX `TeacherProfile_area_idx`(`area`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Journey` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `description` TEXT NULL,
    `grade` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'IN_ANALYSIS', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Journey_grade_idx`(`grade`),
    INDEX `Journey_status_idx`(`status`),
    INDEX `Journey_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JourneyTeacher` (
    `id` VARCHAR(191) NOT NULL,
    `journeyId` VARCHAR(191) NOT NULL,
    `teacherProfileId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `JourneyTeacher_journeyId_idx`(`journeyId`),
    INDEX `JourneyTeacher_teacherProfileId_idx`(`teacherProfileId`),
    UNIQUE INDEX `JourneyTeacher_journeyId_teacherProfileId_key`(`journeyId`, `teacherProfileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JourneyDocument` (
    `id` VARCHAR(191) NOT NULL,
    `journeyId` VARCHAR(191) NOT NULL,
    `type` ENUM('FILE', 'TEXT') NOT NULL DEFAULT 'FILE',
    `fileName` VARCHAR(255) NULL,
    `mimeType` VARCHAR(120) NULL,
    `storageKey` VARCHAR(500) NULL,
    `sha256` VARCHAR(64) NULL,
    `sourceText` LONGTEXT NULL,
    `extractedText` LONGTEXT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'READY', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JourneyDocument_journeyId_idx`(`journeyId`),
    INDEX `JourneyDocument_status_idx`(`status`),
    INDEX `JourneyDocument_sha256_idx`(`sha256`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JourneyDocumentChunk` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `chunkIndex` INTEGER NOT NULL,
    `pageNumber` INTEGER NULL,
    `locator` VARCHAR(255) NULL,
    `text` LONGTEXT NOT NULL,
    `textHash` VARCHAR(64) NULL,
    `embeddingRef` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `JourneyDocumentChunk_documentId_idx`(`documentId`),
    INDEX `JourneyDocumentChunk_pageNumber_idx`(`pageNumber`),
    INDEX `JourneyDocumentChunk_textHash_idx`(`textHash`),
    UNIQUE INDEX `JourneyDocumentChunk_documentId_chunkIndex_key`(`documentId`, `chunkIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JourneyAnalysis` (
    `id` VARCHAR(191) NOT NULL,
    `journeyId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `provider` VARCHAR(80) NULL,
    `modelName` VARCHAR(120) NULL,
    `promptVersion` VARCHAR(80) NULL,
    `inputHash` VARCHAR(64) NULL,
    `summary` LONGTEXT NULL,
    `output` JSON NULL,
    `errorMessage` TEXT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JourneyAnalysis_journeyId_idx`(`journeyId`),
    INDEX `JourneyAnalysis_status_idx`(`status`),
    INDEX `JourneyAnalysis_inputHash_idx`(`inputHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JourneyMindMap` (
    `id` VARCHAR(191) NOT NULL,
    `journeyId` VARCHAR(191) NOT NULL,
    `analysisId` VARCHAR(191) NULL,
    `title` VARCHAR(220) NOT NULL,
    `structure` JSON NOT NULL,
    `schemaVersion` INTEGER NOT NULL DEFAULT 1,
    `version` INTEGER NOT NULL DEFAULT 1,
    `isCurrent` BOOLEAN NOT NULL DEFAULT true,
    `generatedByAi` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JourneyMindMap_journeyId_idx`(`journeyId`),
    INDEX `JourneyMindMap_analysisId_idx`(`analysisId`),
    INDEX `JourneyMindMap_isCurrent_idx`(`isCurrent`),
    UNIQUE INDEX `JourneyMindMap_journeyId_version_key`(`journeyId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JourneySuggestion` (
    `id` VARCHAR(191) NOT NULL,
    `journeyId` VARCHAR(191) NOT NULL,
    `analysisId` VARCHAR(191) NULL,
    `journeyTeacherId` VARCHAR(191) NULL,
    `subject` ENUM('MATEMATICA', 'FISICA', 'QUIMICA', 'BIOLOGIA', 'PORTUGUES', 'INGLES', 'ARTES', 'EDUCACAO_FISICA', 'SOCIOLOGIA', 'FILOSOFIA', 'GEOGRAFIA', 'HISTORIA') NOT NULL,
    `type` ENUM('CONTENT', 'INTERDISCIPLINARY_CONNECTION', 'REFERENCE', 'CLASSROOM_POSSIBILITY', 'SOCIOCULTURAL_REPERTOIRE', 'WRITING_THEME') NOT NULL,
    `title` VARCHAR(220) NOT NULL,
    `objective` TEXT NULL,
    `content` LONGTEXT NOT NULL,
    `rationale` LONGTEXT NULL,
    `contentTopics` JSON NULL,
    `evidenceChunkId` VARCHAR(191) NULL,
    `evidence` TEXT NULL,
    `status` ENUM('SUGGESTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'SUGGESTED',
    `validatedById` VARCHAR(191) NULL,
    `validatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JourneySuggestion_journeyId_idx`(`journeyId`),
    INDEX `JourneySuggestion_analysisId_idx`(`analysisId`),
    INDEX `JourneySuggestion_journeyTeacherId_idx`(`journeyTeacherId`),
    INDEX `JourneySuggestion_subject_idx`(`subject`),
    INDEX `JourneySuggestion_status_idx`(`status`),
    INDEX `JourneySuggestion_evidenceChunkId_idx`(`evidenceChunkId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BnccSource` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `publisher` VARCHAR(120) NOT NULL DEFAULT 'MEC',
    `type` ENUM('OFFICIAL_PDF', 'OFFICIAL_PORTAL', 'OFFICIAL_DATASET') NOT NULL,
    `status` ENUM('IMPORTED', 'VERIFIED', 'SUPERSEDED', 'REJECTED') NOT NULL DEFAULT 'IMPORTED',
    `officialUrl` VARCHAR(500) NOT NULL,
    `storageKey` VARCHAR(500) NULL,
    `versionLabel` VARCHAR(120) NULL,
    `publishedAt` DATETIME(3) NULL,
    `retrievedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verifiedAt` DATETIME(3) NULL,
    `sha256` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BnccSource_sha256_key`(`sha256`),
    INDEX `BnccSource_status_idx`(`status`),
    INDEX `BnccSource_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BnccSkill` (
    `id` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `stage` ENUM('ENSINO_MEDIO') NOT NULL DEFAULT 'ENSINO_MEDIO',
    `area` ENUM('LINGUAGENS', 'MATEMATICA', 'CIENCIAS_DA_NATUREZA', 'CIENCIAS_HUMANAS') NOT NULL,
    `subject` ENUM('MATEMATICA', 'FISICA', 'QUIMICA', 'BIOLOGIA', 'PORTUGUES', 'INGLES', 'ARTES', 'EDUCACAO_FISICA', 'SOCIOLOGIA', 'FILOSOFIA', 'GEOGRAFIA', 'HISTORIA') NULL,
    `description` TEXT NOT NULL,
    `competencyCode` VARCHAR(40) NULL,
    `competencyText` TEXT NULL,
    `sourcePage` INTEGER NULL,
    `sourceLocator` VARCHAR(255) NULL,
    `officialTextHash` VARCHAR(64) NULL,
    `searchText` LONGTEXT NULL,
    `isCurrent` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BnccSkill_code_idx`(`code`),
    INDEX `BnccSkill_stage_idx`(`stage`),
    INDEX `BnccSkill_area_idx`(`area`),
    INDEX `BnccSkill_subject_idx`(`subject`),
    INDEX `BnccSkill_isCurrent_idx`(`isCurrent`),
    UNIQUE INDEX `BnccSkill_sourceId_code_key`(`sourceId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JourneyBnccLink` (
    `id` VARCHAR(191) NOT NULL,
    `suggestionId` VARCHAR(191) NOT NULL,
    `bnccSkillId` VARCHAR(191) NOT NULL,
    `analysisId` VARCHAR(191) NULL,
    `evidenceChunkId` VARCHAR(191) NULL,
    `evidenceExcerpt` TEXT NULL,
    `retrievalScore` DOUBLE NULL,
    `aiRelevanceScore` DOUBLE NULL,
    `confidence` ENUM('HIGH', 'MEDIUM', 'LOW') NULL,
    `candidateRank` INTEGER NULL,
    `justification` LONGTEXT NULL,
    `status` ENUM('SUGGESTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'SUGGESTED',
    `validatedById` VARCHAR(191) NULL,
    `validatedAt` DATETIME(3) NULL,
    `validationNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JourneyBnccLink_bnccSkillId_idx`(`bnccSkillId`),
    INDEX `JourneyBnccLink_analysisId_idx`(`analysisId`),
    INDEX `JourneyBnccLink_evidenceChunkId_idx`(`evidenceChunkId`),
    INDEX `JourneyBnccLink_status_idx`(`status`),
    INDEX `JourneyBnccLink_confidence_idx`(`confidence`),
    UNIQUE INDEX `JourneyBnccLink_suggestionId_bnccSkillId_key`(`suggestionId`, `bnccSkillId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JourneyActivity` (
    `id` VARCHAR(191) NOT NULL,
    `journeyId` VARCHAR(191) NOT NULL,
    `teacherProfileId` VARCHAR(191) NULL,
    `subject` ENUM('MATEMATICA', 'FISICA', 'QUIMICA', 'BIOLOGIA', 'PORTUGUES', 'INGLES', 'ARTES', 'EDUCACAO_FISICA', 'SOCIOLOGIA', 'FILOSOFIA', 'GEOGRAFIA', 'HISTORIA') NOT NULL,
    `title` VARCHAR(220) NOT NULL,
    `objective` TEXT NULL,
    `instructions` LONGTEXT NULL,
    `materials` JSON NULL,
    `status` ENUM('DRAFT', 'APPROVED', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `generatedByAi` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JourneyActivity_journeyId_idx`(`journeyId`),
    INDEX `JourneyActivity_teacherProfileId_idx`(`teacherProfileId`),
    INDEX `JourneyActivity_subject_idx`(`subject`),
    INDEX `JourneyActivity_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JourneyActivityBnccSkill` (
    `journeyActivityId` VARCHAR(191) NOT NULL,
    `bnccSkillId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `JourneyActivityBnccSkill_bnccSkillId_idx`(`bnccSkillId`),
    PRIMARY KEY (`journeyActivityId`, `bnccSkillId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TeacherProfile` ADD CONSTRAINT `TeacherProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Journey` ADD CONSTRAINT `Journey_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyTeacher` ADD CONSTRAINT `JourneyTeacher_journeyId_fkey` FOREIGN KEY (`journeyId`) REFERENCES `Journey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyTeacher` ADD CONSTRAINT `JourneyTeacher_teacherProfileId_fkey` FOREIGN KEY (`teacherProfileId`) REFERENCES `TeacherProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyDocument` ADD CONSTRAINT `JourneyDocument_journeyId_fkey` FOREIGN KEY (`journeyId`) REFERENCES `Journey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyDocumentChunk` ADD CONSTRAINT `JourneyDocumentChunk_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `JourneyDocument`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyAnalysis` ADD CONSTRAINT `JourneyAnalysis_journeyId_fkey` FOREIGN KEY (`journeyId`) REFERENCES `Journey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyMindMap` ADD CONSTRAINT `JourneyMindMap_journeyId_fkey` FOREIGN KEY (`journeyId`) REFERENCES `Journey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyMindMap` ADD CONSTRAINT `JourneyMindMap_analysisId_fkey` FOREIGN KEY (`analysisId`) REFERENCES `JourneyAnalysis`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneySuggestion` ADD CONSTRAINT `JourneySuggestion_journeyId_fkey` FOREIGN KEY (`journeyId`) REFERENCES `Journey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneySuggestion` ADD CONSTRAINT `JourneySuggestion_analysisId_fkey` FOREIGN KEY (`analysisId`) REFERENCES `JourneyAnalysis`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneySuggestion` ADD CONSTRAINT `JourneySuggestion_journeyTeacherId_fkey` FOREIGN KEY (`journeyTeacherId`) REFERENCES `JourneyTeacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneySuggestion` ADD CONSTRAINT `JourneySuggestion_evidenceChunkId_fkey` FOREIGN KEY (`evidenceChunkId`) REFERENCES `JourneyDocumentChunk`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneySuggestion` ADD CONSTRAINT `JourneySuggestion_validatedById_fkey` FOREIGN KEY (`validatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BnccSkill` ADD CONSTRAINT `BnccSkill_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `BnccSource`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyBnccLink` ADD CONSTRAINT `JourneyBnccLink_suggestionId_fkey` FOREIGN KEY (`suggestionId`) REFERENCES `JourneySuggestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyBnccLink` ADD CONSTRAINT `JourneyBnccLink_bnccSkillId_fkey` FOREIGN KEY (`bnccSkillId`) REFERENCES `BnccSkill`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyBnccLink` ADD CONSTRAINT `JourneyBnccLink_analysisId_fkey` FOREIGN KEY (`analysisId`) REFERENCES `JourneyAnalysis`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyBnccLink` ADD CONSTRAINT `JourneyBnccLink_evidenceChunkId_fkey` FOREIGN KEY (`evidenceChunkId`) REFERENCES `JourneyDocumentChunk`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyBnccLink` ADD CONSTRAINT `JourneyBnccLink_validatedById_fkey` FOREIGN KEY (`validatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyActivity` ADD CONSTRAINT `JourneyActivity_journeyId_fkey` FOREIGN KEY (`journeyId`) REFERENCES `Journey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyActivity` ADD CONSTRAINT `JourneyActivity_teacherProfileId_fkey` FOREIGN KEY (`teacherProfileId`) REFERENCES `TeacherProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyActivityBnccSkill` ADD CONSTRAINT `JourneyActivityBnccSkill_journeyActivityId_fkey` FOREIGN KEY (`journeyActivityId`) REFERENCES `JourneyActivity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JourneyActivityBnccSkill` ADD CONSTRAINT `JourneyActivityBnccSkill_bnccSkillId_fkey` FOREIGN KEY (`bnccSkillId`) REFERENCES `BnccSkill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
