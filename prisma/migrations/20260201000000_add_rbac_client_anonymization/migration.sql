-- ============================================================
-- Migration: Add RBAC and Client Anonymization (Phase 2)
-- Author: SMC-Office System
-- Date: 2026-02-01
-- Description: Adds role-based access control fields and client anonymization
-- SAFE: Only CREATE TABLE and ALTER TABLE ADD COLUMN (no data loss)
-- ============================================================

-- 1. Add new enum values to UserRole (if not exists)
-- Note: PostgreSQL doesn't support IF NOT EXISTS for enum values directly
-- We use DO block with exception handling

DO $$
BEGIN
    -- Add CONSULTANT if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CONSULTANT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
        ALTER TYPE "UserRole" ADD VALUE 'CONSULTANT';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    -- Add CUSTOMER_REF if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CUSTOMER_REF' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
        ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER_REF';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    -- Add MANAGER if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MANAGER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
        ALTER TYPE "UserRole" ADD VALUE 'MANAGER';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add new columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "organization" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP(3);

-- 3. Create Client table (for anonymization)
CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "anonymizedName" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- Client unique constraint on name
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Client_name_key') THEN
        ALTER TABLE "Client" ADD CONSTRAINT "Client_name_key" UNIQUE ("name");
    END IF;
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- Client index on industry
CREATE INDEX IF NOT EXISTS "Client_industry_idx" ON "Client"("industry");

-- 4. Create IndustryCategory table
CREATE TABLE IF NOT EXISTS "IndustryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IndustryCategory_pkey" PRIMARY KEY ("id")
);

-- IndustryCategory unique constraint on name
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IndustryCategory_name_key') THEN
        ALTER TABLE "IndustryCategory" ADD CONSTRAINT "IndustryCategory_name_key" UNIQUE ("name");
    END IF;
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- 5. Add clientId to Project table
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

-- Add foreign key constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_clientId_fkey') THEN
        ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" 
            FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Index on Project.clientId
CREATE INDEX IF NOT EXISTS "Project_clientId_idx" ON "Project"("clientId");

-- 6. Add clientId to Reference table
ALTER TABLE "Reference" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

-- Add foreign key constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Reference_clientId_fkey') THEN
        ALTER TABLE "Reference" ADD CONSTRAINT "Reference_clientId_fkey" 
            FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Index on Reference.clientId
CREATE INDEX IF NOT EXISTS "Reference_clientId_idx" ON "Reference"("clientId");

-- ============================================================
-- Migration Complete - All operations are idempotent (safe to re-run)
-- ============================================================
