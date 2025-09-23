-- CreateTable: ContractComplianceInfo
CREATE TABLE "ContractComplianceInfo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contractId" TEXT NOT NULL UNIQUE,
  "informationConfidentialityRequirements" INTEGER,
  "liabilityOfBreach" TEXT,
  "partsReturnRequirements" TEXT,
  "deliveryRequirements" TEXT,
  "transportationInsurance" TEXT,
  "deliveryLocation" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ContractComplianceInfo_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: ContractAfterSalesSupportInfo
CREATE TABLE "ContractAfterSalesSupportInfo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contractId" TEXT NOT NULL UNIQUE,
  "guaranteeRunningRate" REAL,
  "guaranteeMechanism" TEXT,
  "serviceReportForm" TEXT,
  "remoteService" TEXT,
  "hotlineSupport" TEXT,
  "taxFreePartsPriority" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ContractAfterSalesSupportInfo_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

