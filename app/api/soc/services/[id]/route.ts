import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - Einzelnen Service abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;

    const service = await prisma.socService.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        metrics: {
          orderBy: { timestamp: "desc" },
          take: 100,
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error fetching SOC service:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Services" },
      { status: 500 }
    );
  }
}

// PUT - Service aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, icon, url, webhookId, status, statusText, isVisible, sortOrder } = body;

    const service = await prisma.socService.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(icon && { icon }),
        ...(url !== undefined && { url }),
        ...(webhookId !== undefined && { webhookId }),
        ...(status && { status }),
        ...(statusText !== undefined && { statusText }),
        ...(isVisible !== undefined && { isVisible }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error updating SOC service:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Services" },
      { status: 500 }
    );
  }
}

// DELETE - Service löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.socService.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting SOC service:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Services" },
      { status: 500 }
    );
  }
}
