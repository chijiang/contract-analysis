-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StandardClause" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "clauseItem" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_StandardClause" ("category", "clauseItem", "createdAt", "id", "standard", "updatedAt") SELECT "category", "clauseItem", "createdAt", "id", "standard", "updatedAt" FROM "StandardClause";
DROP TABLE "StandardClause";
ALTER TABLE "new_StandardClause" RENAME TO "StandardClause";
CREATE INDEX "StandardClause_category_idx" ON "StandardClause"("category");
CREATE UNIQUE INDEX "StandardClause_category_clauseItem_key" ON "StandardClause"("category", "clauseItem");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
