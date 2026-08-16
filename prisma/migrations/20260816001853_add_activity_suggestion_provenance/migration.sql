-- AlterTable
ALTER TABLE `journeyactivity` ADD COLUMN `suggestionId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `JourneyActivity_suggestionId_idx` ON `JourneyActivity`(`suggestionId`);

-- AddForeignKey
ALTER TABLE `JourneyActivity` ADD CONSTRAINT `JourneyActivity_suggestionId_fkey` FOREIGN KEY (`suggestionId`) REFERENCES `JourneySuggestion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
