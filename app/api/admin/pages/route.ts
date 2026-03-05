import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Seiteninhalte abrufen
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get('page');

    const where = page ? { page } : {};
    const contents = await prisma.pageContent.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(contents);
  } catch (error) {
    console.error("Error fetching page contents:", error);
    return NextResponse.json({ error: "Fehler beim Laden der Seiteninhalte" }, { status: 500 });
  }
}

// POST - Seiteninhalte erstellen/aktualisieren (Batch)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user as { role?: string }).role?.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { contents } = body; // Array von { page, section, content, sortOrder }

    if (!contents || !Array.isArray(contents)) {
      return NextResponse.json(
        { error: "Inhalte müssen als Array übergeben werden" },
        { status: 400 }
      );
    }

    // Upsert für jeden Inhalt
    const results = await Promise.all(
      contents.map(async (item: { page: string; section: string; content: string; sortOrder?: number }) => {
        return prisma.pageContent.upsert({
          where: {
            page_section: {
              page: item.page,
              section: item.section,
            },
          },
          update: {
            content: item.content,
            sortOrder: item.sortOrder || 0,
          },
          create: {
            page: item.page,
            section: item.section,
            content: item.content,
            sortOrder: item.sortOrder || 0,
          },
        });
      })
    );

    return NextResponse.json({ message: "Seiteninhalte gespeichert", count: results.length });
  } catch (error) {
    console.error("Error saving page contents:", error);
    return NextResponse.json({ error: "Fehler beim Speichern der Seiteninhalte" }, { status: 500 });
  }
}
