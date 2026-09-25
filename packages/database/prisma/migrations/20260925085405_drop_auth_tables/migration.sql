/*
  Warnings:

  - You are about to drop the `Availability` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Token` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User_profile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `User_profile` DROP FOREIGN KEY `User_profile_address_id_fkey`;

-- DropTable
DROP TABLE `Availability`;

-- DropTable
DROP TABLE `Token`;

-- DropTable
DROP TABLE `User`;

-- DropTable
DROP TABLE `User_profile`;
