# Migration: Add Email Client Tables

**Datum:** 2026-01-31  
**Typ:** ✅ ADDITIVE ONLY - Kein Datenverlust  
**Zweck:** Fügt E-Mail-Client-Funktionalität hinzu

## 📋 Neue Tabellen

Diese Migration fügt folgende neue Tabellen hinzu:

1. **EmailAccount** - E-Mail-Konto-Konfigurationen (IMAP/SMTP)
2. **EmailFolder** - E-Mail-Ordner (Posteingang, Gesendet, etc.)
3. **EmailMessage** - E-Mail-Nachrichten
4. **EmailAttachment** - E-Mail-Anhänge
5. **EmailDraft** - Entwürfe

## ✅ Sicherheitsgarantien

### Was diese Migration MACHT:
- ✅ Erstellt neue Tabellen (falls nicht vorhanden)
- ✅ Erstellt Indizes für Performance
- ✅ Fügt Foreign Keys für Datenintegrität hinzu
- ✅ Verwendet `IF NOT EXISTS` für Idempotenz

### Was diese Migration NICHT macht:
- ❌ KEINE `DROP TABLE` Befehle
- ❌ KEINE `DROP COLUMN` Befehle
- ❌ KEINE `DELETE` oder `TRUNCATE` Befehle
- ❌ KEINE Änderungen an bestehenden Tabellen
- ❌ KEINE Änderungen an bestehenden Daten

## 🚀 Anwendung auf dem Produktionsserver

### Voraussetzungen:
```bash
cd /pfad/zu/ihrem/projekt/nextjs_space
```

### Schritt 1: Backup erstellen (empfohlen)
```bash
pg_dump $DATABASE_URL > backup_before_email_client_$(date +%Y%m%d_%H%M%S).sql
```

### Schritt 2: Migration anwenden
```bash
yarn prisma migrate deploy
```

### Erwartete Ausgabe:
```
✔ Applied migration(s):
  - 20260130000000_initial_schema (already applied)
  - 20260131000000_add_email_client (new)

All migrations have been successfully applied.
```

## 🔍 Verifikation

Nach erfolgreicher Migration sollten folgende Tabellen existieren:

```bash
yarn prisma studio
```

Oder direkt in PostgreSQL:
```sql
\dt
-- Sollte zeigen:
-- EmailAccount
-- EmailFolder
-- EmailMessage
-- EmailAttachment
-- EmailDraft
```

## 📊 Auswirkungen

- **Bestehende Daten:** ✅ Keine Änderungen
- **Bestehende Tabellen:** ✅ Keine Änderungen
- **Bestehende Funktionalität:** ✅ Keine Beeinträchtigung
- **Neue Funktionalität:** ✅ E-Mail-Client verfügbar

## ⚠️ Rollback (falls nötig)

Falls die Migration rückgängig gemacht werden soll:

```sql
-- ACHTUNG: Löscht alle E-Mail-Client-Daten!
DROP TABLE IF EXISTS "EmailAttachment" CASCADE;
DROP TABLE IF EXISTS "EmailMessage" CASCADE;
DROP TABLE IF EXISTS "EmailFolder" CASCADE;
DROP TABLE IF EXISTS "EmailDraft" CASCADE;
DROP TABLE IF EXISTS "EmailAccount" CASCADE;
DROP TYPE IF EXISTS "EmailFolderType";
```

**Hinweis:** Rollback ist nur nötig, wenn die neuen E-Mail-Funktionen nicht gewünscht sind. Es hat keine Auswirkungen auf bestehende Funktionalität.

## 🎯 Kompatibilität

- **Prisma Version:** 6.7.0+
- **PostgreSQL Version:** 12+
- **Abwärtskompatibel:** Ja
- **Idempotent:** Ja (kann mehrfach ausgeführt werden)

## 📞 Support

Bei Problemen während der Migration:
1. Prüfen Sie die Prisma-Logs: `yarn prisma migrate status`
2. Konsultieren Sie die MIGRATION_GUIDE.md im Hauptverzeichnis
3. Bei Bedarf: Backup wiederherstellen
