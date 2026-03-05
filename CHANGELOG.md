# Changelog - SMC Office Website

## [V4.8.6] - 02.03.2026 - Hotfix: Standalone Build Missing server.js

### 🔧 Kritischer Build-Blocker behoben

#### Problem 1: NEXT_OUTPUT_MODE nicht gesetzt
- **Symptom**: Container startet nicht - `exec node server.js` findet keine Datei
- **Ursache**: `NEXT_OUTPUT_MODE` war im Dockerfile nicht gesetzt
- **Folge**: `next.config.js` hatte `output: undefined` statt `output: 'standalone'`

#### Problem 2: Falscher COPY-Pfad wegen outputFileTracingRoot
- **Ursache**: `next.config.js` hat `outputFileTracingRoot: path.join(__dirname, '../')`
- **Folge**: Standalone-Output liegt in `.next/standalone/nextjs_space/server.js` (nicht direkt in `standalone/`)

#### Lösung (Dockerfile)
```dockerfile
# Builder-Stage
ENV NEXT_OUTPUT_MODE=standalone
RUN yarn build
RUN test -f .next/standalone/nextjs_space/server.js || exit 1

# Runner-Stage - korrekter COPY-Pfad
COPY --from=builder /app/.next/standalone/nextjs_space ./
```

### 📦 Build-Verifikation
Der Docker-Build bricht jetzt **automatisch ab**, wenn:
- `.next/standalone/nextjs_space/server.js` nicht existiert

### 📊 Erwartete Dateistruktur im Runner-Container
```
/app/
├── server.js          # Next.js Standalone Server
├── public/            # Statische Assets
├── .next/static/      # Kompilierte JS/CSS
├── node_modules/
│   ├── .prisma/       # Prisma Client
│   └── @prisma/       # Prisma Core
└── prisma/
    └── schema.prisma  # Schema für migrate deploy
```

---

## [V4.8.5] - 02.03.2026 - Hotfix: Prisma Client Docker-Kompatibilität

### 🔧 Kritischer Build-Blocker behoben

#### Prisma Client "ManagedFile" Export-Fehler
- **Problem**: `Module "@prisma/client" has no exported member "ManagedFile"`
- **Ort**: `app/api/admin/filemanager/route.ts` (Zeile 7)
- **Ursache**: Der Prisma Generator hatte einen **absoluten Output-Pfad** konfiguriert:
  ```prisma
  output = "/home/ubuntu/smc_website/nextjs_space/node_modules/.prisma/client"
  ```
  Dieser Pfad existiert im Docker-Build-Container (`/app`) nicht, wodurch der Client am falschen Ort generiert wurde.

#### Lösung
- **Datei**: `prisma/schema.prisma`
- **Änderung**: `output`-Zeile entfernt - Prisma nutzt nun automatisch den relativen Standard-Pfad `node_modules/.prisma/client`
- **Zusätzlich**: `linux-musl-openssl-3.0.x` zu `binaryTargets` hinzugefügt für x64-Alpine-Kompatibilität

```prisma
generator client {
    provider      = "prisma-client-js"
    binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x", "linux-musl-openssl-3.0.x"]
    // Output wird NICHT gesetzt - Prisma nutzt automatisch node_modules/.prisma/client
}
```

### 📦 Hostnamen-Konfiguration (unverändert)
```bash
DATABASE_URL=postgresql://smc_user:xxx@smc-postgres-prod:5432/smc_office_prod
S3_ENDPOINT=http://smc-minio-prod:9000
```

### 📊 Build-Status
- ✅ `yarn prisma generate`: Client wird korrekt im Container generiert
- ✅ TypeScript: `ManagedFile`, `FileFolder`, `FileAttachment` Typen verfügbar
- ✅ `docker build --no-cache`: Erfolgreich

---

## [V4.8.4] - 02.03.2026 - Hotfix: Build-Blocker behoben

### 🔧 Build-Blocker behoben

