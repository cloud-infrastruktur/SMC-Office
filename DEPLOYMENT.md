# SMC-Office Deployment Guide V4.8.9

**Repository:** GitHub (Single Source of Truth)  
**Secret Management:** Infisical (SMC-Vault)  
**Build:** Next.js Standalone + Docker  
**CI/CD:** GitHub Actions  
**Prisma:** 6.7.0 (NICHT upgraden!)  
**Container-Präfix:** `-prod` (Isolierte Produktions-Container)  

---

## 📋 V4.8.9 Enterprise-Architektur Änderungen

### Neue Datenbank-Modelle

| Modell | Beschreibung |
|--------|-------------|
| `Organization` | Outlook-kompatible Organisations-Tabelle (Name, Branche, Adresse, Logo etc.) |
| `FileFolder.permissionArea` | Bereichs-basierte Download-Berechtigungen |
| `FileFolder.isDownloadFolder` | Markiert Ordner für Download-Modul |
| `FileFolder.isProtected` | Löschschutz für System-Ordner |

### Neue Relationen

| Relation | Typ | Beschreibung |
|----------|-----|--------------|
| `User → Organization` | N:1 | Benutzer gehört zu Organisation |
| `CrmContact → User` | 1:1 | Kontakt-User-Verknüpfung |
| `CrmContact → Organization` | N:1 | Kontakt gehört zu Organisation |
| `FileAttachment` | N:M | Cross-Module Datei-Verknüpfung |

### Neue API-Endpunkte

| Endpunkt | Methoden | Beschreibung |
|----------|----------|--------------|
| `/api/admin/organizations` | GET, POST | Organisationen verwalten |
| `/api/admin/organizations/[id]` | GET, PUT, DELETE | Einzelne Organisation |
| `/api/admin/filemanager/attachments` | GET, POST, DELETE | Datei-CRM-Verknüpfungen |
| `/api/email/messages/link-crm` | GET, POST | E-Mail-Deal-Verknüpfung |

### Neue Admin-Seite

- `/admin/organizations` - Organisationen-Verwaltung mit CRUD

---

## 🔄 V4.8.9 Daten-Migration (WICHTIG!)

> **Hinweis:** Die Schema-Migration (`prisma migrate deploy`) läuft automatisch beim Container-Start. Die **Daten-Migration** erfordert jedoch einen manuellen Schritt VOR dem Update!

### Warum Pre-Migration nötig ist

Das alte `User.organization` Feld (Text) wird durch `User.organizationId` (Relation) ersetzt. Ohne Pre-Migration gehen die bestehenden Organization-Textwerte verloren!

### Migrations-Ablauf für PreProd/Prod

```bash
# ============================================================================
# SCHRITT 1: Pre-Migration (VOR Container-Update!)
# ============================================================================
# Sichert organization-Textwerte und erstellt Organizations

psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME> -f scripts/migrate-v489-pre.sql

# Erwartete Ausgabe:
# - Erstellte Organizations: Privat, Bechtle IT-Systemhaus, SMC GmbH, ...
# - Gesicherte Mappings: userId -> orgText

# ============================================================================
# SCHRITT 2: Container-Update (normale Prozedur)
# ============================================================================
# Der Container führt automatisch aus:
# - prisma migrate deploy (Schema-Update)
# - V4.8.9 Post-Migration (wenn Pre-Migration erkannt)

docker compose pull
docker compose up -d

# ============================================================================
# SCHRITT 3: Post-Migration (falls nicht automatisch)
# ============================================================================
# Nur nötig wenn Container-Logs "Run migrate-v489-post.sql manually" zeigen

psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME> -f scripts/migrate-v489-post.sql

# ODER via TypeScript:
docker exec smc-office-prod npx tsx scripts/migrate-v489-enterprise.ts
```

### Migrations-Dateien

| Datei | Zeitpunkt | Beschreibung |
|-------|-----------|--------------|
| `scripts/migrate-v489-pre.sql` | VOR Update | Sichert organization-Textwerte |
| `scripts/migrate-v489-post.sql` | NACH Update | Verknüpft User mit Organizations |
| `scripts/migrate-v489-enterprise.ts` | NACH Update | TypeScript-Alternative |

### Was passiert bei der Migration?

