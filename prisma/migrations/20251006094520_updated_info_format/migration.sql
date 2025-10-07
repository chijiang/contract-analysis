-- CreateTable
CREATE TABLE "ContractServiceInfoSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContractServiceInfoSnapshot_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractServiceInfoSnapshot_contractId_key" ON "ContractServiceInfoSnapshot"("contractId");

-- CreateIndex
CREATE INDEX "ContractServiceInfoSnapshot_contractId_idx" ON "ContractServiceInfoSnapshot"("contractId");

-- RedefineIndex
CREATE UNIQUE INDEX "ContractAfterSalesSupportInfo_contractId_key" ON "ContractAfterSalesSupportInfo"("contractId");

-- RedefineIndex
CREATE UNIQUE INDEX "ContractComplianceInfo_contractId_key" ON "ContractComplianceInfo"("contractId");
