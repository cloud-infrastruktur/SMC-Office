import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";
import { PermissionArea } from "@prisma/client";

export const dynamic = "force-dynamic";

// PUT - Ordner aktualisieren (inkl. Berechtigungskonzept)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { 
      name, 
      parentId, 
      sortOrder,
      // V4.8.9: Neue Felder für Berechtigungskonzept
      isProtected,
      isDownloadFolder,
      permissionArea
    } = body;

    // Validieren von permissionArea wenn angegeben
    if (permissionArea !== undefined && permissionArea !== null) {
      const validAreas = Object.values(PermissionArea);
      if (!validAreas.includes(permissionArea)) {
        return NextResponse.json(
          { error: `Ungültige permissionArea. Erlaubt: ${validAreas.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const folder = await prisma.fileFolder.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        // V4.8.9: Berechtigungsfelder
        ...(isProtected !== undefined && { isProtected }),
        ...(isDownloadFolder !== undefined && { isDownloadFolder }),
        ...(permissionArea !== undefined && { permissionArea: permissionArea || null }),
      },
    });

    return NextResponse.json(folder);
  } catch (error) {
    console.error("Error updating folder:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Ordners" },
      { status: 500 }
    );
  }
}

// DELETE - Ordner löschen (mit isProtected-Prüfung)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;

    // V4.8.9: Prüfen ob Ordner geschützt ist
    const folder = await prisma.fileFolder.findUnique({
      where: { id },
      select: { isProtected: true, name: true }
    });

    if (!folder) {
      return NextResponse.json(
        { error: "Ordner nicht gefunden" },
        { status: 404 }
      );
    }

    if (folder.isProtected) {
      return NextResponse.json(
        { error: `Der Ordner "${folder.name}" ist geschützt und kann nicht gelöscht werden.` },
        { status: 403 }
      );
    }

    // Prüfen ob Ordner Dateien enthält
    const filesCount = await prisma.managedFile.count({
      where: { folderId: id },
    });

    if (filesCount > 0) {
      return NextResponse.json(
        { error: "Ordner enthält noch Dateien" },
        { status: 400 }
      );
    }

    // Prüfen ob Unterordner existieren
    const childrenCount = await prisma.fileFolder.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      return NextResponse.json(
        { error: "Ordner enthält noch Unterordner" },
        { status: 400 }
      );
    }

    await prisma.fileFolder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Ordners" },
      { status: 500 }
    );
  }
}
