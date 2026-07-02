-- AlterTable
ALTER TABLE "DriverInfo" ADD COLUMN     "nidNumber" TEXT;

-- AlterTable
ALTER TABLE "MaidInfo" ADD COLUMN     "nidNumber" TEXT;

-- AlterTable
ALTER TABLE "PresentHouseOwner" ADD COLUMN     "address" TEXT;

-- AlterTable
ALTER TABLE "PreviousHouseOwner" ADD COLUMN     "address" TEXT;

-- AlterTable
ALTER TABLE "TenantForm" ADD COLUMN     "areaName" TEXT,
ADD COLUMN     "division" TEXT,
ADD COLUMN     "flatFloor" TEXT,
ADD COLUMN     "houseNo" TEXT,
ADD COLUMN     "postCode" TEXT,
ADD COLUMN     "roadNo" TEXT,
ADD COLUMN     "thana" TEXT;
