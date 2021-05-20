/*
  Warnings:

  - You are about to alter the column `stateId` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `districtId` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `user` MODIFY `stateId` INTEGER,
    MODIFY `districtId` INTEGER;
