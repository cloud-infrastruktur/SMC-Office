import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { PermissionArea } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = ((session.user as any).role || 'USER').toUpperCase();

    // Admin und Manager sehen alles
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(userRole);

    // Berechtigungen des Users abrufen
    let allowedPermissionAreas: PermissionArea[] = [];
    
    if (isAdminOrManager) {
      // Admins/Manager sehen alle Bereiche
      allowedPermissionAreas = Object.values(PermissionArea);
    } else {
      // Normale User: nur Ordner mit expliziter Berechtigung
      const userPermissions = await prisma.userPermission.findMany({
        where: { userId },
        select: { area: true }
      });
      
      allowedPermissionAreas = userPermissions.map(p => p.area);
    }

    // Download-Ordner abrufen (nur mit isDownloadFolder=true und passender Berechtigung)
    const downloadFoldersQuery: any = {
      isDownloadFolder: true
    };

    // Nicht-Admins filtern nach Berechtigungen
    if (!isAdminOrManager) {
      if (allowedPermissionAreas.length === 0) {
        return NextResponse.json({ 
          files: [],
          categories: [],
          folders: [],
          message: "Keine Download-Berechtigungen vorhanden. Bitte kontaktieren Sie den Administrator."
        });
      }
      
      // Filtern: permissionArea muss in erlaubten Bereichen sein ODER null (= FILES)
      downloadFoldersQuery.OR = [
        { permissionArea: { in: allowedPermissionAreas } },
        // Wenn FILES-Berechtigung, auch Ordner ohne permissionArea (null) anzeigen
        ...(allowedPermissionAreas.includes('FILES' as PermissionArea) ? [{ permissionArea: null }] : [])
      ];
    }

    const downloadFolders = await prisma.fileFolder.findMany({
      where: downloadFoldersQuery,
      orderBy: { sortOrder: 'asc' }
    });

    // Wenn keine Download-Ordner gefunden (auch für Admins)
    if (downloadFolders.length === 0) {
      return NextResponse.json({ 
        files: [],
        categories: [],
        folders: [],
        message: isAdminOrManager 
          ? "Keine Download-Ordner konfiguriert. Markieren Sie Ordner im Dateimanager als 'Download-Ordner'."
          : "Keine Download-Berechtigungen vorhanden. Bitte kontaktieren Sie den Administrator."
      });
    }

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
      permissionArea: folder.permissionArea || 'FILES',
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
