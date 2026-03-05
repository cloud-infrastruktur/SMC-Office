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

// POST: Projekt aus gewonnenem Deal erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { dealId, modules } = body;

    if (!dealId) {
      return NextResponse.json(
        { error: "Deal-ID erforderlich" },
        { status: 400 }
      );
    }

    // Deal laden
    const deal = await prisma.crmDeal.findUnique({
      where: { id: dealId },
      include: {
        contact: true,
        linkedProject: true,
      },
    });

    if (!deal) {
      return NextResponse.json(
        { error: "Deal nicht gefunden" },
        { status: 404 }
      );
    }

    if (deal.linkedProject) {
      return NextResponse.json(
        { error: "Für diesen Deal existiert bereits ein Projekt" },
        { status: 400 }
      );
    }

    const projectNumber = await generateProjectNumber();
    const userId = (session.user as any).id;

    // Projekt aus Deal erstellen
    const project = await prisma.crmProject.create({
      data: {
        projectNumber,
        title: deal.title,
        description: deal.description,
        contactId: deal.contactId,
        sourceDealId: deal.id,
        managerId: deal.assignedToId || userId,
        budget: deal.value,
        priority: deal.priority === 'high' ? 'HIGH' : deal.priority === 'low' ? 'LOW' : 'MEDIUM',
        tags: deal.tags,
        status: 'ACTIVE',
        startDate: new Date(),
      },
    });

    // Deal als gewonnen markieren
    await prisma.crmDeal.update({
      where: { id: dealId },
      data: {
        isWon: true,
        actualClose: new Date(),
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

    // Wenn Deal einem anderen User zugewiesen war, auch als Manager hinzufügen
    if (deal.assignedToId && deal.assignedToId !== userId) {
      await prisma.crmProjectMember.create({
        data: {
          projectId: project.id,
          userId: deal.assignedToId,
          role: 'MANAGER',
        },
      });
    }

    // Standard-Module aktivieren oder übergebene Module
    const defaultModules = modules || ['FILEMANAGER', 'NOTES', 'CALENDAR'];
    for (const mod of defaultModules) {
      await prisma.crmProjectModule.create({
        data: {
          projectId: project.id,
          module: mod,
          isEnabled: true,
        },
      });
    }

    // Aktivität loggen
    await prisma.crmProjectActivity.create({
      data: {
        projectId: project.id,
        userId,
        type: 'CREATED',
        title: 'Projekt aus Deal erstellt',
        description: `Projekt "${project.title}" wurde aus Deal erstellt`,
        metadata: { dealId: deal.id, dealTitle: deal.title },
      },
    });

    // CRM-Aktivität beim Deal loggen
    await prisma.crmActivity.create({
      data: {
        type: 'NOTE',
        title: 'Projekt erstellt',
        description: `Projekt ${projectNumber} wurde aus diesem Deal erstellt`,
        dealId: deal.id,
        contactId: deal.contactId,
        createdById: userId,
      },
    });

    // Projekt mit Relationen zurückladen
    const fullProject = await prisma.crmProject.findUnique({
      where: { id: project.id },
      include: {
        contact: true,
        manager: true,
        sourceDeal: true,
        members: { include: { user: true } },
        modules: true,
      },
    });

    return NextResponse.json(fullProject, { status: 201 });
  } catch (error) {
    console.error("Fehler beim Erstellen des Projekts aus Deal:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Projekts" },
      { status: 500 }
    );
  }
}