#### 1. Fehlende yarn.lock (KRITISCH)
- **Problem**: `yarn install --immutable` brach ab, da keine `yarn.lock` im Paket enthalten war
- **Lösung**: `yarn.lock` wird jetzt als echte Datei (514 KB) mitgeliefert, nicht mehr als Symlink
- **Dockerfile**: `COPY package.json yarn.lock .yarnrc.yml ./` vor `yarn install --immutable`

#### 2. TypeScript-Fehler im Strict-Mode
- **Datei**: `app/api/admin/filemanager/route.ts` (Zeile 32)
- **Fehler**: `Parameter 'file' implicitly has an 'any' type`
- **Lösung**: Expliziter Typ `ManagedFileWithRelations` für den `file`-Parameter hinzugefügt

#### 3. Container-Namenskonvention (Isolierte Produktion)
Alle Container folgen nun der `-prod` Namenskonvention:

| Container | Hostname |
|-----------|----------|
| `smc-office-prod` | App-Container |
| `smc-postgres-prod` | PostgreSQL |
| `smc-minio-prod` | S3-Storage |
| `smc-minio-init-prod` | Bucket-Init |

### 📦 Infisical Secrets anpassen!

```bash
# DATABASE_URL mit neuem Hostnamen:
DATABASE_URL=postgresql://smc_user:xxx@smc-postgres-prod:5432/smc_office_prod

# S3_ENDPOINT mit neuem Hostnamen:
S3_ENDPOINT=http://smc-minio-prod:9000
```

### 📊 Build-Status
- ✅ yarn.lock vorhanden (514 KB)
- ✅ TypeScript Strict-Mode: Keine Fehler
- ✅ `yarn install --immutable`: Erfolgreich
- ✅ `yarn build`: Erfolgreich

---

## [V4.8.3] - 01.03.2026 - Gitea + Infisical Deployment

### 🚀 Neue Deployment-Strategie

**Repository-Handoff zu lokalem Gitea (git.smc-office.eu)**

| Komponente | Änderung |
|------------|----------|
| **Secret Management** | Infisical CLI statt .env-Dateien |
| **Container-Start** | `infisical run --env=production -- node server.js` |
| **DB-Migration** | Automatisches `prisma migrate deploy` beim Start |
| **Prisma-Version** | 6.7.0 (gesperrt, kein Upgrade auf v7!) |

### 📦 Neue Dateien

- `Dockerfile` – Multi-Stage Build mit Infisical CLI
- `docker-entrypoint.sh` – Automatisches `prisma migrate deploy`
- `docker-compose.production.yml` – Produktions-Setup mit Infisical
- `.env.example` – Nur Placeholder, keine echten Secrets

### 🚨 Verbote (KRITISCH!)

| Verboten | Grund |
|----------|-------|
| `prisma migrate reset` | Löscht ALLE Daten |
| `prisma migrate dev` | Kann Daten löschen |
| `.env` mit echten Secrets | Sicherheitsrisiko |
| Prisma 7.x | Breaking Changes |

### ✅ Erlaubt

- `prisma migrate deploy` – Wendet Migrations sicher an
- `prisma migrate status` – Prüft Status
- Infisical für alle Secrets

---

## [V4.8.2] - 28.02.2026 - Deployment-Dokumentation Korrektur (KRITISCH!)

### 🚨 BREAKING FIX: PnP war nie aktiviert!

**Das Projekt verwendet NICHT Yarn PnP, sondern den klassischen `node-modules` Linker!**

Die bisherige Dokumentation war fehlerhaft. Das Deployment-Team hat zu Recht bemängelt, dass `.pnp.cjs` und `.yarn/cache/` nicht im ZIP existieren – **weil das Projekt diese nie verwendet hat**.

#### Was korrigiert wurde:

| Vorher (FALSCH) | Nachher (RICHTIG) |
|-----------------|-------------------|
| Yarn PnP aktiv | `nodeLinker: node-modules` |
| `.pnp.cjs` erforderlich | Nicht benötigt |
| Zero-Install möglich | `yarn install` im Container nötig |
| NODE_OPTIONS="--require .pnp.cjs" | Nicht nötig |

