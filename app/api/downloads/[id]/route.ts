import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getPresignedDownloadUrl, getFileUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Zuerst in ManagedFile suchen (vereinheitlichtes System)
    const managedFile = await prisma.managedFile.findUnique({
      where: { id },
    });

    if (managedFile) {
      // Presigned Download URL generieren
      let url: string;
      
      if (managedFile.isPublic) {
        url = await getFileUrl(managedFile.cloudStoragePath, true);
      } else {
        url = await getPresignedDownloadUrl(
          managedFile.cloudStoragePath, 
          managedFile.displayName || managedFile.fileName
        );
      }
      
      return NextResponse.json({ 
        url,
        fileName: managedFile.displayName || managedFile.fileName,
        mimeType: managedFile.mimeType
      });
    }

    // Fallback: In DownloadFile suchen (Legacy-Support)
    const downloadFile = await prisma.downloadFile.findUnique({
      where: { id },
    });

    if (downloadFile) {
      const url = await getPresignedDownloadUrl(
        downloadFile.cloudStoragePath, 
        downloadFile.fileName
      );
      
      return NextResponse.json({ url, fileName: downloadFile.fileName });
    }

    return NextResponse.json({ error: "File not found" }, { status: 404 });
  } catch (error) {
    console.error("Error getting file:", error);
    return NextResponse.json(
      { error: "Error getting file" },
      { status: 500 }
    );
  }
}
