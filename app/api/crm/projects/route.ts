import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Projekt-Nummer generieren
async function generateProjectNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;
  
  const lastProject = await prisma.crmProject.findFirst({
    where: {
      projectNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      projectNumber: 'desc',
    },
  });
  
  let nextNumber = 1;
  if (lastProject) {
    const lastNumberStr = lastProject.projectNumber.replace(prefix, '');
    nextNumber = parseInt(lastNumberStr, 10) + 1;
  }
  
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

// GET: Alle Projekte abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const contactId = searchParams.get("contactId");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    if (status) where.status = status;
    if (contactId) where.contactId = contactId;

    const projects = await prisma.crmProject.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            email: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sourceDeal: {
          select: {
            id: true,
            title: true,
            value: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        modules: true,
        milestones: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            notes: true,
            activities: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { updatedAt: 'desc' },
      ],
      take: limit,
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Fehler beim Abrufen der Projekte:", error);
    return NextResponse.json(
      { error: "Fehler beim Abrufen der Projekte" },
      { status: 500 }
    );
  }
}

// POST: Neues Projekt erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      contactId,
      sourceDealId,
      startDate,
      endDate,
      budget,
      priority,
      tags,
      modules,
      members,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Titel ist erforderlich" },
        { status: 400 }
      );
    }

    const projectNumber = await generateProjectNumber();
    const userId = (session.user as any).id;

    // Projekt erstellen
    const project = await prisma.crmProject.create({
      data: {
        projectNumber,
        title,
        description,
        contactId: contactId || null,
        sourceDealId: sourceDealId || null,
        managerId: userId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ? parseFloat(budget) : null,
        priority: priority || 'MEDIUM',
        tags: tags || [],
        status: 'ACTIVE',
      },
    });

    // Ersteller als Owner hinzufügen
    await prisma.crmProjectMember.create({
      data: {
        projectId: project.id,
        userId,
        role: 'OWNER',
      },
    });

    // Weitere Mitglieder hinzufügen
    if (members && members.length > 0) {
      for (const member of members) {
        if (member.userId !== userId) {
          await prisma.crmProjectMember.create({
            data: {
              projectId: project.id,
              userId: member.userId,
              role: member.role || 'MEMBER',
            },
          });
        }
      }
    }

    // Module aktivieren
    if (modules && modules.length > 0) {
      for (const mod of modules) {
        await prisma.crmProjectModule.create({
          data: {
            projectId: project.id,
            module: mod,
            isEnabled: true,
          },
        });
      }
    }

    // Aktivität loggen
    await prisma.crmProjectActivity.create({
      data: {
        projectId: project.id,
        userId,
        type: 'CREATED',
        title: 'Projekt erstellt',
        description: `Projekt "${title}" wurde erstellt`,
      },
    });

    // Projekt mit allen Relationen zurückladen
    const fullProject = await prisma.crmProject.findUnique({
      where: { id: project.id },
      include: {
        contact: true,
        manager: true,
        sourceDeal: true,
        members: {
          include: { user: true },
        },
        modules: true,
      },
    });

    return NextResponse.json(fullProject, { status: 201 });
  } catch (error) {
    console.error("Fehler beim Erstellen des Projekts:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Projekts" },
      { status: 500 }
    );
  }
}
