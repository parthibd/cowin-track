/*
  Warnings:

  - Added the required column `sessionId` to the `UserNotificationDetail` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `usernotificationdetail` ADD COLUMN `sessionId` VARCHAR(191) NOT NULL;
