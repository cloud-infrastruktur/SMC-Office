-- ============================================================================
-- V4.8.9 POST-MIGRATION SQL
-- ============================================================================
-- MUSS NACH 'prisma migrate deploy' ausgeführt werden!
-- Dieses Skript verknüpft User mit Organizations und erstellt CrmContacts.
--
-- Ausführung auf PreProd:
--   psql -h <host> -U <user> -d <db> -f migrate-v489-post.sql
-- ============================================================================

-- Schritt 1: User mit Organizations verknüpfen
UPDATE "User" u
SET "organizationId" = o.id
FROM "_V489_UserOrgMapping" m
JOIN "Organization" o ON o.name = m."orgText"
WHERE u.id = m."userId"
  AND u."organizationId" IS NULL;

-- Ausgabe: Verknüpfte User
SELECT 'Verknüpfte User mit Organizations:' AS info;
SELECT u.email, o.name as organization
FROM "User" u
JOIN "Organization" o ON u."organizationId" = o.id;

-- Schritt 2: CrmContacts für User erstellen (1:1 Verknüpfung)
-- Nur für User, die noch keinen CrmContact haben
INSERT INTO "CrmContact" (
    "id",
    "firstName",
    "lastName",
    "email",
    "userId",
    "organizationId",
    "company",
    "source",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    SPLIT_PART(u.name, ' ', 1),                                    -- firstName
    CASE 
        WHEN POSITION(' ' IN u.name) > 0 
        THEN SUBSTRING(u.name FROM POSITION(' ' IN u.name) + 1)
        ELSE ''
    END,                                                           -- lastName
    u.email,
    u.id,                                                          -- userId
    u."organizationId",
    o.name,                                                        -- company
    'V4.8.9 Migration',                                            -- source
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User" u
LEFT JOIN "Organization" o ON u."organizationId" = o.id
WHERE u.id NOT IN (
    SELECT "userId" FROM "CrmContact" WHERE "userId" IS NOT NULL
)
  AND u.email NOT LIKE '%admin@smc-office.eu%';  -- System-User überspringen

-- Oder: Bestehende CrmContacts mit User verknüpfen (per E-Mail)
UPDATE "CrmContact" c
SET 
    "userId" = u.id,
    "organizationId" = u."organizationId"
FROM "User" u
WHERE c.email = u.email
  AND c."userId" IS NULL;

-- Ausgabe: Erstellte CrmContacts
SELECT 'CrmContacts mit User-Verknüpfung:' AS info;
SELECT c."firstName", c."lastName", c.email, u.role
FROM "CrmContact" c
JOIN "User" u ON c."userId" = u.id;

-- Schritt 3: Temporäre Mapping-Tabelle löschen
DROP TABLE IF EXISTS "_V489_UserOrgMapping";

-- Finale Statistiken
SELECT '=== V4.8.9 Migration abgeschlossen ===' AS info;
SELECT 'Organizations:' AS entity, COUNT(*) AS count FROM "Organization"
UNION ALL
SELECT 'User mit Organization:', COUNT(*) FROM "User" WHERE "organizationId" IS NOT NULL
UNION ALL
SELECT 'CrmContacts mit User:', COUNT(*) FROM "CrmContact" WHERE "userId" IS NOT NULL;
