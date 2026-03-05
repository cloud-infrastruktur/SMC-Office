-- ================================================
-- MIGRATION: Add Email Client Tables
-- Date: 2026-01-31
-- Type: ADDITIVE ONLY - No data loss
-- Description: Adds EmailAccount, EmailFolder, EmailMessage, EmailAttachment, EmailDraft tables
-- ================================================

-- CreateEnum for Email Folder Types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmailFolderType') THEN
    CREATE TYPE "EmailFolderType" AS ENUM ('INBOX', 'SENT', 'DRAFTS', 'TRASH', 'SPAM', 'CUSTOM');
  END IF;
END $$;

-- CreateTable: EmailAccount
-- Purpose: Store email account configurations (IMAP/SMTP settings)
-- SAFE: New table, no existing data affected
CREATE TABLE IF NOT EXISTS "EmailAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "imapHost" TEXT NOT NULL,
    "imapPort" INTEGER NOT NULL,
    "imapSecure" BOOLEAN NOT NULL DEFAULT true,
    "imapUsername" TEXT NOT NULL,
    "imapPassword" TEXT NOT NULL,
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "smtpUsername" TEXT NOT NULL,
    "smtpPassword" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmailFolder
-- Purpose: Store email folders (Inbox, Sent, Drafts, etc.)
-- SAFE: New table, no existing data affected
CREATE TABLE IF NOT EXISTS "EmailFolder" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" "EmailFolderType" NOT NULL DEFAULT 'CUSTOM',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmailMessage
-- Purpose: Store email messages
-- SAFE: New table, no existing data affected
CREATE TABLE IF NOT EXISTS "EmailMessage" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "uid" INTEGER NOT NULL,
    "messageId" TEXT,
    "subject" TEXT,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "toAddresses" TEXT[],
    "ccAddresses" TEXT[],
    "bccAddresses" TEXT[],
    "replyTo" TEXT,
    "textBody" TEXT,
    "htmlBody" TEXT,
    "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "inReplyTo" TEXT,
    "references" TEXT[],
    "receivedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmailAttachment
-- Purpose: Store email attachment metadata
-- SAFE: New table, no existing data affected
CREATE TABLE IF NOT EXISTS "EmailAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "contentId" TEXT,
    "storagePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmailDraft
-- Purpose: Store unsent email drafts
-- SAFE: New table, no existing data affected
CREATE TABLE IF NOT EXISTS "EmailDraft" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "to" TEXT[],
    "cc" TEXT[],
    "bcc" TEXT[],
    "subject" TEXT,
    "body" TEXT,
    "replyToMessageId" TEXT,
    "forwardMessageId" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDraft_pkey" PRIMARY KEY ("id")
);

-- ================================================
-- CREATE INDEXES (Performance Optimization)
-- ================================================

-- EmailAccount indexes
CREATE INDEX IF NOT EXISTS "EmailAccount_userId_idx" ON "EmailAccount"("userId");
CREATE INDEX IF NOT EXISTS "EmailAccount_email_idx" ON "EmailAccount"("email");

-- EmailFolder indexes
CREATE INDEX IF NOT EXISTS "EmailFolder_accountId_idx" ON "EmailFolder"("accountId");
CREATE UNIQUE INDEX IF NOT EXISTS "EmailFolder_accountId_path_key" ON "EmailFolder"("accountId", "path");
CREATE INDEX IF NOT EXISTS "EmailFolder_type_idx" ON "EmailFolder"("type");

-- EmailMessage indexes
CREATE INDEX IF NOT EXISTS "EmailMessage_accountId_idx" ON "EmailMessage"("accountId");
CREATE UNIQUE INDEX IF NOT EXISTS "EmailMessage_accountId_uid_key" ON "EmailMessage"("accountId", "uid");
CREATE INDEX IF NOT EXISTS "EmailMessage_folderId_idx" ON "EmailMessage"("folderId");
CREATE INDEX IF NOT EXISTS "EmailMessage_isRead_idx" ON "EmailMessage"("isRead");
CREATE INDEX IF NOT EXISTS "EmailMessage_receivedAt_idx" ON "EmailMessage"("receivedAt");

-- EmailAttachment indexes
CREATE INDEX IF NOT EXISTS "EmailAttachment_messageId_idx" ON "EmailAttachment"("messageId");

-- EmailDraft indexes
CREATE INDEX IF NOT EXISTS "EmailDraft_accountId_idx" ON "EmailDraft"("accountId");

-- ================================================
-- ADD FOREIGN KEYS (Data Integrity)
-- ================================================

-- EmailAccount -> User
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmailAccount_userId_fkey'
  ) THEN
    ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- EmailFolder -> EmailAccount
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmailFolder_accountId_fkey'
  ) THEN
    ALTER TABLE "EmailFolder" ADD CONSTRAINT "EmailFolder_accountId_fkey" 
    FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- EmailMessage -> EmailAccount
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmailMessage_accountId_fkey'
  ) THEN
    ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_accountId_fkey" 
    FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- EmailMessage -> EmailFolder
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmailMessage_folderId_fkey'
  ) THEN
    ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_folderId_fkey" 
    FOREIGN KEY ("folderId") REFERENCES "EmailFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- EmailAttachment -> EmailMessage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmailAttachment_messageId_fkey'
  ) THEN
    ALTER TABLE "EmailAttachment" ADD CONSTRAINT "EmailAttachment_messageId_fkey" 
    FOREIGN KEY ("messageId") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ================================================
-- MIGRATION SUMMARY
-- ================================================
-- ✅ SAFE OPERATIONS ONLY:
--    - CREATE TABLE IF NOT EXISTS (no data loss)
--    - CREATE INDEX IF NOT EXISTS (no data loss)
--    - CREATE TYPE IF NOT EXISTS (no data loss)
--    - ADD CONSTRAINT IF NOT EXISTS (no data loss)
--
-- ❌ NO DESTRUCTIVE OPERATIONS:
--    - No DROP statements
--    - No ALTER TABLE ... DROP COLUMN
--    - No DELETE statements
--    - No TRUNCATE statements
--
-- 📊 IMPACT: Zero data loss, adds new tables only
-- ================================================
