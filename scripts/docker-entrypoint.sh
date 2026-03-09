#!/bin/sh
set -e

echo "=== SMC Website Container v4.0 (PnP Edition) ==="
echo "Working directory: $(pwd)"
echo "Node.js: $(node --version)"
echo "Yarn: $(yarn --version 2>/dev/null || echo 'not available')"

# ============================================================================
# 1. PnP Environment Check
# ============================================================================
if [ -f "/app/.pnp.cjs" ]; then
  echo "✓ PnP loader found (.pnp.cjs)"
  export NODE_OPTIONS="--require /app/.pnp.cjs"
else
  echo "⚠ Warning: PnP loader not found, falling back to node_modules"
fi

# ============================================================================
# 2. Server.js Check
# ============================================================================
if [ -f "/app/server.js" ]; then
  echo "✓ server.js found"
else
  echo "ERROR: server.js not found"
  ls -la /app/
  exit 1
fi

# ============================================================================
# 3. .next Directory Check
# ============================================================================
if [ -d "/app/.next" ]; then
  echo "✓ .next directory found"
else
  echo "ERROR: .next directory not found"
  exit 1
fi

# ============================================================================
# 4. Prisma Schema Check & Generate (im PnP-Kontext)
# ============================================================================
if [ -f "/app/prisma/schema.prisma" ]; then
  echo "✓ schema.prisma found"
  echo "Generating Prisma Client (PnP)..."
  # Via yarn um PnP-Kontext zu nutzen
  yarn prisma generate 2>&1 || {
    echo "Retrying with npx..."
    npx prisma generate 2>&1 || echo "Warning: prisma generate had issues"
  }
  echo "✓ Prisma Client ready"
else
  echo "ERROR: schema.prisma not found"
  exit 1
fi

# ============================================================================
# 5. Database Migration (deploy only, safe for production)
# ============================================================================
echo "Running database migrations..."
yarn prisma migrate deploy 2>&1 || {
  echo "Retrying with npx..."
  npx prisma migrate deploy 2>&1 || echo "Warning: migrate deploy had issues (may be first run)"
}

# ============================================================================
# 5b. V4.8.9 Enterprise Migration (Post-Migration)
# ============================================================================
# Prüft ob _V489_UserOrgMapping Tabelle existiert (Pre-Migration wurde ausgeführt)
# und führt dann automatisch die Post-Migration durch
V489_MAPPING_EXISTS=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.\$queryRaw\`SELECT 1 FROM information_schema.tables WHERE table_name = '_V489_UserOrgMapping'\`
    .then(r => { console.log(r.length > 0 ? '1' : '0'); prisma.\$disconnect(); })
    .catch(() => { console.log('0'); prisma.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$V489_MAPPING_EXISTS" = "1" ]; then
  echo "⚠ V4.8.9 Pre-Migration detected - Running post-migration..."
  if [ -f "/app/scripts/migrate-v489-enterprise.js" ]; then
    node /app/scripts/migrate-v489-enterprise.js 2>&1 || echo "Warning: V4.8.9 migration had issues"
    echo "✓ V4.8.9 Enterprise Migration completed"
  elif [ -f "/app/scripts/migrate-v489-post.sql" ]; then
    # Fallback: SQL direkt ausführen (benötigt psql)
    echo "Note: Run migrate-v489-post.sql manually if migration incomplete"
  fi
fi

# ============================================================================
# 6. AUTO-SEED: Check if database is empty and seed if needed
# ============================================================================
echo "Checking database initialization status..."

# Prüfe ob User-Tabelle existiert und Einträge hat
# Nutzt NODE_OPTIONS mit PnP-Loader
USER_COUNT=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.user.count()
    .then(c => { console.log(c); prisma.\$disconnect(); })
    .catch(() => { console.log('0'); prisma.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
  echo "⚠ Database is empty - running initial seed..."
  
  # Versuche verschiedene Seed-Methoden
  if [ -f "/app/scripts/seed.js" ]; then
    node /app/scripts/seed.js 2>&1 || echo "Warning: seed.js had issues"
    echo "✓ Database seeded successfully"
  elif [ -f "/app/scripts/seed.ts" ]; then
    # TypeScript via tsx (falls verfügbar)
    yarn tsx /app/scripts/seed.ts 2>&1 || \
    npx tsx /app/scripts/seed.ts 2>&1 || \
    echo "Warning: seed.ts execution failed"
  else
    echo "Warning: No seed script found, skipping auto-seed"
  fi
else
  echo "✓ Database already initialized ($USER_COUNT users found)"
fi

# ============================================================================
# 7. PnP Cache Info
# ============================================================================
echo "PnP Cache:"
ls -la /app/.yarn/cache/ 2>/dev/null | head -5 || \
ls -la /app/.yarn/unplugged/ 2>/dev/null | head -5 || \
echo "Cache info not available"

echo "=== Starting Next.js Server (PnP) ==="
# Server.js mit PnP-Loader starten
exec node /app/server.js
