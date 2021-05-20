/*
  Warnings:

  - You are about to drop the column `state` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `district` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `state`,
    DROP COLUMN `district`,
    ADD COLUMN `stateId` VARCHAR(191),
    ADD COLUMN `districtId` VARCHAR(191);
