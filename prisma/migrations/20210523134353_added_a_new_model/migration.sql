-- AddForeignKey
ALTER TABLE `UserNotificationDetail` ADD FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
