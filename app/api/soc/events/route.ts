import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - Events abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const serviceId = searchParams.get("serviceId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    if (type) where.type = type;
    if (serviceId) where.serviceId = serviceId;
    if (unreadOnly) where.isRead = false;

    const events = await prisma.socEvent.findMany({
      where,
      include: {
        service: {
          select: { name: true, slug: true, icon: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Ungelesene Zählen
    const unreadCount = await prisma.socEvent.count({
      where: { isRead: false },
    });

    return NextResponse.json({ events, unreadCount });
  } catch (error) {
    console.error("Error fetching SOC events:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Events" },
      { status: 500 }
    );
  }
}

// PUT - Events als gelesen markieren
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { eventIds, markAllRead } = body;

    if (markAllRead) {
      await prisma.socEvent.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
    } else if (eventIds && eventIds.length > 0) {
      await prisma.socEvent.updateMany({
        where: { id: { in: eventIds } },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating SOC events:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Events" },
      { status: 500 }
    );
  }
}
