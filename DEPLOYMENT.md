# SMC-Office Deployment Guide V4.8.4

**Repository:** git.smc-office.eu  
**Secret Management:** Infisical  
**Build:** Next.js Standalone  
**Prisma:** 6.7.0 (NICHT upgraden!)  
**Container-Präfix:** `-prod` (Isolierte Produktions-Container)  

---

## 🚨 Kritische Regeln

| Regel | Beschreibung | Verstoß |
|-------|-------------|--------|
| **KEINE .env in Produktion** | Secrets werden via Infisical injiziert | Sicherheitsrisiko |
| **KEIN `prisma migrate reset`** | Löscht ALLE Daten | Datenverlust |
| **KEIN `prisma migrate dev`** | Kann Schema ändern/Daten löschen | Datenverlust |
| **KEIN Prisma 7.x** | Breaking Changes | Build-Fehler |
| **NUR `prisma migrate deploy`** | Wendet ausstehende Migrations an | ✅ Sicher |

---

## 1️⃣ Repository Setup (Gitea)

### Code in Gitea pushen

```bash
# Initialer Push in euer Gitea
git remote add gitea git@git.smc-office.eu:smc/smc-office.git
git push -u gitea main
```

### Gitea Runner CI/CD Script

```yaml
# .gitea/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Docker Image
        run: |
          docker build -t smc-office:${{ github.sha }} .
          docker tag smc-office:${{ github.sha }} smc-office:latest
      
      - name: Push to Registry
        run: |
          docker push registry.smc-office.eu/smc-office:${{ github.sha }}
          docker push registry.smc-office.eu/smc-office:latest
      
      - name: Deploy to SMCVS01
        run: |
          ssh deploy@smcvs01 "cd /opt/smc-office && docker compose pull && docker compose up -d"
```

---

## 2️⃣ Infisical Secret Management

### Erforderliche Secrets in Infisical

Pfad: `/smc-office/production`

| Key | Beschreibung | Beispiel |
|-----|-------------|----------|
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://smc_user:xxx@postgres:5432/smc_office_prod` |
| `NEXTAUTH_SECRET` | JWT Secret (min. 32 Zeichen) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Öffentliche URL | `https://smc-office.eu` |
| `CALDAV_ENCRYPTION_KEY` | CalDAV-Passwörter (32 Zeichen) | `openssl rand -base64 32` |
| `S3_ENDPOINT` | MinIO/S3 Endpoint | `http://minio:9000` |
| `S3_BUCKET_NAME` | S3 Bucket | `smc-uploads` |
| `S3_ACCESS_KEY` | S3 Access Key | `minioadmin` |
| `S3_SECRET_KEY` | S3 Secret Key | `xxx` |

### Service Token erstellen

```bash
# In Infisical UI:
# Project Settings -> Service Tokens -> Create Token
# Scope: /smc-office/production (Read)
# Expiry: Never (oder nach Policy)

export INFISICAL_TOKEN="st.xxx..."
```

### Container-Start mit Infisical

```bash
# Der Container startet automatisch mit:
infisical run --env=production --path=/smc-office -- node server.js

# Oder manuell testen:
infisical run --env=production --path=/smc-office -- printenv | grep DATABASE
```

---

## 3️⃣ Datenbank-Migration

### Bestehenden Dump importieren

```bash
# 1. PostgreSQL Container starten (ohne App)
docker compose up -d postgres

# 2. Dump importieren
cat smc_office_backup.sql | docker exec -i smc-postgres psql -U smc_user -d smc_office_prod

# 3. Prüfen ob Daten vorhanden sind
docker exec smc-postgres psql -U smc_user -d smc_office_prod -c "SELECT COUNT(*) FROM \"User\";"
```

### Prisma Migrate Deploy (automatisch)

Der `docker-entrypoint.sh` führt beim Container-Start automatisch aus:

```bash
npx prisma migrate deploy
```

**Was passiert dabei:**
- ✅ Prüft `prisma/migrations/` Verzeichnis
- ✅ Wendet ausstehende Migrations an
- ✅ Ändert KEINE bestehenden Daten
- ✅ Erstellt KEINE neuen Migrations
- ❌ NICHT: `migrate reset` (verboten!)
- ❌ NICHT: `migrate dev` (verboten!)