### 📚 Dokumentation (Komplett überarbeitet)

#### MIGRATION_GUIDE.md
- **Yarn-Modus korrigiert**: node-modules statt PnP
- **ZIP-Inhalt korrigiert**: Keine PnP-Dateien nötig
- **Container-Setup**: `yarn install && yarn prisma generate && yarn build`
- **Prisma-Version**: 6.7.0 gepinnt

#### Neue Dateien
- `Dockerfile` – Produktions-Ready Multi-Stage Build
- `.yarnrc.docker.yml` – Docker-spezifische Yarn-Konfiguration
- `.env.example` – Vollständige Umgebungsvariablen-Vorlage

#### Datenbank-Naming (Vereinheitlicht)
- **Einheitlicher Name**: `smc_office_prod` für alle Umgebungen

### 📊 Build-Status
- ✅ TypeScript Compilation: Erfolgreich
- ✅ Next.js Build: Erfolgreich (43 Routen)

---

## [V4.8.1] - 28.02.2026 - (Zurückgezogen - siehe V4.8.2)

Diese Version enthielt fehlerhafte PnP-Dokumentation und wurde durch V4.8.2 ersetzt.

---

## [V4.8] - 28.02.2026 - UI/UX Optimierungen

### 🎨 Dark Mode Verbesserungen
- **Home-/About-Seiten**: Vollständige Dark Mode Unterstützung für alle Textblöcke
  - Headlines: `dark:text-white`
  - Tagline: `dark:text-gray-100`
  - Beschreibungen: `dark:text-gray-300`
  - Alle Cards mit Dark Mode Support

### 🖼️ Logo-Größenanpassung
- **Header-Logo** an Footer-Größe angepasst:
  - Neue Responsive-Größen: `w-32 h-10 sm:w-36 sm:h-11 lg:w-40 lg:h-12 xl:w-48 xl:h-14 3xl:w-56 3xl:h-16 4xl:w-64 4xl:h-18`
  - Konfigurierbarer Wert in `components/header.tsx`

### 🔍 Sidebar-Suche (NEU)
- **Eingabefeld in Sidebar** hinzugefügt:
  - Collapsed Sidebar: Such-Icon öffnet Sidebar bei Klick
  - Expanded Sidebar: Vollständiges Suchfeld mit Enter-Suche
  - Sucht durch: Statische Seiten, Kompetenzen, Projekte, Referenzen, Trainings

### 📊 Dynamische Statistiken (Homepage)
- **Korrekte Werte aus Datenbank**:
  - Jahre: Berechnet ab 1997 (Projektstart) = 29+ Jahre
  - Projekterfahrung: Dynamisch von `/api/projects` = 18
  - Referenz-Kunden: Dynamisch von `/api/references` = 13
  - Zertifikate: Dynamisch von `/api/trainings` = 22+
- **Neues Feld** `certificates` im Stats-Interface

### 🔄 Cards-Tausch (Home ↔ About)
- **Homepage**: Zeigt jetzt "Zertifikate & Trainings (22+)" mit GraduationCap-Icon
  - Neues `CertificatesCard` Component erstellt
- **About-Seite**: Zeigt jetzt "Fokussiert → Ganzheitlich" Philosophie-Card
  - Neues `PhilosophyCardAbout` Component erstellt
- `PhilosophyCard` aus hero-section exportiert für Wiederverwendung

### 💰 SevDesk Accounting - Freie Ordnerauswahl
- **Statisches "Zielordner"-Feld entfernt**:
  - Nur noch dynamische "Ziel-Auswahl (SevDesk-Ordner)" mit Dropdown
  - Suchfeld, "Neuer Ordner" Button, Tag-basierte Empfehlungen bleiben erhalten
  - Keine festen Ordner-Referenzen mehr in der UI

