-- CreateTable
CREATE TABLE "ContractKeySparePartTube" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "deviceModel" TEXT,
    "geHostSystemNumber" TEXT,
    "xrTubeId" TEXT,
    "manufacturer" TEXT,
    "registrationNumber" TEXT,
    "contractStartDate" TEXT,
    "contractEndDate" TEXT,
    "responseTime" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContractKeySparePartTube_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContractKeySparePartCoil" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "geHostSystemNumber" TEXT,
    "coilOrderNumber" TEXT,
    "coilName" TEXT,
    "coilSerialNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContractKeySparePartCoil_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContractKeySparePartTube_contractId_idx" ON "ContractKeySparePartTube"("contractId");

-- CreateIndex
CREATE INDEX "ContractKeySparePartCoil_contractId_idx" ON "ContractKeySparePartCoil"("contractId");

-- NOTE: SQLite 无法 DROP 自动生成的 UNIQUE 索引，保留现有唯一约束即可
