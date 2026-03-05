import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: Alle Notizen des Benutzers abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const crmContactId = searchParams.get("crmContactId");
    const crmDealId = searchParams.get("crmDealId");
    const crmProjectId = searchParams.get("crmProjectId");
    const search = searchParams.get("search");
    const showArchived = searchParams.get("showArchived") === "true";
    const limit = parseInt(searchParams.get("limit") || "100");

    const where: any = {
      userId,
      isArchived: showArchived ? undefined : false,
    };

    if (category) where.category = category;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (crmContactId) where.crmContactId = crmContactId;
    if (crmDealId) where.crmDealId = crmDealId;
    if (crmProjectId) where.crmProjectId = crmProjectId;
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    const notes = await prisma.note.findMany({
      where,
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
      orderBy: [
        { isPinned: 'desc' },
        { priority: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: limit,
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Fehler beim Abrufen der Notizen:", error);
    return NextResponse.json(
      { error: "Fehler beim Abrufen der Notizen" },
      { status: 500 }
    );
  }
}

// POST: Neue Notiz erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();

    const {
      title,
      content,
      category,
      status,
      priority,
      dueDate,
      tags,
      isPinned,
      crmContactId,
      crmDealId,
      crmProjectId,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Titel ist erforderlich" },
        { status: 400 }
      );
    }

    const note = await prisma.note.create({
      data: {
        userId,
        title,
        content: content || null,
        category: category || 'PERSONAL',
        status: status || 'OPEN',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        tags: tags || [],
        isPinned: isPinned || false,
        crmContactId: crmContactId || null,
        crmDealId: crmDealId || null,
        crmProjectId: crmProjectId || null,
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

    // Wenn mit Projekt verknüpft, Aktivität loggen
    if (crmProjectId) {
      await prisma.crmProjectActivity.create({
        data: {
          projectId: crmProjectId,
          userId,
          type: 'NOTE_ADDED',
          title: 'Notiz hinzugefügt',
          description: title,
        },
      });
    }

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Fehler beim Erstellen der Notiz:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Notiz" },
      { status: 500 }
    );
  }
}
