// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";
import { uploadFile, deleteFile, getFileUrl } from "@/lib/storage";
import type { ManagedFile, FileFolder, FileAttachment } from "@prisma/client";

// Typ für Datei mit Relations
type ManagedFileWithRelations = ManagedFile & {
  folder: FileFolder | null;
  attachments: FileAttachment[];
};

export const dynamic = "force-dynamic";

// GET - Alle Dateien abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");

    const files = await prisma.managedFile.findMany({
      where: folderId ? { folderId } : { folderId: null },
      include: {
        folder: true,
        attachments: true,
      },
      orderBy: { uploadedAt: "desc" },
    });

    // URLs für jede Datei generieren
    const filesWithUrls = await Promise.all(
      files.map(async (file: ManagedFileWithRelations) => ({
        ...file,
        url: await getFileUrl(file.cloudStoragePath, file.isPublic),
      }))
    );

    return NextResponse.json(filesWithUrls);
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Dateien" },
      { status: 500 }
    );
  }
}

// POST - Datei hochladen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const displayName = formData.get("displayName") as string;
    const description = formData.get("description") as string;
    const folderId = formData.get("folderId") as string;
    const isPublic = formData.get("isPublic") === "true";

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    // 50MB file size limit
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Datei zu groß. Maximale Größe: 50 MB. Ihre Datei: ${(file.size / (1024 * 1024)).toFixed(1)} MB` },
        { status: 400 }
      );
    }

    // Datei in Storage hochladen
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const cloudStoragePath = await uploadFile(buffer, file.name, file.type, isPublic);

    // Datensatz erstellen
    const managedFile = await prisma.managedFile.create({
      data: {
        fileName: file.name,
        displayName: displayName || file.name,
        description,
        mimeType: file.type,
        fileSize: file.size,
        cloudStoragePath,
        folderId: folderId || null,
        isPublic,
        uploadedBy: (session.user as { id?: string })?.id,
      },
    });

    return NextResponse.json(managedFile, { status: 201 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Fehler beim Hochladen der Datei" },
      { status: 500 }
    );
  }
}
