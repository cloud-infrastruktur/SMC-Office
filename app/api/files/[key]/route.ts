/**
 * File Access API
 * ===============
 * Generiert Presigned Download URLs für Dateien in S3/MinIO.
 * Der Server dient nicht mehr als Proxy für Datei-Streams.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getPresignedDownloadUrl, checkFileExists } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fileKey = decodeURIComponent(params.key);

    // Prüfen ob Datei existiert
    const exists = await checkFileExists(fileKey);
    if (!exists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Presigned Download URL generieren
    const url = await getPresignedDownloadUrl(fileKey);
    
    // Redirect zur Presigned URL
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("[File Access] Error:", error);
    return NextResponse.json(
      { error: "Failed to access file" },
      { status: 500 }
    );
  }
}
