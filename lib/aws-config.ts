/**
 * AWS/MinIO S3 Configuration
 * ==========================
 * Zentrale Konfiguration für S3-kompatibles Object Storage.
 * Unterstützt sowohl AWS S3 als auch MinIO.
 */

import { S3Client } from "@aws-sdk/client-s3";

// Singleton für S3 Client
let s3ClientInstance: S3Client | null = null;

/**
 * Bucket-Konfiguration abrufen
 */
export function getBucketConfig() {
  return {
    bucketName: process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || "smc-storage",
    folderPrefix: process.env.S3_FOLDER_PREFIX || process.env.AWS_FOLDER_PREFIX || "",
    region: process.env.S3_REGION || process.env.AWS_REGION || "us-east-1",
  };
}

/**
 * Prüft ob MinIO oder AWS S3 verwendet wird
 */
export function isMinIO(): boolean {
  return !!process.env.S3_ENDPOINT;
}

/**
 * S3 Client erstellen (Singleton)
 * Unterstützt MinIO über S3_ENDPOINT Environment Variable
 */
export function createS3Client(): S3Client {
  if (s3ClientInstance) {
    return s3ClientInstance;
  }

  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || "";
  const region = process.env.S3_REGION || process.env.AWS_REGION || "us-east-1";

  // MinIO-Konfiguration (wenn S3_ENDPOINT gesetzt)
  if (endpoint) {
    console.log(`[S3] Using MinIO endpoint: ${endpoint}`);
    s3ClientInstance = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Erforderlich für MinIO
    });
  } else {
    // Standard AWS S3
    console.log(`[S3] Using AWS S3 in region: ${region}`);
    s3ClientInstance = new S3Client({
      region,
      credentials: accessKeyId && secretAccessKey ? {
        accessKeyId,
        secretAccessKey,
      } : undefined,
    });
  }

  return s3ClientInstance;
}

/**
 * Öffentliche URL für ein Objekt generieren
 */
export function getPublicUrl(key: string): string {
  const { bucketName, region } = getBucketConfig();
  const endpoint = process.env.S3_ENDPOINT;

  if (endpoint) {
    // MinIO: Verwende das konfigurierte Endpoint
    // Entferne trailing slash falls vorhanden
    const baseUrl = endpoint.replace(/\/$/, "");
    return `${baseUrl}/${bucketName}/${key}`;
  }

  // AWS S3
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}
