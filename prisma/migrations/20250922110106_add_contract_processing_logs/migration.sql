-- CreateTable
CREATE TABLE "ContractProcessingLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "status" TEXT DEFAULT 'SUCCESS',
    "durationMs" INTEGER,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContractProcessingLog_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContractProcessingLog_contractId_createdAt_idx" ON "ContractProcessingLog"("contractId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractProcessingLog_action_idx" ON "ContractProcessingLog"("action");

-- CreateIndex
CREATE INDEX "ContractProcessingLog_createdAt_idx" ON "ContractProcessingLog"("createdAt");
