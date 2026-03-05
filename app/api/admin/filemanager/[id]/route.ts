import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";
import { deleteFile, getFileUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

// GET - Einzelne Datei abrufen
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
      include: {
        folder: true,
        attachments: true,
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: "Datei nicht gefunden" },
        { status: 404 }
      );
    }

    const url = await getFileUrl(file.cloudStoragePath, file.isPublic);

    return NextResponse.json({ ...file, url });
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Datei" },
      { status: 500 }
    );
  }
}

// PUT - Datei aktualisieren
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
    const { displayName, description, folderId } = body;

    const file = await prisma.managedFile.update({
      where: { id },
      data: {
        ...(displayName && { displayName }),
        ...(description !== undefined && { description }),
        ...(folderId !== undefined && { folderId: folderId || null }),
      },
    });

    return NextResponse.json(file);
  } catch (error) {
    console.error("Error updating file:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Datei" },
      { status: 500 }
    );
  }
}

// DELETE - Datei löschen
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

    const file = await prisma.managedFile.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json(
        { error: "Datei nicht gefunden" },
        { status: 404 }
      );
    }

    // Datei aus Storage löschen
    await deleteFile(file.cloudStoragePath);

    // Datensatz löschen
    await prisma.managedFile.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen der Datei" },
      { status: 500 }
    );
  }
}