### Migration-Status prüfen

```bash
# Welche Migrations wurden angewendet?
docker exec smc-office npx prisma migrate status
```

---

## 4️⃣ Docker Deployment

### Container-Namenskonvention (SMCVS01)

| Container | Hostname | Beschreibung |
|-----------|----------|--------------|
| `smc-office-prod` | `smc-office-prod` | Hauptcontainer der App |
| `smc-postgres-prod` | `smc-postgres-prod` | PostgreSQL Datenbank |
| `smc-minio-prod` | `smc-minio-prod` | S3-Storage (MinIO) |
| `smc-minio-init-prod` | - | Einmaliger Bucket-Setup |

### Infisical Secrets (mit -prod Hostnamen)

```bash
# DATABASE_URL muss den Hostnamen smc-postgres-prod verwenden:
DATABASE_URL=postgresql://smc_user:xxx@smc-postgres-prod:5432/smc_office_prod

# S3_ENDPOINT muss den Hostnamen smc-minio-prod verwenden:
S3_ENDPOINT=http://smc-minio-prod:9000
```

### docker-compose.yml (Produktion)

```yaml
version: '3.8'

services:
  smc-office-prod:
    image: registry.smc-office.eu/smc-office:latest
    container_name: smc-office-prod
    hostname: smc-office-prod
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - INFISICAL_TOKEN=${INFISICAL_TOKEN}
      - INFISICAL_ENVIRONMENT=production
    volumes:
      - uploads:/app/uploads
    depends_on:
      smc-postgres-prod:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  smc-postgres-prod:
    image: postgres:15-alpine
    container_name: smc-postgres-prod
    hostname: smc-postgres-prod
    restart: unless-stopped
    environment:
      - POSTGRES_USER=smc_user
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=smc_office_prod
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U smc_user -d smc_office_prod"]
      interval: 10s
      timeout: 5s
      retries: 5

  smc-minio-prod:
    image: minio/minio:latest
    container_name: smc-minio-prod
    hostname: smc-minio-prod
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_ROOT_USER:-minioadmin}
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

volumes:
  uploads:
  pg_data:
  minio_data:
```

### Deployment starten

```bash
# Auf SMCVS01:
cd /opt/smc-office

# Infisical Token setzen (einmalig in .bashrc oder systemd)
export INFISICAL_TOKEN="st.xxx..."
export POSTGRES_PASSWORD="xxx"

# Container starten
docker compose up -d

# Logs prüfen
docker compose logs -f smc-office
```

---

## 5️⃣ Build-Prozess (CI/CD)

### Standalone Build erstellen

```bash
# Im Repository:
yarn install --immutable
yarn prisma generate
yarn build

# Static Assets kopieren (KRITISCH!)
mkdir -p .next/standalone/public
mkdir -p .next/standalone/.next/static
cp -r public/* .next/standalone/public/
cp -r .next/static/* .next/standalone/.next/static/
```

### Docker Image bauen

```bash
# Multi-Stage Build (automatisch via Dockerfile)
docker build -t smc-office:4.8.3 .

# Prüfen ob Infisical CLI enthalten ist
docker run --rm smc-office:4.8.3 infisical --version
```

---

## 6️⃣ Troubleshooting

### "Infisical: invalid token"

```bash
# Token prüfen
echo $INFISICAL_TOKEN | head -c 20

# Muss mit "st." beginnen
```

### "Prisma: P3009 migrate found failed migrations"

```bash
# Status prüfen
docker exec smc-office npx prisma migrate status

# VORSICHT: Nur nach Rücksprache!
# npx prisma migrate resolve --rolled-back <migration_name>
```

### "Cannot find module 'prisma'"

```bash
# Prisma-Engines nicht im Image?
# Prüfen ob Dockerfile korrekt ist:
docker run --rm smc-office:4.8.3 ls -la node_modules/.prisma/
```

---

## Versions-Info

**Version:** V4.8.4  
**Datum:** 02.03.2026  
**Build-Routes:** 43  
**Node.js:** 20 LTS  
**Next.js:** 14.2.x  
**Yarn:** 4.x Berry (node-modules Linker)  
**Prisma:** 6.7.0 (NICHT upgraden!)  
**Secret Management:** Infisical CLI  
