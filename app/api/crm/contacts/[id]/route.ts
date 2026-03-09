import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - Einzelnen Kontakt abrufen
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

    const contact = await prisma.crmContact.findUnique({
      where: { id },
      include: {
        client: true,
        organization: { select: { id: true, name: true, displayName: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
        deals: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Kontakt nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error("Error fetching contact:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Kontakts" },
      { status: 500 }
    );
  }
}

// PUT - Kontakt aktualisieren
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

    // E-Mail-Duplikat prüfen
    if (body.email) {
      const existing = await prisma.crmContact.findFirst({
        where: {
          email: body.email.toLowerCase(),
          NOT: { id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Ein anderer Kontakt mit dieser E-Mail existiert bereits" },
          { status: 409 }
        );
      }
    }

    // UserId-Eindeutigkeit prüfen
    if (body.userId) {
      const userLinked = await prisma.crmContact.findFirst({
        where: { userId: body.userId, NOT: { id } },
      });
      if (userLinked) {
        return NextResponse.json(
          { error: "Dieser Benutzer ist bereits mit einem anderen Kontakt verknüpft" },
          { status: 409 }
        );
      }
    }

    // Prepare update data, explicitly handle null values
    const updateData: Record<string, unknown> = {
      ...body,
      email: body.email?.toLowerCase(),
      updatedAt: new Date(),
    };
    
    // Handle explicit null for organizationId and userId
    if (body.organizationId === null) updateData.organizationId = null;
    if (body.userId === null) updateData.userId = null;

    const contact = await prisma.crmContact.update({
      where: { id },
      data: updateData,
      include: { 
        client: true,
        organization: { select: { id: true, name: true, displayName: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json(contact);
  } catch (error) {
    console.error("Error updating contact:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Kontakts" },
      { status: 500 }
    );
  }
}

// DELETE - Kontakt löschen (soft delete)
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

    await prisma.crmContact.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Kontakts" },
      { status: 500 }
    );
  }
}
