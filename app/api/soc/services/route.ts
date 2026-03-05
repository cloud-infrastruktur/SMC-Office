import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager, isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - Alle Services abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const services = await prisma.socService.findMany({
      where: { isVisible: true },
      include: {
        events: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        metrics: {
          orderBy: { timestamp: "desc" },
          take: 10,
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching SOC services:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Services" },
      { status: 500 }
    );
  }
}

// POST - Neuen Service erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, icon, url, webhookId } = body;

    if (!name || !icon) {
      return NextResponse.json(
        { error: "Name und Icon sind erforderlich" },
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

    const maxSort = await prisma.socService.aggregate({
      _max: { sortOrder: true },
    });

    const service = await prisma.socService.create({
      data: {
        name,
        slug: `${slug}-${Date.now()}`,
        description,
        icon,
        url,
        webhookId,
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error("Error creating SOC service:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Services" },
      { status: 500 }
    );
  }
}
