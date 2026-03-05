import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getFileUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Ordner, die für Downloads verfügbar sind
const DOWNLOAD_FOLDER_SLUGS = ['profile', 'references', 'trainings', 'certificates'];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ordner für Downloads abrufen
    const downloadFolders = await prisma.fileFolder.findMany({
      where: {
        slug: { in: DOWNLOAD_FOLDER_SLUGS }
      },
      orderBy: { sortOrder: 'asc' }
    });

    const folderIds = downloadFolders.map(f => f.id);

    // Dateien aus den Download-Ordnern abrufen
    const files = await prisma.managedFile.findMany({
      where: {
        folderId: { in: folderIds }
      },
      include: {
        folder: true
      },
      orderBy: { uploadedAt: "desc" },
    });

    // Dateien nach Kategorien gruppieren
    const categorizedFiles = downloadFolders.map(folder => ({
      category: folder.name,
      slug: folder.slug,
      files: files
        .filter(f => f.folderId === folder.id)
        .map(f => ({
          id: f.id,
          title: f.displayName || f.fileName,
          description: f.description,
          fileName: f.fileName,
          fileSize: f.fileSize,
          mimeType: f.mimeType,
          uploadedAt: f.uploadedAt,
          category: folder.slug.toUpperCase()
        }))
    })).filter(cat => cat.files.length > 0);

    // Flache Liste für Rückwärtskompatibilität
    const flatFiles = files.map(f => ({
      id: f.id,
      title: f.displayName || f.fileName,
      description: f.description,
      fileName: f.fileName,
      fileSize: f.fileSize,
      mimeType: f.mimeType,
      uploadedAt: f.uploadedAt,
      category: f.folder?.slug?.toUpperCase() || 'MISC'
    }));

    return NextResponse.json({ 
      files: flatFiles,
      categories: categorizedFiles,
      folders: downloadFolders
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Error fetching files" },
      { status: 500 }
    );
  }
}
