# Migration: Add RBAC and Client Anonymization

## Version: 20260201000000
## Date: 2026-02-01

## Description
This migration adds Role-Based Access Control (RBAC) features and Client Anonymization system.

## Changes

### New Enum Values (UserRole)
- `CONSULTANT` - Unternehmensberatung (full client details)
- `CUSTOMER_REF` - Kunden-Referenz (exclusive reference area)
- `MANAGER` - Manager (admin-light access)

### User Table Extensions
- `organization` - Organization/Company name
- `notes` - Internal notes
- `isActive` - Active/inactive status
- `lastLogin` - Last login timestamp

### New Tables
- `Client` - Client master data with anonymization mapping
- `IndustryCategory` - Industry categories for grouping

### Table Extensions
- `Project.clientId` - Link to Client table
- `Reference.clientId` - Link to Client table

## Safety
✅ All operations are idempotent (safe to re-run)
✅ No DROP, DELETE, or TRUNCATE statements
✅ No data loss risk

## Deployment
```bash
# Apply migration
npx prisma migrate deploy

# Or manually execute the SQL
psql $DATABASE_URL -f migration.sql
```
