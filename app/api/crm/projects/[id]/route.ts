import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: Einzelnes Projekt abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const project = await prisma.crmProject.findUnique({
      where: { id: params.id },
      include: {
        contact: true,
        manager: {
          select: { id: true, name: true, email: true },
        },
        sourceDeal: {
          select: { id: true, title: true, value: true, phase: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: { role: 'asc' },
        },
        modules: {
          orderBy: { module: 'asc' },
        },
        milestones: {
          orderBy: { sortOrder: 'asc' },
        },
        notes: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Projekt nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Fehler beim Abrufen des Projekts:", error);
    return NextResponse.json(
      { error: "Fehler beim Abrufen des Projekts" },
      { status: 500 }
    );
  }
}

// PUT: Projekt aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const userId = (session.user as any).id;

    const existingProject = await prisma.crmProject.findUnique({
      where: { id: params.id },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Projekt nicht gefunden" },
        { status: 404 }
      );
    }

    // Status-Änderung protokollieren
    const statusChanged = body.status && body.status !== existingProject.status;

    const updatedProject = await prisma.crmProject.update({
      where: { id: params.id },
      data: {
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        contactId: body.contactId || null,
        managerId: body.managerId || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        actualEndDate: body.actualEndDate ? new Date(body.actualEndDate) : null,
        budget: body.budget ? parseFloat(body.budget) : null,
        tags: body.tags || [],
        customFields: body.customFields || null,
      },
      include: {
        contact: true,
        manager: true,
        members: { include: { user: true } },
        modules: true,
      },
    });

    // Aktivität loggen
    if (statusChanged) {
      await prisma.crmProjectActivity.create({
        data: {
          projectId: params.id,
          userId,
          type: 'STATUS_CHANGE',
          title: 'Status geändert',
          description: `Status von "${existingProject.status}" zu "${body.status}" geändert`,
          metadata: {
            oldStatus: existingProject.status,
            newStatus: body.status,
          },
        },
      });
    } else {
      await prisma.crmProjectActivity.create({
        data: {
          projectId: params.id,
          userId,
          type: 'UPDATED',
          title: 'Projekt aktualisiert',
        },
      });
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Projekts:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Projekts" },
      { status: 500 }
    );
  }
}

// DELETE: Projekt löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userRole = (session.user as any).role?.toLowerCase();
    if (!['admin', 'manager'].includes(userRole)) {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    await prisma.crmProject.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Löschen des Projekts:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Projekts" },
      { status: 500 }
    );
  }
}