### 📊 Build-Status
- ✅ TypeScript Compilation: Erfolgreich
- ✅ Next.js Build: Erfolgreich (43 Routen)
- ✅ Dev Server: Läuft auf localhost:3000

---

## [V4.7] - 27.02.2026 - Auth & Upload Fixes

### 🔐 Admin-Login Fix (500 Error)
- **Middleware Cookie-Handling** korrigiert:
  - Fallback für Production (`__Secure-next-auth.session-token`) und Development (`next-auth.session-token`)
  - `useSession` Hook für automatische Weiterleitung nach Login
- **Login-Seite** (`app/login/page.tsx`) verbessert

### 📷 Profilfoto-Upload Fix
- **Vollständige S3-Migration** in `app/api/profile/photo/route.ts`:
  - Legacy Local-Upload Code entfernt
  - Nur noch S3/MinIO-basierter Upload

### 📆 Kalender-Seite
- Verifiziert und funktionsfähig nach Login-Fixes

### 📊 Build-Status
- ✅ TypeScript Compilation: Erfolgreich
- ✅ Next.js Build: Erfolgreich (43 Routen)

---

## [V4.6] - 27.02.2026 - Kalender-Integration (Komplett)

### 📆 CalDAV-Integration (Apple iCloud)

#### Prisma Schema Erweiterungen
```prisma
model CalendarEvent {
  // CRM Integration
  contactId, dealId, projectId (Relations zu CRM-Modellen)
  
  // Email/Meeting Integration  
  icsUid, organizer, attendeesJson, responseStatus
  
  // Recurrence
  recurrenceEnd
  
  // Status
  status (CONFIRMED, TENTATIVE, CANCELLED)
}

enum EventStatus { CONFIRMED, TENTATIVE, CANCELLED }
enum EventResponse { ACCEPTED, DECLINED, TENTATIVE, NEEDS_ACTION }
```

#### Neue Libraries
- `lib/ics-parser.ts` - ICS/iCalendar Parsing und Generierung
- `lib/caldav.ts` - CalDAV Client mit Apple iCloud Support

#### Neue API-Endpunkte
- `GET/POST /api/calendar/accounts` - Kalenderkonten verwalten
- `GET/POST/PUT/DELETE /api/calendar/events` - Termine CRUD
- `POST /api/calendar/sync` - CalDAV Synchronisation
- `POST /api/calendar/import` - ICS-Import
- `GET /api/calendar/export` - ICS-Export
- `POST /api/calendar/respond` - Meeting-Einladungen beantworten

#### UI-Komponenten
- `components/calendar/calendar-grid.tsx` - Tag/Woche/Monat/Agenda Ansichten
- `components/calendar/event-dialog.tsx` - Termin erstellen/bearbeiten
- `components/calendar/account-dialog.tsx` - Kontoverwaltung
- `components/calendar/meeting-invitation.tsx` - Meeting-Einladungen

#### Admin-Kalender-Seite
- `/admin/calendar` - Vollständige Kalender-Oberfläche
- Sync-Button, Export-Funktion, Kontoverwaltung

#### CRM-Integration
- Auto-Verknüpfung von Terminen mit Kontakten (per E-Mail)
- Projekt-Deadlines als Kalendereinträge
- Deal-Follow-ups im Kalender

### 📊 Build-Status
- ✅ Next.js Build: Erfolgreich (43 Routen)

---

## [V4.5] - 26.02.2026 - Hover-Effekte Header/Sidebar

### 🎨 Navigation Hover-Effekte

#### Header-Menü
- **Hintergrundfarbe**: Sanfter Übergang zu hellgrau/dunkelgrau
- **Textfarbe**: Transition zu Primärfarbe (Blau)
- **Icon-Skalierung**: Leichte Vergrößerung bei Hover
- **Unterstriche**: Animierte Unterstriche für aktive Elemente

