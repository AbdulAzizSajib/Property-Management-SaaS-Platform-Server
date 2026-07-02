-- CreateTable
CREATE TABLE "TenantForm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fatherName" TEXT NOT NULL,
    "motherName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "maritalStatus" TEXT,
    "parmanentAddress" TEXT,
    "occupationAndAddress" TEXT,
    "religion" TEXT,
    "educationalQualification" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "nidNumber" TEXT,
    "passportNumber" TEXT,
    "reasonForMoving" TEXT,
    "rentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "TenantForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "relationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantFormId" TEXT NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" TIMESTAMP(3),
    "relationship" TEXT,
    "occupation" TEXT,
    "contactNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantFormId" TEXT NOT NULL,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaidInfo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" TIMESTAMP(3),
    "contactNumber" TEXT,
    "parmanentAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantFormId" TEXT NOT NULL,

    CONSTRAINT "MaidInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverInfo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" TIMESTAMP(3),
    "contactNumber" TEXT,
    "parmanentAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantFormId" TEXT NOT NULL,

    CONSTRAINT "DriverInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreviousHouseOwner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantFormId" TEXT NOT NULL,

    CONSTRAINT "PreviousHouseOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresentHouseOwner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantFormId" TEXT NOT NULL,

    CONSTRAINT "PresentHouseOwner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantForm_organizationId_idx" ON "TenantForm"("organizationId");

-- CreateIndex
CREATE INDEX "TenantForm_phone_idx" ON "TenantForm"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyContact_tenantFormId_key" ON "EmergencyContact"("tenantFormId");

-- CreateIndex
CREATE INDEX "FamilyMember_tenantFormId_idx" ON "FamilyMember"("tenantFormId");

-- CreateIndex
CREATE UNIQUE INDEX "MaidInfo_tenantFormId_key" ON "MaidInfo"("tenantFormId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverInfo_tenantFormId_key" ON "DriverInfo"("tenantFormId");

-- CreateIndex
CREATE UNIQUE INDEX "PreviousHouseOwner_tenantFormId_key" ON "PreviousHouseOwner"("tenantFormId");

-- CreateIndex
CREATE UNIQUE INDEX "PresentHouseOwner_tenantFormId_key" ON "PresentHouseOwner"("tenantFormId");

-- AddForeignKey
ALTER TABLE "TenantForm" ADD CONSTRAINT "TenantForm_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_tenantFormId_fkey" FOREIGN KEY ("tenantFormId") REFERENCES "TenantForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_tenantFormId_fkey" FOREIGN KEY ("tenantFormId") REFERENCES "TenantForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaidInfo" ADD CONSTRAINT "MaidInfo_tenantFormId_fkey" FOREIGN KEY ("tenantFormId") REFERENCES "TenantForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverInfo" ADD CONSTRAINT "DriverInfo_tenantFormId_fkey" FOREIGN KEY ("tenantFormId") REFERENCES "TenantForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreviousHouseOwner" ADD CONSTRAINT "PreviousHouseOwner_tenantFormId_fkey" FOREIGN KEY ("tenantFormId") REFERENCES "TenantForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentHouseOwner" ADD CONSTRAINT "PresentHouseOwner_tenantFormId_fkey" FOREIGN KEY ("tenantFormId") REFERENCES "TenantForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