1. **Organizations erstellen**: Aus jedem einzigartigen `User.organization`-Textwert wird eine `Organization` erstellt
2. **User verknüpfen**: `User.organizationId` wird auf die neue Organization gesetzt
3. **CrmContacts erstellen**: Für jeden User wird ein 1:1 verknüpfter `CrmContact` erstellt

### Beispiel aus PreProd-Dump

```
User "Thomas Schwarz"     → Organization "Privat"
User "Jacqueline Schwarz" → Organization "Bechtle IT-Systemhaus"
User "Admin"              → Organization "Schwarz Management Consulting GmbH"
```

### Rollback (Notfall)

```bash
# ACHTUNG: Nur wenn Migration fehlgeschlagen!
# Die temporäre Mapping-Tabelle enthält die Original-Daten

SELECT * FROM "_V489_UserOrgMapping";

# Bei Bedarf können die Werte zurückgeschrieben werden
# (Kontaktiert das Entwicklungsteam für Unterstützung)
```

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

## 🚀 Neue Deployment-Architektur (ab V4.8.7)

### Übersicht

```
┌─────────────────┐    Push/Release    ┌──────────────────┐
│     GitHub      │ ────────────────▶  │  GitHub Actions  │
│ (Source of Truth)│                    │   (CI/CD)        │
└─────────────────┘                    └────────┬─────────┘
                                                │
                                                │ SSH Deploy
                                                ▼
┌─────────────────┐    Secrets         ┌──────────────────┐
│    Infisical    │ ────────────────▶  │     SMCVS01      │
│   (SMC-Vault)   │                    │  (Docker Host)   │
└─────────────────┘                    └──────────────────┘
```

### Die 3 Säulen

| Säule | Verantwortung | System |
|-------|---------------|--------|
| **Code-Hoheit** | Quellcode, Versionierung | GitHub |
| **Secret-Hoheit** | Umgebungsvariablen, Credentials | Infisical |
| **Deployment** | Build, Test, Deploy | GitHub Actions |

---

## 1️⃣ GitHub Repository Setup

### Repository-Struktur

```
smc-office/
├── .github/
│   └── workflows/
│       └── deploy.yml       # CI/CD Pipeline
├── prisma/
│   └── schema.prisma
├── app/                     # Next.js App Router
├── Dockerfile
├── docker-compose.production.yml
├── docker-entrypoint.sh
├── CHANGELOG.md
└── DEPLOYMENT.md            # Diese Datei
```

### GitHub Secrets konfigurieren

Unter `Repository → Settings → Secrets and variables → Actions`:

| Secret | Beschreibung | Beispiel |
|--------|-------------|----------|
| `SSH_USER` | SSH-Benutzer auf SMCVS01 | `deploy` |
| `SSH_PRIVATE_KEY` | SSH Private Key (Ed25519) | `-----BEGIN OPENSSH...` |
| `SSH_PORT` | SSH Port (optional) | `22` |
| `GHCR_TOKEN` | GitHub Container Registry Token | `ghp_xxx...` |

### SSH-Key auf SMCVS01 einrichten

```bash
# Auf SMCVS01 als deploy-User:
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Public Key hinzufügen (aus GitHub Secrets)
echo "ssh-ed25519 AAAA..." >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## 2️⃣ GitHub Actions CI/CD

### Automatische Trigger (V4.8.9)

| Trigger | Aktion | Docker-Tags |
|---------|--------|-------------|
| Push auf `main` | Build + Deploy | `main`, `latest`, `vX.Y.Z` |
| Push auf `prod` | Build + Deploy | `prod`, `vX.Y.Z` |
| **Git Tag push** (`v*.*.*`) | Build + Deploy | `vX.Y.Z`, `latest` |
| **Release veröffentlicht** | Build + Deploy | `vX.Y.Z`, `latest` |
| **Manuell** (workflow_dispatch) | Build + Deploy | wählbare Version |

### Workflow-Datei

Die Datei `.github/workflows/deploy.yml` (V4.8.9) enthält:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRIGGER-ÜBERSICHT                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. Push auf main/prod Branch → Build (latest + Branch-Tag)     │
│ 2. Git Tag push (v*.*.*)     → Build (Version-Tag + latest)    │
│ 3. GitHub Release published  → Build (Version-Tag + latest)    │
│ 4. Manueller Start           → Build (wählbare Umgebung)       │
└─────────────────────────────────────────────────────────────────┘
```

**Jobs:**