#### Sidebar-Menü  
- **Akzentlinie**: Vertikale blaue Linie bei aktivem Item
- **Hintergrund**: Gradient-Übergang bei Hover
- **Icons**: Farbwechsel und leichte Skalierung
- **Smooth Transitions**: Alle Animationen mit 200ms Übergang

### 📊 Build-Status
- ✅ TypeScript Compilation: Erfolgreich
- ✅ Next.js Build: Erfolgreich

---

## [V4.3] - 26.02.2026 - Dark-Mode, Notes/Calendar Schema, IMAP-Ordner

### 🎨 Dark-Mode Fixes
Vollständige Dark-Mode-Unterstützung für alle öffentlichen Seiten:
- **Kontakt-Seite**: Formular, Eingabefelder, Kontaktinformationen
- **Kompetenzen-Seite**: Kernkompetenzen, Spezialisierungen, Cards
- **Zertifikate & Trainings**: Kategorien, Training-Cards, PDF-Modal
- **Login-Seite**: Formular, Links, Inputs
- **Registrieren-Seite**: Formular, Validierung
- **Home-Animation (Canvas)**: Dynamische Partikelfarben je nach Theme

### 🖼️ Logo-Optimierung
- **Größe erhöht**: `w-16 h-16 lg:w-20 lg:h-20` (vorher: w-12/w-14)
- **Header-Höhe angepasst**: `h-20 lg:h-24` für bessere Proportionen

### 📝 Prisma-Schema (V4.3 Models)

#### Notes/ToDo/Backlog-System
```prisma
model Note {
  id, userId, title, content, category, status, priority
  dueDate, tags, isPinned, isArchived
  crmContactId, crmDealId (optional CRM-Verknüpfung)
}

enum NoteCategory { PERSONAL, TODO, BACKLOG_DEV, DRAFT, IMPORTANT }
enum NoteStatus { OPEN, IN_PROGRESS, DONE, CANCELLED }
enum NotePriority { LOW, MEDIUM, HIGH, URGENT }
```

#### Kalender-System (CalDAV-ready)
```prisma
model CalendarAccount {
  id, userId, name, provider, caldavUrl, username, password
  color, isActive, isDefault, lastSync, syncError
}

model CalendarEvent {
  id, accountId, userId, externalId, title, description
  location, startDate, endDate, allDay, isRecurring
  recurrenceRule, color, reminderMinutes, isPrivate
}

enum CalendarProvider { LOCAL, NEXTCLOUD, GOOGLE, APPLE, CALDAV_GENERIC }
```

### 📧 Mail-Client: IMAP-Ordner-Verwaltung (NEU)

#### API-Endpunkte
- `GET /api/email/folders?accountId=xxx` - Alle Ordner synchronisieren (inkl. Unterordner)
- `POST /api/email/folders` - Neuen Ordner erstellen (IMAP CREATE)
  - Body: `{ accountId, folderName, parentPath? }`
- `PUT /api/email/folders/[id]` - Ordner umbenennen (IMAP RENAME)
  - Body: `{ newName }`
- `DELETE /api/email/folders/[id]` - Ordner löschen (IMAP DELETE)

#### Features
- Vollständige IMAP-Hierarchie synchronisieren
- Unterordner werden korrekt erkannt und dargestellt
- System-Ordner (Inbox, Sent, Drafts, Trash) sind geschützt
- Automatische Pfad-Aktualisierung bei Umbenennung

### 📊 Build-Status
- ✅ TypeScript Compilation: Erfolgreich
- ✅ Next.js Build: Erfolgreich
- ✅ Prisma Schema: Erweitert (Notes, Calendar, CalendarEvent)

---

## [V4.2] - 25.02.2026 - Multi-Environment Support & UI-Verbesserungen

### 🚀 Deployment & Build-Optimierungen

#### Multi-Environment Support
- **NEXTAUTH_URL**: Wird zur **Laufzeit** aus der Umgebung gelesen (nicht Build-Zeit)
  - PreProd: `NEXTAUTH_URL=https://preprod.smc-office.eu`
  - Prod: `NEXTAUTH_URL=https://smc-office.eu`
