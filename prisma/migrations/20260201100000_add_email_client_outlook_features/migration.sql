-- Migration: add_email_client_outlook_features
-- Datum: 2026-02-01
-- Beschreibung: Erweiterte E-Mail-Client-Funktionen (Outlook-Style)
-- SICHERHEIT: Nur CREATE TABLE IF NOT EXISTS - keine destruktiven Änderungen

-- ==========================================
-- NEUE TABELLEN
-- ==========================================

-- TrustedSender: Vertrauenswürdige Absender für Bilder-Laden
CREATE TABLE IF NOT EXISTS "TrustedSender" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "domain" TEXT,
    "trustImages" BOOLEAN NOT NULL DEFAULT true,
    "trustLinks" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustedSender_pkey" PRIMARY KEY ("id")
);

-- EmailSignature: E-Mail-Signaturen
CREATE TABLE IF NOT EXISTS "EmailSignature" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isReplyDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSignature_pkey" PRIMARY KEY ("id")
);

-- EmailCategory: Kategorien/Labels für E-Mails
CREATE TABLE IF NOT EXISTS "EmailCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCategory_pkey" PRIMARY KEY ("id")
);

-- EmailCategoryAssignment: E-Mail <-> Kategorie Zuordnung
CREATE TABLE IF NOT EXISTS "EmailCategoryAssignment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCategoryAssignment_pkey" PRIMARY KEY ("id")
);

-- UserPanelLayout: Benutzer-Panel-Einstellungen
CREATE TABLE IF NOT EXISTS "UserPanelLayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailPanelSizes" JSONB NOT NULL DEFAULT '{}',
    "emailListView" TEXT NOT NULL DEFAULT 'list',
    "emailSortBy" TEXT NOT NULL DEFAULT 'date',
    "emailSortOrder" TEXT NOT NULL DEFAULT 'desc',
    "conversationView" BOOLEAN NOT NULL DEFAULT false,
    "previewPane" TEXT NOT NULL DEFAULT 'right',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPanelLayout_pkey" PRIMARY KEY ("id")
);

-- EmailFavoriteFolder: Favoriten-Ordner
CREATE TABLE IF NOT EXISTS "EmailFavoriteFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "folderPath" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailFavoriteFolder_pkey" PRIMARY KEY ("id")
);

-- ==========================================
-- NEUE SPALTEN FÜR EmailMessage (Threading)
-- ==========================================

-- inReplyTo für Threading
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'EmailMessage' AND column_name = 'inReplyTo'
    ) THEN
        ALTER TABLE "EmailMessage" ADD COLUMN "inReplyTo" TEXT;
    END IF;
END $$;

-- references für Threading (Array)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'EmailMessage' AND column_name = 'references'
    ) THEN
        ALTER TABLE "EmailMessage" ADD COLUMN "references" TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
END $$;

-- threadId für Konversationsansicht
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'EmailMessage' AND column_name = 'threadId'
    ) THEN
        ALTER TABLE "EmailMessage" ADD COLUMN "threadId" TEXT;
    END IF;
END $$;

-- ==========================================
-- UNIQUE CONSTRAINTS
-- ==========================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TrustedSender_userId_email_key'
    ) THEN
        ALTER TABLE "TrustedSender" ADD CONSTRAINT "TrustedSender_userId_email_key" UNIQUE ("userId", "email");
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EmailCategory_userId_name_key'
    ) THEN
        ALTER TABLE "EmailCategory" ADD CONSTRAINT "EmailCategory_userId_name_key" UNIQUE ("userId", "name");
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EmailCategoryAssignment_messageId_categoryId_key'
    ) THEN
        ALTER TABLE "EmailCategoryAssignment" ADD CONSTRAINT "EmailCategoryAssignment_messageId_categoryId_key" UNIQUE ("messageId", "categoryId");
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserPanelLayout_userId_key'
    ) THEN
        ALTER TABLE "UserPanelLayout" ADD CONSTRAINT "UserPanelLayout_userId_key" UNIQUE ("userId");
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EmailFavoriteFolder_userId_folderId_key'
    ) THEN
        ALTER TABLE "EmailFavoriteFolder" ADD CONSTRAINT "EmailFavoriteFolder_userId_folderId_key" UNIQUE ("userId", "folderId");
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- FOREIGN KEY CONSTRAINTS
-- ==========================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EmailCategoryAssignment_categoryId_fkey'
    ) THEN
        ALTER TABLE "EmailCategoryAssignment" ADD CONSTRAINT "EmailCategoryAssignment_categoryId_fkey" 
        FOREIGN KEY ("categoryId") REFERENCES "EmailCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS "TrustedSender_userId_idx" ON "TrustedSender"("userId");
CREATE INDEX IF NOT EXISTS "TrustedSender_email_idx" ON "TrustedSender"("email");
CREATE INDEX IF NOT EXISTS "EmailSignature_accountId_idx" ON "EmailSignature"("accountId");
CREATE INDEX IF NOT EXISTS "EmailCategory_userId_idx" ON "EmailCategory"("userId");
CREATE INDEX IF NOT EXISTS "EmailCategoryAssignment_messageId_idx" ON "EmailCategoryAssignment"("messageId");
CREATE INDEX IF NOT EXISTS "EmailCategoryAssignment_categoryId_idx" ON "EmailCategoryAssignment"("categoryId");
CREATE INDEX IF NOT EXISTS "EmailFavoriteFolder_userId_idx" ON "EmailFavoriteFolder"("userId");
CREATE INDEX IF NOT EXISTS "EmailMessage_threadId_idx" ON "EmailMessage"("threadId");
