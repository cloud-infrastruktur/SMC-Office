import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: Einzelne Notiz abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const note = await prisma.note.findFirst({
      where: {
        id: params.id,
        userId,
      },
      include: {
        crmContact: true,
        crmDeal: true,
        crmProject: {
          include: {
            contact: true,
            manager: true,
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json(
        { error: "Notiz nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error("Fehler beim Abrufen der Notiz:", error);
    return NextResponse.json(
      { error: "Fehler beim Abrufen der Notiz" },
      { status: 500 }
    );
  }
}

// PUT: Notiz aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();

    // Prüfen ob Notiz existiert und dem Benutzer gehört
    const existingNote = await prisma.note.findFirst({
      where: {
        id: params.id,
        userId,
      },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: "Notiz nicht gefunden" },
        { status: 404 }
      );
    }

    const note = await prisma.note.update({
      where: { id: params.id },
      data: {
        title: body.title,
        content: body.content,
        category: body.category,
        status: body.status,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        tags: body.tags || [],
        isPinned: body.isPinned ?? existingNote.isPinned,
        isArchived: body.isArchived ?? existingNote.isArchived,
        crmContactId: body.crmContactId || null,
        crmDealId: body.crmDealId || null,
        crmProjectId: body.crmProjectId || null,
      },
      include: {
        crmContact: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
        crmDeal: {
          select: { id: true, title: true, phase: true },
        },
        crmProject: {
          select: { id: true, projectNumber: true, title: true, status: true },
        },
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error("Fehler beim Aktualisieren der Notiz:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Notiz" },
      { status: 500 }
    );
  }
}

// DELETE: Notiz löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Prüfen ob Notiz existiert und dem Benutzer gehört
    const existingNote = await prisma.note.findFirst({
      where: {
        id: params.id,
        userId,
      },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: "Notiz nicht gefunden" },
        { status: 404 }
      );
    }

    await prisma.note.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Löschen der Notiz:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen der Notiz" },
      { status: 500 }
    );
  }
}
