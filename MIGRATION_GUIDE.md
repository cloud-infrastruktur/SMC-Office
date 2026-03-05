# SMC Website - Deployment & Migration Guide

**Version:** 4.8.4  
**Stand:** 02. März 2026  
**Node.js:** 20 LTS (erforderlich!)  
**Yarn:** 4.x Berry (node-modules Linker)  
**Prisma:** 6.7.0 (Pinned - NICHT auf 7.x upgraden!)  

---

## ⚠️ Kritische Anforderungen

### Node.js Version
**Node.js 20 LTS ist PFLICHT.** Die @aws-sdk Dependencies schlagen unter Node 18 fehl.

### Yarn Berry (node-modules Modus)
**Das Projekt verwendet Yarn Berry mit klassischem `node-modules` Linker (NICHT PnP!).**

```yaml
# .yarnrc.yml - Aktuelle Konfiguration
nodeLinker: node-modules
```

Dies bedeutet:
- ✅ Klassisches `node_modules` Verzeichnis wird verwendet
- ✅ Maximale Kompatibilität mit allen npm-Paketen
- ✅ `yarn install` im Container erforderlich
- ❌ **KEIN PnP** - `.pnp.cjs` existiert nicht und wird nicht benötigt

### Prisma Version
**Prisma muss auf 6.7.0 gepinnt bleiben.** Ein automatisches Upgrade auf Version 7.x führt zu Breaking Changes im Schema (P1012).

### Datenbank-Name
**Einheitlicher Datenbankname: `smc_office_prod`**
Verwenden Sie diesen Namen konsistent in allen Umgebungen.

---

## 📦 ZIP-Archiv für Deployment

### Erforderliche Dateien im Archiv

| Datei/Verzeichnis | Beschreibung | Pflicht |
|-------------------|-------------|---------|
| `app/` | Next.js App Router Pages | ✅ JA |
| `components/` | React Components | ✅ JA |
| `lib/` | Utility-Funktionen | ✅ JA |
| `prisma/` | Schema und Migrations | ✅ JA |
| `public/` | Statische Assets | ✅ JA |
| `package.json` | Dependencies | ✅ JA |
| `.yarnrc.yml` | Yarn-Konfiguration | ✅ JA |
| `.env.example` | Umgebungsvariablen-Vorlage | ✅ JA |
| `next.config.js` | Next.js-Konfiguration | ✅ JA |
| `tailwind.config.ts` | Tailwind-Konfiguration | ✅ JA |
| `tsconfig.json` | TypeScript-Konfiguration | ✅ JA |

**NICHT im Archiv enthalten (werden im Container generiert):**
- `node_modules/` - wird via `yarn install` erstellt
- `.next/` - wird via `yarn build` erstellt
- `.build/` - Build-Artefakte

### Archiv erstellen

```bash
# Im Projektverzeichnis (nextjs_space)
cd /pfad/zu/smc_website/nextjs_space

# ZIP erstellen (ohne generierte Verzeichnisse)
zip -r ../smc-office_4.8.2.zip . \
  -x "node_modules/*" \
  -x ".next/*" \
  -x ".build/*" \
  -x "*.log" \
  -x ".git/*" \
  -x "uploads/*"

# Archiv-Inhalt prüfen
unzip -l ../smc-office_4.8.2.zip | head -50
```

### Häufige Fehler vermeiden

⚠️ **FALSCH**: Container ohne `yarn install` starten
```
Error: Cannot find module 'next'
```

⚠️ **FALSCH**: Prisma 7.x verwenden
```
Error: P1012 - Schema validation failed
```

✅ **RICHTIG**: `yarn install && yarn prisma generate && yarn build` im Container

---

## Yarn Berry - Grundkonzept

### Warum node-modules Linker (nicht PnP)?

Das Projekt verwendet bewusst den `node-modules` Linker statt Plug'n'Play aus folgenden Gründen:
- ✅ Maximale Kompatibilität mit Prisma und nativen Node-Modulen
- ✅ Einfachere Debug-Möglichkeiten
- ✅ Keine zusätzliche PnP-Loader-Konfiguration nötig
- ✅ Standard-Verhalten, das alle Node.js-Tools erwarten