1. **Build-Job**: Docker-Image bauen mit dynamischem Tagging (Version + latest)
2. **Deploy-Job**: Via SSH auf SMCVS01 deployen mit Health-Check-Retry
3. **Notify-Job**: Bei Fehlern benachrichtigen

### Dynamisches Docker-Tagging

Die Pipeline nutzt `docker/metadata-action@v5` für automatisches Tagging:

```yaml
# Beispiel-Output für Tag v4.8.9:
ghcr.io/smc/smc-office:v4.8.9
ghcr.io/smc/smc-office:4.8.9
ghcr.io/smc/smc-office:4.8
ghcr.io/smc/smc-office:latest
```

### Version-Erkennung (Priorität)

1. **Git Tag** (höchste): `refs/tags/v4.8.9` → `v4.8.9`
2. **Release Tag**: `github.event.release.tag_name` → `v4.8.9`
3. **CHANGELOG.md**: Erste Zeile mit `## [V...]` → `v4.8.9`
4. **Fallback**: `dev-YYYYMMDD`

### Release erstellen (3 Methoden)

**Methode 1: Git Tag pushen (empfohlen)**
```bash
git tag -a v4.8.9 -m "Release V4.8.9"
git push origin v4.8.9
# → Pipeline startet automatisch!
```

**Methode 2: GitHub Release UI**
```
1. GitHub → Releases → Create new release
2. Tag: v4.8.9 (existierend oder neu)
3. Release Notes aus CHANGELOG.md
4. Publish release
→ Pipeline startet automatisch!
```

**Methode 3: Manueller Trigger (Notfall)**
```bash
# Via GitHub CLI
gh workflow run deploy.yml --ref main

# Oder via GitHub UI:
# Actions → Build & Deploy SMC-Office → Run workflow
# Optionen:
#   - Environment: production/staging
#   - Force Deploy: bei hängenden Builds
```

### Rollback zu einer früheren Version

```bash
# In docker-compose.production.yml:
image: ghcr.io/smc/smc-office:v4.8.8  # Statt :latest

# Oder in .env.deploy:
IMAGE_TAG=v4.8.8

# Dann:
docker compose -f docker-compose.production.yml up -d
```

### Troubleshooting

| Problem | Lösung |
|---------|--------|
| Pipeline startet nicht bei Tag | Prüfe Tag-Format: muss `v[0-9]+.[0-9]+.[0-9]+` sein |
| "Run workflow" Button fehlt | `workflow_dispatch` ist jetzt aktiviert |
| Image nicht gefunden | Warte 2-3 Min. nach Pipeline-Ende, dann `docker pull` |
| Health Check failed | Logs prüfen: `docker logs smc-office-prod --tail 100` |

---

## 3️⃣ (LEGACY) Gitea Setup

> ⚠️ **Hinweis:** Gitea wird nur noch als Backup/Mirror verwendet. 
> Primäres Repository ist jetzt GitHub!

### Code in Gitea spiegeln (optional)

```bash
# Initialer Push in euer Gitea
git remote add gitea git@git.smc-office.eu:smc/smc-office.git
git push -u gitea main
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

**Version:** V4.8.9  
**Datum:** 07.03.2026  
**Build-Routes:** 44  
**Node.js:** 20 LTS  
**Next.js:** 14.2.x  
**Yarn:** 4.x Berry (node-modules Linker)  
**Prisma:** 6.7.0 (NICHT upgraden!)  
**Secret Management:** Infisical CLI  

---

## 📝 Changelog (Auszug)

### V4.8.9 - Enterprise-Architektur
- Organization-Tabelle (Outlook-kompatibel)
- User-Organization-Verknüpfung
- CrmContact-User-Verknüpfung (1:1)
- Organizations Admin-Seite mit CRUD
- File Attachments API für Cross-Module-Verknüpfung
- E-Mail-CRM-Link API
- Layout-Konsistenz (SOC/Buchhaltung Theme-Fix)
- File Manager Berechtigungskonzept

### V4.8.8 - Bugfixes
- Header-Problem auf Unterseiten behoben
- Download-Berechtigungs-Bug behoben
- Mobile Navigation korrigiert
- SMC-CRM Mail-Sync Funktionalität

### V4.8.7 - GitHub CI/CD
- GitHub Actions Pipeline
- Automatisches Deployment bei Push/Release  
