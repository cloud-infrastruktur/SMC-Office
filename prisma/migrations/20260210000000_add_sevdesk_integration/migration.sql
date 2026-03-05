-- Add SevDesk fields to PaperlessDocumentCache
ALTER TABLE "PaperlessDocumentCache" ADD COLUMN IF NOT EXISTS "sevdeskId" TEXT;
ALTER TABLE "PaperlessDocumentCache" ADD COLUMN IF NOT EXISTS "sevdeskExportedAt" TIMESTAMP(3);
ALTER TABLE "PaperlessDocumentCache" ADD COLUMN IF NOT EXISTS "sevdeskFolderId" TEXT;

-- Create index for sevdeskId
CREATE INDEX IF NOT EXISTS "PaperlessDocumentCache_sevdeskId_idx" ON "PaperlessDocumentCache"("sevdeskId");

-- Create SevdeskConfig table
CREATE TABLE IF NOT EXISTS "SevdeskConfig" (
    "id" TEXT NOT NULL,
    "apiToken" TEXT NOT NULL,
    "parentFolderId" TEXT NOT NULL DEFAULT '22128948',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SevdeskConfig_pkey" PRIMARY KEY ("id")
);
