/*
  Warnings:

  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.
    Event discussions now live in ms-chat-java.

*/
-- DropTable (its foreign key to Event goes with it)
DROP TABLE `Message`;
