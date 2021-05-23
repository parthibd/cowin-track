-- CreateTable
CREATE TABLE `UserNotificationDetail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `centerId` INTEGER NOT NULL,
    `minimumAgeLimit` INTEGER NOT NULL,
    `availableCapacity` INTEGER NOT NULL,
    `dateOfVaccination` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
