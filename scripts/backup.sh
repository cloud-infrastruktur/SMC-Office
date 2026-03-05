#!/bin/sh
# SMC Database Backup Script
# ==========================
# Erstellt einen PostgreSQL Dump und lädt ihn nach MinIO hoch.
#
# Verwendung:
#   docker-compose --profile backup run backup
#   oder als Cronjob: 0 2 * * * docker-compose --profile backup run backup

set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/smc_backup_${DATE}.sql.gz"
S3_PATH="backups/database/smc_backup_${DATE}.sql.gz"

echo "[Backup] Starte PostgreSQL Backup: ${DATE}"

# Warte auf MinIO
sleep 2

# Installiere mc Client falls nicht vorhanden
if ! command -v mc &> /dev/null; then
    echo "[Backup] Installiere MinIO Client..."
    wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
    chmod +x /usr/local/bin/mc
fi

# MinIO konfigurieren
mc alias set smc http://minio:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" --quiet

# PostgreSQL Dump erstellen
echo "[Backup] Erstelle PostgreSQL Dump..."
pg_dump | gzip > "${BACKUP_FILE}"

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[Backup] Dump erstellt: ${BACKUP_SIZE}"

# Nach MinIO hochladen
echo "[Backup] Lade nach MinIO hoch: ${S3_PATH}"
mc cp "${BACKUP_FILE}" "smc/${S3_BUCKET_NAME}/${S3_PATH}"

# Aufräumen
rm -f "${BACKUP_FILE}"

# Alte Backups löschen (behalte letzte 30 Tage)
echo "[Backup] Lösche Backups älter als 30 Tage..."
mc rm --older-than 30d --force "smc/${S3_BUCKET_NAME}/backups/database/" 2>/dev/null || true

echo "[Backup] Fertig!"
echo "[Backup] Backup: s3://${S3_BUCKET_NAME}/${S3_PATH}"
