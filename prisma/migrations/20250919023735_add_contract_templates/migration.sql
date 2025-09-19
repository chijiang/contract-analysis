/*
  Warnings:

  - Added the required column `templateId` to the `StandardClause` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ContractAnalysis" ADD COLUMN "selectedTemplateIds" TEXT;

-- CreateTable
CREATE TABLE "ContractTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "ContractTemplate" ("id", "name", "slug", "description", "createdAt", "updatedAt")
VALUES ("default-template", "通用模板", "default", NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StandardClause" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "clauseItem" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "riskLevel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StandardClause_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StandardClause" ("id", "templateId", "category", "clauseItem", "standard", "riskLevel", "createdAt", "updatedAt")
SELECT "id", "default-template", "category", "clauseItem", "standard", "riskLevel", "createdAt", "updatedAt" FROM "StandardClause";
DROP TABLE "StandardClause";
ALTER TABLE "new_StandardClause" RENAME TO "StandardClause";
CREATE INDEX "StandardClause_templateId_idx" ON "StandardClause"("templateId");
CREATE INDEX "StandardClause_category_idx" ON "StandardClause"("category");
CREATE UNIQUE INDEX "StandardClause_templateId_category_clauseItem_key" ON "StandardClause"("templateId", "category", "clauseItem");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ContractTemplate_slug_key" ON "ContractTemplate"("slug");

-- CreateIndex
CREATE INDEX "ContractTemplate_name_idx" ON "ContractTemplate"("name");
