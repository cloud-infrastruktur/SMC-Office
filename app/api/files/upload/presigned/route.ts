/**
 * Presigned Upload URL API
 * ========================
 * Generiert Presigned URLs für Client-side Uploads direkt zu S3/MinIO.
 * Der Server dient nicht mehr als Proxy für Datei-Streams.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getPresignedUploadUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, contentType, isPublic = false } = body;

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "fileName and contentType are required" },
        { status: 400 }
      );
    }

    // Presigned URL generieren
    const { uploadUrl, cloudStoragePath } = await getPresignedUploadUrl(
      fileName,
      contentType,
      isPublic
    );

    return NextResponse.json({
      uploadUrl,
      cloudStoragePath,
      expiresIn: 900, // 15 Minuten
    });
  } catch (error) {
    console.error("[Presigned Upload] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}