### Was wäre PnP? (NICHT verwendet!)

PnP würde das klassische `node_modules`-Verzeichnis ersetzen durch:

| Datei/Verzeichnis | Beschreibung |
|-------------------|-------------|
| `.pnp.cjs` | PnP-Loader - löst alle Imports zur Laufzeit auf |
| `.pnp.loader.mjs` | ESM-Loader (optional) |
| `.yarn/cache/` | Komprimierte Dependencies (ZIP-Dateien) |
| `.yarn/unplugged/` | Entpackte Native Modules (Prisma!) |
| `.yarnrc.yml` | Yarn-Konfiguration |

### Warum PnP für Docker?

```
┌─────────────────────────────────────────────┐
│ node_modules (klassisch)              │
├─────────────────────────────────────────────┤
│ ✘ Tausende Dateien (langsames COPY)   │
│ ✘ Symbolische Links brechen           │
│ ✘ Permission-Konflikte (EACCES)       │
│ ✘ Host/Container Pfad-Mismatch        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Yarn PnP                              │
├─────────────────────────────────────────────┤
│ ✓ Wenige Dateien (schnelles COPY)     │
│ ✓ Keine Symlinks nötig                │
│ ✓ Immutable Cache (reproduzierbar)    │
│ ✓ Pfad-unabhängig                      │
└─────────────────────────────────────────────┘
```

---

## Architektur (PnP Edition)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Host (beliebiger Pfad)                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  smc-website    │  │   PostgreSQL    │  │  MinIO (opt.)   │  │
│  │  (Next.js/PnP)  │──│   (Database)    │  │  (S3-Storage)   │  │
│  │  Port: 3000     │  │   Port: 5432    │  │  Port: 9000     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                    │                    │           │
│           └────────────────────┴────────────────────┘           │
│                              │                                  │
│                    ┌─────────┴─────────┐                        │
│                    │    Volumes        │                        │
│                    │  - uploads/       │                        │
│                    │  - pg_data/       │                        │
│                    │  - minio_data/    │                        │
│                    └───────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## PnP-spezifische Konfiguration

### Dual-Configuration Ansatz

Das Projekt verwendet zwei Yarn-Konfigurationen:

| Datei | Zweck | nodeLinker |
|-------|-------|------------|
| `.yarnrc.yml` | Entwicklung & gehostete Umgebungen | node-modules |
| `.yarnrc.docker.yml` | Docker-Deployment | pnp |

**Warum zwei Dateien?**
- Gehostete Plattformen (wie Abacus.AI) erwarten oft `node_modules`
- Docker-Deployment profitiert von PnP (Portabilität, Geschwindigkeit)
- Das Dockerfile kopiert `.yarnrc.docker.yml` als `.yarnrc.yml` im Build

### .yarnrc.docker.yml (PnP für Docker)

```yaml
# Full PnP Mode
nodeLinker: pnp

# Globaler Cache deaktiviert (im Container nicht nötig)
enableGlobalCache: false

# Package Extensions für Prisma
packageExtensions:
  "@prisma/client@*":
    dependencies:
      prisma: "*"
```

### Prisma im PnP-Modus

Prisma benötigt native Query Engines, die nicht in ZIP-Dateien gepackt werden können. Daher werden sie mit `unplugged: true` entpackt:

```
.yarn/
├── cache/              # Normale Dependencies (ZIP)
└── unplugged/          # Native Modules (entpackt)
    ├── prisma-npm-X.X.X/
    └── @prisma-client-npm-X.X.X/
```

### NODE_OPTIONS für PnP

Der PnP-Loader muss bei jedem `node`-Aufruf geladen werden:

```bash
# In Dockerfile/Entrypoint
export NODE_OPTIONS="--require /app/.pnp.cjs"

# ODER via yarn (lädt Loader automatisch)
yarn node server.js
yarn prisma generate
yarn prisma migrate deploy
```

---

## Quick Start (Docker Compose)

### 1. Verzeichnisstruktur erstellen

```bash
# Beliebiges Verzeichnis - KEINE festen Pfade erforderlich!
mkdir -p /DATA/AppData/smc-website
cd /DATA/AppData/smc-website
```

### 2. docker-compose.yml erstellen

