-- CreateTable
CREATE TABLE "ServicePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "termMonths" INTEGER,
    "sites" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlanModality" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    CONSTRAINT "PlanModality_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceModuleTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ServiceModuleVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceModuleVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ServiceModuleTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServicePlanModule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,
    "overrides" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServicePlanModule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServicePlanModule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ServiceModuleTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ServicePlan_name_idx" ON "ServicePlan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlanModality_planId_modality_key" ON "PlanModality"("planId", "modality");

-- CreateIndex
CREATE INDEX "ServiceModuleTemplate_type_status_idx" ON "ServiceModuleTemplate"("type", "status");

-- CreateIndex
CREATE INDEX "ServiceModuleTemplate_name_idx" ON "ServiceModuleTemplate"("name");

-- CreateIndex
CREATE INDEX "ServicePlanModule_planId_type_idx" ON "ServicePlanModule"("planId", "type");

-- CreateIndex
CREATE INDEX "ServicePlanModule_templateId_idx" ON "ServicePlanModule"("templateId");

-- CreateIndex
CREATE INDEX "ServicePlanModule_planId_orderIndex_idx" ON "ServicePlanModule"("planId", "orderIndex");
