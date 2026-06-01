/*
  Warnings:

  - You are about to drop the column `classRoomId` on the `Exam` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Exam` DROP FOREIGN KEY `Exam_classRoomId_fkey`;

-- DropIndex
DROP INDEX `Exam_classRoomId_fkey` ON `Exam`;

-- AlterTable
ALTER TABLE `Exam` DROP COLUMN `classRoomId`,
    ADD COLUMN `grade` INTEGER NOT NULL DEFAULT 2;