```yaml
version: '3.8'

services:
  smc-website:
    build:
      context: ./src
      dockerfile: Dockerfile
    container_name: smc-website
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://smc_user:smc_secure_password@postgres:5432/smc_office_prod
      - NEXTAUTH_URL=https://smc.nrw
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      # CalDAV-Verschlüsselung
      - CALDAV_ENCRYPTION_KEY=${CALDAV_ENCRYPTION_KEY}
      # Optional: MinIO/S3 Konfiguration
      - S3_ENDPOINT=http://minio:9000
      - S3_BUCKET_NAME=smc-uploads
      - S3_ACCESS_KEY=${MINIO_ROOT_USER}
      - S3_SECRET_KEY=${MINIO_ROOT_PASSWORD}
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  postgres:
    image: postgres:15-alpine
    container_name: smc-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=smc_user
      - POSTGRES_PASSWORD=smc_secure_password
      - POSTGRES_DB=smc_office_prod
    volumes:
      - ./pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U smc_user -d smc_office_prod"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### 3. .env Datei erstellen

```bash
# .env
NEXTAUTH_SECRET=your-super-secret-key-min-32-chars
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
```

### 4. Starten

```bash
docker-compose up -d
```

**Das war's!** Der Container:
1. ✅ Lädt PnP-Loader automatisch
2. ✅ Generiert den Prisma Client
3. ✅ Führt Datenbankmigrationen aus
4. ✅ **Seedet automatisch** wenn die Datenbank leer ist
5. ✅ Startet den Next.js Server

---

## Dockerfile Multi-Stage Build (PnP)

### Stage 1: Dependencies
```dockerfile
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare yarn@stable --activate

COPY package.json .yarnrc.yml ./
COPY .yarn/plugins ./.yarn/plugins

# PnP-Installation (generiert .pnp.cjs, .yarn/cache, .yarn/unplugged)
RUN yarn install --immutable
```

### Stage 2: Builder
```dockerfile
FROM node:20-alpine AS builder

# PnP-Dateien aus deps kopieren
COPY --from=deps /app/.pnp.cjs ./
COPY --from=deps /app/.yarn ./.yarn

# Quellcode
COPY . .

# PnP-Loader aktivieren
ENV NODE_OPTIONS="--require /app/.pnp.cjs"

# Build (yarn nutzt PnP automatisch)
RUN yarn prisma generate
RUN yarn build
```

### Stage 3: Runner
```dockerfile
FROM node:20-alpine AS runner

# PnP-Dateien (kompakt!)
COPY --from=builder /app/.pnp.cjs ./
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/package.json ./

# Next.js Standalone Build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# PnP aktivieren
ENV NODE_OPTIONS="--require /app/.pnp.cjs"

CMD ["node", "server.js"]
```

---

## Automatische Datenbank-Initialisierung

### Funktionsweise

Der Container-Entrypoint (`docker-entrypoint.sh`) prüft beim Start:

```bash
# Pseudo-Code
if (User-Tabelle leer) {
  run seed.js  # Erstellt Admin, Kategorien, Kompetenzen, etc.
} else {
  skip seed    # Datenbank bereits initialisiert
}
```

### Was wird geseeded?

| Bereich | Inhalt |
|---------|--------|
| **Admin-User** | admin@smc-office.eu (Passwort: soadmin146810!) |
| **Kategorien** | Training, Referenz, Projekt-Kategorien |
| **Kompetenzen** | ITSM, Provider-Mgmt, Test-Mgmt, etc. |
| **Trainings** | ITIL, PRINCE2, Scrum, etc. |
| **SOC Services** | Security Operations Center Dienste |
| **Site Content** | Seiten-Inhalte und Texte |

### Manuelles Seeding (PnP)

```bash
# In laufendem Container (yarn nutzt PnP automatisch)
docker exec -it smc-website sh
yarn node /app/scripts/seed.js

# ODER von außen
docker exec smc-website yarn node /app/scripts/seed.js
```

---

## Troubleshooting

### "Cannot find module" Fehler

**Ursache:** PnP-Loader nicht geladen.

```bash
# Prüfen ob NODE_OPTIONS gesetzt ist
echo $NODE_OPTIONS
# Sollte anzeigen: --require /app/.pnp.cjs