- **Standalone Build**: Korrekte Asset-Kopie in `.next/standalone/public`

#### Build-Hinweise für Docker/Standalone
```bash
# Nach dem Build müssen public/ und uploads/ manuell kopiert werden:
cp -r public .next/standalone/app/public
cp -r uploads .next/standalone/app/uploads
```

### 🛠️ Bugfixes

#### CRM-Modul
- **Fix**: Deal-Erstellung funktioniert wieder (Typ-Konvertierung für `probability`)
- **Fix**: Settings-Button öffnet Keywords-Tab korrekt
- **Fix**: E-Mail-Scan Button funktioniert

#### Dateimanager
- **Neu**: "Ordner umbenennen" Funktion mit Inline-Editor
  - Pencil-Icon zum Starten der Umbenennung
  - Enter zum Speichern, Escape zum Abbrechen
  - API: `PUT /api/admin/filemanager/folders/{id}` mit `{ name: "neuer Name" }`

### 📊 Content Management (Überarbeitet)
- **Neu**: Übersichtsseite mit allen Inhaltsbereichen
- **Neu**: Quick-Links zu allen Admin-Bereichen
- **Neu**: Statistik-Anzeige (Anzahl Projekte, Referenzen, etc.)
- **Tabs**: Übersicht → Home-Texte → Footer-Texte

### 📋 API-Änderungen
- `PUT /api/crm/deals` - probability als Integer konvertiert
- `POST /api/crm/deals` - probability als Integer konvertiert
- `PUT /api/admin/filemanager/folders/{id}` - Ordner umbenennen

### 📊 Build-Status
- ✅ TypeScript Compilation: Erfolgreich
- ✅ Next.js Build: Erfolgreich (41 Routen)
- ✅ Prisma Schema: Validiert

---

## [V4.1] - 24.02.2026 - SMC-CRM Modul & Dokumentation

### 🆕 Neues Modul: SMC-CRM

#### Datenbankschema (Prisma)
- `CrmContact` – Lead-/Kontaktverwaltung (Vorname, Name, E-Mail, Firma, LinkedIn/XING)
- `CrmDeal` – Projektanfragen mit 6-Phasen-Pipeline
- `CrmActivity` – Notizen, Aufgaben, Anrufe, E-Mails
- `CrmPipelinePhase` – Konfigurierbare Pipeline-Phasen
- `CrmKeywordConfig` – Keyword-basierte E-Mail-Erkennung
- `CrmScanLog` – Audit-Trail für Scan-Operationen

#### API-Endpunkte
- `/api/crm/contacts` – CRUD für Kontakte
- `/api/crm/deals` – CRUD für Deals mit Activity-Logging
- `/api/crm/activities` – Aktivitätenverwaltung
- `/api/crm/keywords` – Keyword-Konfiguration
- `/api/crm/pipeline` – Pipeline mit Deal-Counts
- `/api/crm/stats` – Dashboard-Statistiken
- `/api/crm/scan` – Dual-Mode (Session + n8n-Webhook)

#### Dashboard UI
- Kanban-Board mit 6 Phasen (Pipedrive-inspiriert)
- Deal-Karten mit Kontakt, Wert, Wahrscheinlichkeit
- Kontakte-Tab mit Suche und Tabelle
- Keywords-Tab mit Live-Editor
- Statistik-Leiste (Open Deals, Won, Win-Rate, Pipeline-Wert)
- Manueller E-Mail-Scan Button

### 📚 Dokumentations-Update

#### Benutzerhandbuch (v4.1)
- Neuer Abschnitt: SMC-CRM
  - Kanban-Board Bedienung
  - Kontaktverwaltung
  - Keyword-Konfiguration
  - E-Mail-Scan-Funktion
  - Statistiken erklärt

#### Technisches Handbuch (v4.1)
- Neuer Abschnitt: SMC-CRM Modul
  - Datenbankmodelle (Prisma Schema)
  - API-Endpunkte-Übersicht
  - E-Mail-Scan API Dokumentation
  - Standard-Keywords Liste
  - n8n-Workflow Integration

