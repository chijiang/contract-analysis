-- CreateTable: ContractDeviceInfo
CREATE TABLE "ContractDeviceInfo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contractId" TEXT NOT NULL,
  "deviceName" TEXT,
  "registrationNumber" TEXT,
  "deviceModel" TEXT,
  "geHostSystemNumber" TEXT,
  "installationDate" TEXT,
  "serviceStartDate" TEXT,
  "serviceEndDate" TEXT,
  "maintenanceFrequency" INTEGER,
  "responseTime" REAL,
  "arrivalTime" REAL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ContractDeviceInfo_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ContractDeviceInfo_contractId_idx" ON "ContractDeviceInfo" ("contractId");

-- CreateTable: ContractMaintenanceServiceInfo
CREATE TABLE "ContractMaintenanceServiceInfo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contractId" TEXT NOT NULL,
  "maintenanceScope" TEXT,
  "includedPartsJson" TEXT,
  "sparePartsSupport" TEXT,
  "deepMaintenance" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ContractMaintenanceServiceInfo_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ContractMaintenanceServiceInfo_contractId_idx" ON "ContractMaintenanceServiceInfo" ("contractId");

-- CreateTable: ContractDigitalSolutionInfo
CREATE TABLE "ContractDigitalSolutionInfo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contractId" TEXT NOT NULL,
  "softwareProductName" TEXT,
  "hardwareProductName" TEXT,
  "quantity" INTEGER,
  "servicePeriod" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ContractDigitalSolutionInfo_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ContractDigitalSolutionInfo_contractId_idx" ON "ContractDigitalSolutionInfo" ("contractId");

-- CreateTable: ContractTrainingSupportInfo
CREATE TABLE "ContractTrainingSupportInfo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contractId" TEXT NOT NULL,
  "trainingCategory" TEXT,
  "applicableDevicesJson" TEXT,
  "trainingTimes" INTEGER,
  "trainingPeriod" TEXT,
  "trainingDays" INTEGER,
  "trainingSeats" INTEGER,
  "trainingCost" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ContractTrainingSupportInfo_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ContractTrainingSupportInfo_contractId_idx" ON "ContractTrainingSupportInfo" ("contractId");

