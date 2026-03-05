import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PUT - Ordner umbenennen
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
    const { name, parentId, sortOrder } = body;

    const folder = await prisma.fileFolder.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(sortOrder !== undefined && { sortOrder }),
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

// DELETE - Ordner löschen
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
