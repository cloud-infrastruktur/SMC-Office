import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - Alle Ordner abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const folders = await prisma.fileFolder.findMany({
      include: {
        parent: true,
        children: true,
        _count: {
          select: { files: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(folders);
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Ordner" },
      { status: 500 }
    );
  }
}

// POST - Neuen Ordner erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { name, parentId } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name ist erforderlich" },
        { status: 400 }
      );
    }

    // Slug generieren
    const slug = name
      .toLowerCase()
      .replace(/[äöü]/g, (char: string) => ({ ä: "ae", ö: "oe", ü: "ue" }[char] || char))
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Maximale sortOrder ermitteln
    const maxSort = await prisma.fileFolder.aggregate({
      where: { parentId: parentId || null },
      _max: { sortOrder: true },
    });

    const folder = await prisma.fileFolder.create({
      data: {
        name,
        slug: `${slug}-${Date.now()}`,
        parentId: parentId || null,
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Ordners" },
      { status: 500 }
    );
  }
}
