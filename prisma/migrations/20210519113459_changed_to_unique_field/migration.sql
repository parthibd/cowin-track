/*
  Warnings:

  - A unique constraint covering the columns `[telegramId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `User.telegramId_unique` ON `User`(`telegramId`);

-- RedefineIndex
CREATE UNIQUE INDEX `ConversationState.userId_unique` ON `ConversationState`(`userId`);
DROP INDEX `ConversationState_userId_unique` ON `conversationstate`;
