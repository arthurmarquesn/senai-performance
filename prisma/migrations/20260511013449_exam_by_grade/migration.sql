/*
  Warnings:

  - You are about to drop the column `classRoomId` on the `exam` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `exam` DROP FOREIGN KEY `Exam_classRoomId_fkey`;

-- DropIndex
DROP INDEX `Exam_classRoomId_fkey` ON `exam`;

-- AlterTable
ALTER TABLE `exam` DROP COLUMN `classRoomId`,
    ADD COLUMN `grade` INTEGER NOT NULL DEFAULT 2;
