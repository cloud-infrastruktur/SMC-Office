-- ============================================================================
-- V4.8.9 PRE-MIGRATION SQL
-- ============================================================================
-- MUSS VOR 'prisma migrate deploy' ausgeführt werden!
-- Dieses Skript sichert die organization-Textwerte und erstellt Organizations.
--
-- Ausführung auf PreProd:
--   psql -h <host> -U <user> -d <db> -f migrate-v489-pre.sql
-- ============================================================================

-- Schritt 1: Temporäre Mapping-Tabelle erstellen
CREATE TABLE IF NOT EXISTS "_V489_UserOrgMapping" (
    "userId" TEXT PRIMARY KEY,
    "orgText" TEXT NOT NULL
);

-- Schritt 2: Bestehende organization-Werte sichern
-- (Nur User mit non-null organization)
INSERT INTO "_V489_UserOrgMapping" ("userId", "orgText")
SELECT id, organization 
FROM "User" 
WHERE organization IS NOT NULL 
  AND organization != ''
ON CONFLICT ("userId") DO NOTHING;

-- Schritt 3: Organization-Tabelle erstellen (falls noch nicht vorhanden)
-- HINWEIS: Prisma migrate deploy erstellt diese Tabelle automatisch.
-- Dieses Statement ist nur für den Fall, dass die Tabelle noch nicht existiert.
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'Deutschland',
    "description" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_name_key" ON "Organization"("name");

-- Schritt 4: Organizations aus den gesicherten Werten erstellen
INSERT INTO "Organization" ("id", "name", "displayName", "isActive")
SELECT 
    gen_random_uuid()::text,
    "orgText",
    "orgText",
    true
FROM (
    SELECT DISTINCT "orgText" FROM "_V489_UserOrgMapping"
) AS unique_orgs
WHERE NOT EXISTS (
    SELECT 1 FROM "Organization" WHERE "name" = unique_orgs."orgText"
);

-- Ausgabe: Erstellte Organizations
SELECT 'Erstellte Organizations:' AS info;
SELECT "name" FROM "Organization" ORDER BY "name";

-- Ausgabe: Gesicherte Mappings
SELECT 'Gesicherte User-Organization Mappings:' AS info;
SELECT * FROM "_V489_UserOrgMapping";

-- ============================================================================
-- HINWEIS: Nach 'prisma migrate deploy' muss migrate-v489-post.sql ausgeführt
-- werden, um die User mit Organizations zu verknüpfen!
-- ============================================================================
