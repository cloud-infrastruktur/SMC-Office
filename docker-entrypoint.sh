#!/bin/bash
set -e

echo "========================================"
echo "SMC-Office V4.8.7 - Container Start"
echo "========================================"

# ==============================================================================
# PRISMA MIGRATE DEPLOY (Sicher - keine Datenverluste!)
# ==============================================================================
echo "[1/2] Running Prisma Migrate Deploy..."

# WARNUNG: migrate reset/dev ist VERBOTEN!
if [ "$PRISMA_MIGRATE_RESET" = "true" ]; then
    echo "ERROR: PRISMA_MIGRATE_RESET=true ist VERBOTEN!"
    echo "       Dies würde alle Daten löschen!"
    exit 1
fi

# Nur migrate deploy - wendet ausstehende Migrations an
# Erstellt KEINE neuen Migrations, löscht KEINE Daten
npx prisma migrate deploy

echo "[1/2] Prisma Migrate Deploy completed."

# ==============================================================================
# NEXT.JS SERVER STARTEN
# ==============================================================================
echo "[2/2] Starting Next.js server..."
echo "========================================"

exec node server.js