# Manuell setzen
export NODE_OPTIONS="--require /app/.pnp.cjs"
```

### "ENOENT .pnp.cjs" Fehler

**Ursache:** PnP-Dateien fehlen im Container.

```bash
# Im Container prüfen
docker exec smc-website ls -la /app/.pnp.cjs /app/.yarn/

# Falls fehlend: Image neu bauen
docker build --no-cache -t smc-website:latest .
```

### Prisma "Could not find Query Engine" Fehler

**Ursache:** Prisma nicht korrekt entpackt.

```bash
# Prüfen ob unplugged-Verzeichnis existiert
docker exec smc-website ls -la /app/.yarn/unplugged/

# .yarnrc.yml prüfen (unplugged: true für Prisma?)
```

### Container startet nicht (unhealthy)

```bash
# Logs prüfen
docker logs smc-website

# Häufige Ursachen:
# 1. PnP-Loader fehlt → NODE_OPTIONS prüfen
# 2. Datenbank nicht erreichbar → depends_on + healthcheck
# 3. Prisma Engine fehlt → Image neu bauen
```

### Lokale Entwicklung mit PnP

```bash
# Erste Installation
yarn install

# IDE-Unterstützung (VSCode)
yarn dlx @yarnpkg/sdks vscode

# TypeScript Plugin
yarn plugin import typescript
```

---

## Migration von node_modules zu PnP

### 1. .yarnrc.yml anpassen

```yaml
# Von:
nodeLinker: node-modules

# Zu:
nodeLinker: pnp  # oder Zeile entfernen (pnp ist Standard)
```

### 2. Cache löschen und neu installieren

```bash
rm -rf node_modules .yarn/install-state.gz
yarn install
```

### 3. PnP-Dateien ins Git

```bash
# .gitignore anpassen
# Nicht ignorieren:
# .pnp.cjs
# .pnp.loader.mjs
# .yarn/cache/
# .yarn/unplugged/
```

### 4. Docker Image neu bauen

```bash
docker build --no-cache -t smc-website:latest .
```

---

## Wichtige Umgebungsvariablen

| Variable | Pflicht | Beschreibung |
|----------|---------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL Connection String |
| `NEXTAUTH_URL` | ✅ | Öffentliche URL (z.B. https://smc.nrw) |
| `NEXTAUTH_SECRET` | ✅ | Session-Verschlüsselung (min. 32 Zeichen) |
| `NODE_OPTIONS` | ✅ | `--require /app/.pnp.cjs` (PnP-Loader) |
| `S3_ENDPOINT` | ❌ | MinIO/S3 Endpoint (für Cloud-Storage) |
| `S3_BUCKET_NAME` | ❌ | Bucket-Name für Uploads |

---

## Backup & Restore

### Datenbank Backup

```bash
# Backup erstellen
docker exec smc-postgres pg_dump -U smc_user smc_office_prod > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260228.sql | docker exec -i smc-postgres psql -U smc_user -d smc_office_prod
```

### Uploads Backup

```bash
# Einfach das Volume-Verzeichnis sichern
tar -czf uploads_backup.tar.gz ./uploads/
```

---

## Sicherheit

### Produktions-Checkliste

- [ ] `NEXTAUTH_SECRET` ist ein starkes, zufälliges Passwort
- [ ] `NEXTAUTH_URL` verwendet HTTPS
- [ ] Datenbank-Passwort ist sicher
- [ ] MinIO/S3 Credentials sind sicher
- [ ] Container läuft als non-root User (nextjs:nodejs)
- [ ] Volumes sind korrekt berechtigt
- [ ] Reverse Proxy (nginx/traefik) mit SSL konfiguriert

---

## Dark Mode

### Funktionsweise

Der Dark Mode verwendet `next-themes` mit automatischer LocalStorage-Persistence.

### Theme-Optionen

| Option | Beschreibung |
|--------|-------------|
| **Hell** | Helles Theme (Standard) |
| **Dunkel** | Dunkles Theme |
| **System** | Folgt Betriebssystem-Einstellung |

---

## Kontakt

**Technischer Support:**  
DeepAgent / Abacus.AI Platform

**Domain & Hosting:**  
smc.nrw / SMC GmbH
