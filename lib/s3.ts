/**
 * S3/MinIO Object Storage Service
 * ================================
 * Zentraler Service für alle Datei-Operationen.
 * Unterstützt Presigned-URLs für sichere Uploads/Downloads.
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client, getBucketConfig, getPublicUrl, isMinIO } from "./aws-config";

const PRESIGNED_URL_EXPIRY = 3600; // 1 Stunde
const UPLOAD_PRESIGNED_EXPIRY = 900; // 15 Minuten für Uploads

/**
 * Datei direkt hochladen (Server-side)
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  isPublic: boolean = false,
  contentType?: string
): Promise<string> {
  const s3Client = createS3Client();
  const { bucketName, folderPrefix } = getBucketConfig();
  
  const prefix = isPublic ? `${folderPrefix}public/` : `${folderPrefix}private/`;
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${prefix}${Date.now()}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType || getMimeType(fileName),
    ContentDisposition: isPublic ? "attachment" : undefined,
  });

  await s3Client.send(command);
  console.log(`[S3] File uploaded: ${key}`);
  return key;
}

/**
 * Presigned Upload URL generieren (Client-side Upload)
 * Der Client kann direkt zu S3/MinIO hochladen ohne Server-Proxy
 */
export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic: boolean = false
): Promise<{ uploadUrl: string; cloudStoragePath: string }> {
  const s3Client = createS3Client();
  const { bucketName, folderPrefix } = getBucketConfig();
  
  const prefix = isPublic ? `${folderPrefix}public/` : `${folderPrefix}private/`;
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const cloudStoragePath = `${prefix}${Date.now()}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloudStoragePath,
    ContentType: contentType,
    ContentDisposition: isPublic ? "attachment" : undefined,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: UPLOAD_PRESIGNED_EXPIRY,
  });

  console.log(`[S3] Presigned upload URL generated for: ${cloudStoragePath}`);
  return { uploadUrl, cloudStoragePath };
}

/**
 * Multipart Upload initiieren (für große Dateien >100MB)
 */
export async function initiateMultipartUpload(
  fileName: string,
  isPublic: boolean = false
): Promise<{ uploadId: string; cloudStoragePath: string }> {
  const s3Client = createS3Client();
  const { bucketName, folderPrefix } = getBucketConfig();
  
  const prefix = isPublic ? `${folderPrefix}public/` : `${folderPrefix}private/`;
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const cloudStoragePath = `${prefix}${Date.now()}-${sanitizedFileName}`;

  const command = new CreateMultipartUploadCommand({
    Bucket: bucketName,
    Key: cloudStoragePath,
    ContentDisposition: isPublic ? "attachment" : undefined,
  });

  const response = await s3Client.send(command);
  
  if (!response.UploadId) {
    throw new Error("Failed to initiate multipart upload");
  }

  console.log(`[S3] Multipart upload initiated: ${cloudStoragePath}`);
  return { uploadId: response.UploadId, cloudStoragePath };
}

/**
 * Presigned URL für einen Multipart-Teil generieren
 */
export async function getPresignedUrlForPart(
  cloudStoragePath: string,
  uploadId: string,
  partNumber: number
): Promise<string> {
  const s3Client = createS3Client();
  const { bucketName } = getBucketConfig();

  const command = new UploadPartCommand({
    Bucket: bucketName,
    Key: cloudStoragePath,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return await getSignedUrl(s3Client, command, {
    expiresIn: UPLOAD_PRESIGNED_EXPIRY,
  });
}

/**
 * Multipart Upload abschließen
 */
export async function completeMultipartUpload(
  cloudStoragePath: string,
  uploadId: string,
  parts: Array<{ ETag: string; PartNumber: number }>
): Promise<void> {
  const s3Client = createS3Client();
  const { bucketName } = getBucketConfig();

  const command = new CompleteMultipartUploadCommand({
    Bucket: bucketName,
    Key: cloudStoragePath,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });

  await s3Client.send(command);
  console.log(`[S3] Multipart upload completed: ${cloudStoragePath}`);
}

/**
 * Multipart Upload abbrechen
 */
export async function abortMultipartUpload(
  cloudStoragePath: string,
  uploadId: string
): Promise<void> {
  const s3Client = createS3Client();
  const { bucketName } = getBucketConfig();

  const command = new AbortMultipartUploadCommand({
    Bucket: bucketName,
    Key: cloudStoragePath,
    UploadId: uploadId,
  });

  await s3Client.send(command);
  console.log(`[S3] Multipart upload aborted: ${cloudStoragePath}`);
}

/**
 * Datei-URL abrufen (Presigned oder Public)
 */
export async function getFileUrl(
  cloudStoragePath: string,
  isPublic: boolean = false
): Promise<string> {
  if (isPublic) {
    return getPublicUrl(cloudStoragePath);
  }

  const s3Client = createS3Client();
  const { bucketName } = getBucketConfig();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloudStoragePath,
    ResponseContentDisposition: "attachment",
  });

  return await getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY,
  });
}

/**
 * Presigned Download URL generieren
 */
export async function generatePresignedDownloadUrl(
  cloudStoragePath: string,
  fileName?: string
): Promise<string> {
  const s3Client = createS3Client();
  const { bucketName } = getBucketConfig();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloudStoragePath,
    ResponseContentDisposition: fileName 
      ? `attachment; filename="${fileName}"` 
      : "attachment",
  });

  return await getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY,
  });
}

/**
 * Datei löschen
 */
export async function deleteFile(cloudStoragePath: string): Promise<void> {
  const s3Client = createS3Client();
  const { bucketName } = getBucketConfig();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: cloudStoragePath,
  });

  await s3Client.send(command);
  console.log(`[S3] File deleted: ${cloudStoragePath}`);
}

/**
 * Prüfen ob Datei existiert
 */
export async function fileExists(cloudStoragePath: string): Promise<boolean> {
  const s3Client = createS3Client();
  const { bucketName } = getBucketConfig();

  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: cloudStoragePath,
    });
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Datei-Metadaten abrufen
 */
export async function getFileMetadata(cloudStoragePath: string): Promise<{
  size: number;
  contentType?: string;
  lastModified?: Date;
} | null> {
  const s3Client = createS3Client();
  const { bucketName } = getBucketConfig();

  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: cloudStoragePath,
    });
    const response = await s3Client.send(command);
    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType,
      lastModified: response.LastModified,
    };
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * MIME-Type aus Dateiendung ermitteln
 */
function getMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",
    xml: "application/xml",
    zip: "application/zip",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
    wav: "audio/wav",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}
