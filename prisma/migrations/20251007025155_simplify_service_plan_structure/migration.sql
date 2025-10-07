/*
  Warnings:

  - You are about to drop the `PlanModality` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceModuleTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceModuleVersion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServicePlanModule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `metadata` on the `ServicePlan` table. All the data in the column will be lost.
  - You are about to drop the column `sites` on the `ServicePlan` table. All the data in the column will be lost.
  - You are about to drop the column `termMonths` on the `ServicePlan` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "PlanModality_planId_modality_key";

-- DropIndex
DROP INDEX "ServiceModuleTemplate_name_idx";

-- DropIndex
DROP INDEX "ServiceModuleTemplate_type_status_idx";

-- DropIndex
DROP INDEX "ServicePlanModule_planId_orderIndex_idx";

-- DropIndex
DROP INDEX "ServicePlanModule_templateId_idx";

-- DropIndex
DROP INDEX "ServicePlanModule_planId_type_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PlanModality";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ServiceModuleTemplate";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ServiceModuleVersion";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ServicePlanModule";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ServicePlanClause" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "category" TEXT,
    "clauseItem" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "notes" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServicePlanClause_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ServicePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ServicePlan" ("createdAt", "id", "name", "updatedAt") SELECT "createdAt", "id", "name", "updatedAt" FROM "ServicePlan";
DROP TABLE "ServicePlan";
ALTER TABLE "new_ServicePlan" RENAME TO "ServicePlan";
CREATE INDEX "ServicePlan_name_idx" ON "ServicePlan"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ServicePlanClause_planId_idx" ON "ServicePlanClause"("planId");

-- CreateIndex
CREATE INDEX "ServicePlanClause_planId_orderIndex_idx" ON "ServicePlanClause"("planId", "orderIndex");
