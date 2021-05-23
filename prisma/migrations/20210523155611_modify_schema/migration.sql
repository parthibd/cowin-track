/*
  Warnings:

  - Added the required column `vaccine` to the `UserNotificationDetail` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `usernotificationdetail` ADD COLUMN `vaccine` VARCHAR(191) NOT NULL;
