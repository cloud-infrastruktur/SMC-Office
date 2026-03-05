/**
 * Storage Abstraction Layer
 * =========================
 * Zentrale Abstraktion für Object Storage (S3/MinIO).
 * STATELESS: Keine lokale Dateispeicherung mehr.
 * 
 * Migration: Alle lokalen Dateien müssen nach S3/MinIO migriert werden.
 */

import {
  uploadFile as s3Upload,
  getFileUrl as s3GetUrl,
  deleteFile as s3Delete,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  fileExists,
  getFileMetadata,
} from "./s3";

/**
 * Datei hochladen (Server-side)
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  isPublic: boolean = false
): Promise<string> {
  return s3Upload(buffer, fileName, isPublic, contentType);
}

/**
 * Presigned Upload URL generieren (für Client-side Uploads)
 */
export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic: boolean = false
): Promise<{ uploadUrl: string; cloudStoragePath: string }> {
  return generatePresignedUploadUrl(fileName, contentType, isPublic);
}

/**
 * Datei-URL abrufen
 */
export async function getFileUrl(
  cloudStoragePath: string,
  isPublic: boolean = false
): Promise<string> {
  return s3GetUrl(cloudStoragePath, isPublic);
}

/**
 * Presigned Download URL generieren
 */
export async function getPresignedDownloadUrl(
  cloudStoragePath: string,
  fileName?: string
): Promise<string> {
  return generatePresignedDownloadUrl(cloudStoragePath, fileName);
}

/**
 * Datei löschen
 */
export async function deleteFile(cloudStoragePath: string): Promise<void> {
  return s3Delete(cloudStoragePath);
}

/**
 * Prüfen ob Datei existiert
 */
export async function checkFileExists(cloudStoragePath: string): Promise<boolean> {
  return fileExists(cloudStoragePath);
}

/**
 * Datei-Metadaten abrufen
 */
export async function getFileMeta(cloudStoragePath: string) {
  return getFileMetadata(cloudStoragePath);
}

/**
 * Legacy-Kompatibilität: Prüft ob ein Pfad absolut ist
 * (Entwicklungsumgebungs-Altlast)
 */
export function isAbsolutePath(storagePath: string | null | undefined): boolean {
  if (!storagePath) return false;
  return storagePath.startsWith("/");
}

/**
 * Legacy-Kompatibilität: Pfad normalisieren
 * Wandelt alte lokale Pfade in S3-Keys um
 */
export function normalizeStoragePath(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  
  // Entferne führende Slashes
  let normalized = storagePath.replace(/^\/+/, "");
  
  // Entferne 'uploads/' Prefix falls vorhanden (alte lokale Pfade)
  if (normalized.startsWith("uploads/")) {
    normalized = normalized.substring(8);
  }
  
  // Entferne absolute Pfade (extrahiere nur Dateinamen)
  if (normalized.includes("/")) {
    const parts = normalized.split("/");
    normalized = parts[parts.length - 1];
  }
  
  return normalized;
}

/**
 * Legacy-Kompatibilität: Prüfen ob lokal gespeichert
 * @deprecated Wird nicht mehr verwendet - alle Dateien in S3
 */
export function isLocalStorage(): boolean {
  // Immer false - wir verwenden nur noch S3/MinIO
  return false;
}

/**
 * Legacy-Stub: getFileBuffer
 * @deprecated Verwende stattdessen Presigned URLs
 */
export async function getFileBuffer(fileKey: string): Promise<Buffer | null> {
  console.warn("[Storage] getFileBuffer is deprecated. Use presigned URLs instead.");
  return null;
}

/**
 * Legacy-Stub: getFileStream
 * @deprecated Verwende stattdessen Presigned URLs
 */
export function getFileStream(fileKey: string): null {
  console.warn("[Storage] getFileStream is deprecated. Use presigned URLs instead.");
  return null;
}
