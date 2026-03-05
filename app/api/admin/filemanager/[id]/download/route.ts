import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";
import { getPresignedDownloadUrl, getFileUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

// GET - Presigned Download URL generieren
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;

    const file = await prisma.managedFile.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json(
        { error: "Datei nicht gefunden" },
        { status: 404 }
      );
    }

    // Presigned URL für Download generieren
    let url: string;
    
    if (file.isPublic) {
      // Für öffentliche Dateien direkte URL
      url = await getFileUrl(file.cloudStoragePath, true);
    } else {
      // Für private Dateien presigned URL
      url = await getPresignedDownloadUrl(
        file.cloudStoragePath,
        file.displayName || file.fileName
      );
    }

    return NextResponse.json({ 
      url,
      fileName: file.displayName || file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize
    });
  } catch (error) {
    console.error("Error generating download URL:", error);
    return NextResponse.json(
      { error: "Fehler beim Generieren der Download-URL" },
      { status: 500 }
    );
  }
}