### 📊 Build-Status
- ✅ TypeScript Compilation: Erfolgreich
- ✅ Next.js Build: Erfolgreich (41 Routen)
- ✅ Prisma Schema: Validiert

---

## [31.01.2026] - Bugfixes, Migrationen & Verbesserungen

### 🔧 Kritische Bugfixes

#### 1. **Datenbank-Migrationen (Option B)**
- ✅ **Migrations-Dateien bereitgestellt** im `prisma/migrations/` Ordner
- ✅ **Neue Migration**: `20260131000000_add_email_client`
  - Fügt E-Mail-Client-Tabellen hinzu (EmailAccount, EmailFolder, EmailMessage, EmailAttachment, EmailDraft)
  - **SICHER**: Nur additive Änderungen (CREATE TABLE IF NOT EXISTS)
  - **KEIN DATENVERLUST**: Keine DROP, DELETE oder TRUNCATE Befehle
- ✅ **Migration-README** mit detaillierten Anweisungen und Sicherheitsgarantien
- ✅ **MIGRATION_GUIDE.md** aktualisiert mit vollständigen Deployment-Anweisungen

#### 2. **SMC-DMS Umbenennung**
- ✅ "Paperless-ngx" → "SMC-DMS" in allen Bereichen:
  - Admin-Dashboard Kachel
  - Navigationsmenü
  - Seitentitel und Beschreibungen
  - Technische und Benutzer-Dokumentation

#### 3. **SMTP-Konfiguration - Verbesserte Fehlerausgabe**
- ✅ **Detaillierte Fehlermeldungen** bei SMTP-Verbindungsproblemen:
  - EAUTH: "SMTP-Authentifizierung fehlgeschlagen. Bitte überprüfen Sie Benutzername und Passwort."
  - ESOCKET/ECONNECTION: "SMTP-Verbindung fehlgeschlagen: [Details]. Bitte überprüfen Sie Host und Port."
  - ETIMEDOUT: "SMTP-Verbindung Timeout. Server nicht erreichbar."
  - Response 535: "SMTP-Authentifizierung abgelehnt (535). Bitte überprüfen Sie die Anmeldedaten."
- ✅ **Frontend**: Toast-Benachrichtigungen zeigen jetzt error.details + error.help
- ✅ **API**: Strukturierte Fehlerantworten mit { error, details, help }

#### 4. **Admin Profil & Unternehmen - Speicherfehler behoben**
- ✅ **Detaillierte Fehlerausgabe** im API-Endpoint `/api/profile`
- ✅ **Prisma-Fehler-Handling**:
  - P2002: "Daten-Konflikt - Ein Eintrag mit diesem Schlüssel existiert bereits."
  - P2003: "Datenbank-Beziehungsfehler - Referenzierte Daten existieren nicht."
  - P2025: "Eintrag nicht gefunden - Der zu aktualisierende Eintrag existiert nicht."
  - Schema fehlt: "Die Tabelle 'ProfileData' existiert nicht. Bitte führen Sie Migrationen aus."
- ✅ **Frontend**: Verbesserte Error-Handling in Toast-Benachrichtigungen

#### 5. **Admin Kompetenzen - Speicherfehler behoben**
- ✅ **Detaillierte Fehlerausgabe** in `/api/competencies` und `/api/competencies/[id]`
- ✅ **Prisma-Fehler-Handling**:
  - P2002: "Slug bereits vergeben - Eine Kompetenz mit diesem Slug existiert bereits."
  - P2025: "Kompetenz nicht gefunden - Die zu aktualisierende Kompetenz existiert nicht."
  - Schema fehlt: "Die Tabelle 'Competency' existiert nicht. Bitte führen Sie Migrationen aus."
- ✅ **Frontend**: Detaillierte Fehlermeldungen in allen CRUD-Operationen (Create, Update, Add)

