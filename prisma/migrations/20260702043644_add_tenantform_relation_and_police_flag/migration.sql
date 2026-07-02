/*
  Warnings:

  - A unique constraint covering the columns `[tenantId]` on the table `TenantForm` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `TenantForm` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TenantForm" ADD COLUMN     "submittedToPolice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TenantForm_tenantId_key" ON "TenantForm"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantForm" ADD CONSTRAINT "TenantForm_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
