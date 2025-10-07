-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL',
    "filePath" TEXT NOT NULL,
    "s3Key" TEXT,
    "markdown" TEXT NOT NULL,
    "convertedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "processingError" TEXT
);
INSERT INTO "new_Contract" ("convertedAt", "createdAt", "fileHash", "filePath", "fileSize", "id", "markdown", "mimeType", "originalFileName", "s3Key", "storageProvider", "updatedAt") SELECT "convertedAt", "createdAt", "fileHash", "filePath", "fileSize", "id", "markdown", "mimeType", "originalFileName", "s3Key", "storageProvider", "updatedAt" FROM "Contract";
DROP TABLE "Contract";
ALTER TABLE "new_Contract" RENAME TO "Contract";
CREATE UNIQUE INDEX "Contract_fileHash_key" ON "Contract"("fileHash");
CREATE INDEX "Contract_createdAt_idx" ON "Contract"("createdAt");
CREATE INDEX "Contract_fileHash_idx" ON "Contract"("fileHash");
CREATE INDEX "Contract_processingStatus_idx" ON "Contract"("processingStatus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
