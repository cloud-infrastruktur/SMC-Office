import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - Einzelnen Deal abrufen
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

    const deal = await prisma.crmDeal.findUnique({
      where: { id },
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        sourceEmail: {
          select: { id: true, subject: true, fromAddress: true, fromName: true, receivedAt: true, textBody: true },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            createdBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!deal) {
      return NextResponse.json({ error: "Deal nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(deal);
  } catch (error) {
    console.error("Error fetching deal:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Deals" },
      { status: 500 }
    );
  }
}

// PUT - Deal aktualisieren (inkl. Phasenwechsel)
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

    // Alten Deal holen für Phasenwechsel-Log
    const oldDeal = await prisma.crmDeal.findUnique({
      where: { id },
      select: { phase: true, title: true },
    });

    if (!oldDeal) {
      return NextResponse.json({ error: "Deal nicht gefunden" }, { status: 404 });
    }

    const updateData: any = { ...body, updatedAt: new Date() };
    
    if (body.value !== undefined) {
      updateData.value = body.value ? parseFloat(body.value) : null;
    }
    
    if (body.probability !== undefined) {
      updateData.probability = body.probability ? parseInt(String(body.probability), 10) : 50;
    }
    
    if (body.expectedClose !== undefined) {
      updateData.expectedClose = body.expectedClose ? new Date(body.expectedClose) : null;
    }
    
    if (body.actualClose !== undefined) {
      updateData.actualClose = body.actualClose ? new Date(body.actualClose) : null;
    }

    const deal = await prisma.crmDeal.update({
      where: { id },
      data: updateData,
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    // Phasenwechsel-Aktivität erstellen
    if (body.phase && body.phase !== oldDeal.phase) {
      await prisma.crmActivity.create({
        data: {
          type: "PHASE_CHANGE",
          title: "Phase geändert",
          description: `Phase von ${oldDeal.phase} zu ${body.phase} geändert`,
          dealId: id,
          contactId: deal.contactId,
          createdById: (session.user as { id?: string })?.id,
          metadata: {
            fromPhase: oldDeal.phase,
            toPhase: body.phase,
          },
        },
      });
    }

    return NextResponse.json(deal);
  } catch (error) {
    console.error("Error updating deal:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Deals" },
      { status: 500 }
    );
  }
}

// DELETE - Deal löschen
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

    // Aktivitäten werden durch onDelete: Cascade automatisch gelöscht
    await prisma.crmDeal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting deal:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Deals" },
      { status: 500 }
    );
  }
}
