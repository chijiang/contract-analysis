-- CreateTable
CREATE TABLE "StandardClause" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "clauseItem" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "StandardClause_category_clauseItem_key" ON "StandardClause"("category", "clauseItem");
CREATE INDEX "StandardClause_category_idx" ON "StandardClause"("category");
