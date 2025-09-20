-- CreateTable
CREATE TABLE "ContractBasicInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "contractNumber" TEXT,
    "contractName" TEXT,
    "partyA" TEXT,
    "partyB" TEXT,
    "contractStartDate" TEXT,
    "contractEndDate" TEXT,
    "contractTotalAmount" REAL,
    "contractPaymentMethod" TEXT,
    "contractCurrency" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContractBasicInfo_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractBasicInfo_contractId_key" ON "ContractBasicInfo"("contractId");

-- CreateIndex
CREATE INDEX "ContractBasicInfo_contractName_idx" ON "ContractBasicInfo"("contractName");

-- CreateIndex
CREATE INDEX "ContractBasicInfo_contractNumber_idx" ON "ContractBasicInfo"("contractNumber");
