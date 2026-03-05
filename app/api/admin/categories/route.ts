import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - Alle Kategorien abrufen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "training", "project", "reference"

    const where = type ? { type } : {};
    const categories = await prisma.category.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Kategorien" },
      { status: 500 }
    );
  }
}

// POST - Neue Kategorie erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, description, icon } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name und Typ sind erforderlich" },
        { status: 400 }
      );
    }

    // Slug aus Name generieren
    const slug = name
      .toLowerCase()
      .replace(/[äöü]/g, (char: string) => ({ ä: "ae", ö: "oe", ü: "ue" }[char] || char))
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Maximale sortOrder ermitteln
    const maxSort = await prisma.category.aggregate({
      where: { type },
      _max: { sortOrder: true },
    });

    const category = await prisma.category.create({
      data: {
        name,
        slug: `${slug}-${Date.now()}`,
        type,
        description,
        icon: icon || "Folder",
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Kategorie" },
      { status: 500 }
    );
  }
}
