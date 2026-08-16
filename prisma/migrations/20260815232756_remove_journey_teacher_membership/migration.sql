/*
  Warnings:

  - You are about to drop the column `journeyTeacherId` on the `journeysuggestion` table. All the data in the column will be lost.
  - You are about to drop the `journeyteacher` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `journeysuggestion` DROP FOREIGN KEY `JourneySuggestion_journeyTeacherId_fkey`;

-- DropForeignKey
ALTER TABLE `journeyteacher` DROP FOREIGN KEY `JourneyTeacher_journeyId_fkey`;

-- DropForeignKey
ALTER TABLE `journeyteacher` DROP FOREIGN KEY `JourneyTeacher_teacherProfileId_fkey`;

-- DropIndex
DROP INDEX `JourneySuggestion_journeyTeacherId_idx` ON `journeysuggestion`;

-- AlterTable
ALTER TABLE `journeysuggestion` DROP COLUMN `journeyTeacherId`;

-- DropTable
DROP TABLE `journeyteacher`;
