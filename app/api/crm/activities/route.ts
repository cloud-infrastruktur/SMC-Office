import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - Aktivitäten abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get("dealId");
    const contactId = searchParams.get("contactId");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    
    if (dealId) where.dealId = dealId;
    if (contactId) where.contactId = contactId;
    if (type) where.type = type;

    const activities = await prisma.crmActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Aktivitäten" },
      { status: 500 }
    );
  }
}

// POST - Neue Aktivität erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      title,
      description,
      dueDate,
      dealId,
      contactId,
      metadata,
    } = body;

    if (!type || !title) {
      return NextResponse.json(
        { error: "Typ und Titel sind erforderlich" },
        { status: 400 }
      );
    }

    const activity = await prisma.crmActivity.create({
      data: {
        type,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        dealId,
        contactId,
        createdById: (session.user as { id?: string })?.id,
        metadata: metadata || {},
      },
      include: {
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error("Error creating activity:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Aktivität" },
      { status: 500 }
    );
  }
}