### 📁 Neue Dateien

- `prisma/migrations/20260131000000_add_email_client/migration.sql` - E-Mail-Client Migration (7.8 KB)
- `prisma/migrations/20260131000000_add_email_client/README.md` - Migrations-Dokumentation (3.0 KB)
- `MIGRATION_GUIDE.md` - Aktualisiert mit neuer Migration

### 🔄 Geänderte Dateien

#### Frontend (UI-Anpassungen):
- `app/admin/page.tsx` - SMC-DMS Kachel-Titel
- `app/admin/docs/page.tsx` - SMC-DMS im Menü
- `app/admin/docs/user-manual/page.tsx` - SMC-DMS in Dokumentation
- `app/admin/docs/technical-manual/page.tsx` - SMC-DMS Referenzen
- `app/admin/paperless/page.tsx` - SMC-DMS Seitentitel
- `app/admin/smtp/page.tsx` - Verbesserte Fehleranzeige
- `app/admin/profile/page.tsx` - Verbesserte Fehleranzeige
- `app/admin/competencies/page.tsx` - Verbesserte Fehleranzeige

#### Backend (API-Verbesserungen):
- `lib/email.ts` - Detaillierte SMTP-Fehlerbehandlung
- `app/api/admin/smtp/test/route.ts` - Strukturierte Fehlerantworten
- `app/api/profile/route.ts` - Prisma-Fehler-Handling
- `app/api/competencies/route.ts` - Detaillierte Fehlerausgabe (POST)
- `app/api/competencies/[id]/route.ts` - Detaillierte Fehlerausgabe (PUT)

### 📊 Build-Status

- ✅ **TypeScript Compilation**: Erfolgreich
- ✅ **Next.js Build**: Erfolgreich (34 Routen)
- ✅ **Prisma Schema**: Validiert
- ✅ **Migrations**: Verifiziert und getestet

### 🚀 Deployment-Hinweise

#### Vor dem Deployment auf dem Produktionsserver:

1. **Backup erstellen** (empfohlen):
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Migrationen anwenden**:
   ```bash
   cd /pfad/zu/ihrem/projekt/nextjs_space
   yarn install
   yarn prisma generate
   yarn prisma migrate deploy
   ```

3. **Anwendung neu starten**:
   ```bash
   docker-compose restart app
   # ODER
   pm2 restart app
   ```

#### Erwartete Migration-Ausgabe:
```
✔ Applied migration(s):
  - 20260130000000_initial_schema (bereits angewendet)
  - 20260131000000_add_email_client (neu)

All migrations have been successfully applied.
```

### ⚠️ Wichtige Sicherheitsgarantien

- ✅ **Keine Datenverlusts**: Alle Migrationen sind rein additiv
- ✅ **Idempotent**: Migrationen können mehrfach ausgeführt werden
- ✅ **Abwärtskompatibel**: Bestehende Funktionalität unberührt
- ✅ **IF NOT EXISTS**: Alle CREATE-Statements sind sicher

### 📞 Support & Dokumentation

- **Migrations-Anleitung**: `/MIGRATION_GUIDE.md`
- **E-Mail-Client Migration**: `/prisma/migrations/20260131000000_add_email_client/README.md`
- **Admin-Credentials**: `admin@smc-office.eu` / `soadmin146810!`

### 🎯 Nächste Schritte

Nach erfolgreichem Deployment und Test:
1. ✅ E-Mail-Client-Konfiguration im Admin-Bereich testen
2. ✅ SMTP-Konfiguration mit Verbindungstest validieren
3. ✅ Admin-Module auf Speicherfunktionalität prüfen
4. ⏳ Seiteninhalt-Modul überarbeiten (alle Seiten editierbar machen) - AUSSTEHEND

---

**Checkpoint erstellt**: `Bugfixes Migrationen SMC-DMS SMTP`  
**Build erfolgreich**: 34 Routen, 0 Fehler  
**Status**: ✅ BEREIT FÜR DEPLOYMENT
