import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";
import { CrmDealPhase } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET - Alle Deals abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phase = searchParams.get("phase") as CrmDealPhase | null;
    const isWon = searchParams.get("isWon");
    const assignedToId = searchParams.get("assignedToId");
    const search = searchParams.get("search") || "";

    const where: any = {};
    
    if (phase) {
      where.phase = phase;
    }
    
    if (isWon !== null && isWon !== "") {
      where.isWon = isWon === "true";
    }
    
    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const deals = await prisma.crmDeal.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
          },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        sourceEmail: {
          select: { id: true, subject: true, fromAddress: true, receivedAt: true },
        },
        _count: { select: { activities: true } },
      },
    });

    return NextResponse.json(deals);
  } catch (error) {
    console.error("Error fetching deals:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Deals" },
      { status: 500 }
    );
  }
}

// POST - Neuen Deal erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      value,
      probability,
      phase,
      expectedClose,
      sourceType,
      sourceEmailId,
      contactId,
      assignedToId,
      tags,
      matchedKeywords,
      priority,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Titel ist erforderlich" },
        { status: 400 }
      );
    }

    const deal = await prisma.crmDeal.create({
      data: {
        title,
        description,
        value: value ? parseFloat(value) : null,
        probability: probability ? parseInt(String(probability), 10) : 50,
        phase: phase || "PHASE_1_ANFRAGE",
        expectedClose: expectedClose ? new Date(expectedClose) : null,
        sourceType: sourceType || "manual",
        sourceEmailId,
        contactId,
        assignedToId,
        tags: tags || [],
        matchedKeywords: matchedKeywords || [],
        priority: priority || "normal",
      },
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    // Aktivität erstellen
    await prisma.crmActivity.create({
      data: {
        type: "DEAL_CREATED",
        title: "Deal erstellt",
        description: `Deal "${title}" wurde erstellt`,
        dealId: deal.id,
        contactId,
        createdById: (session.user as { id?: string })?.id,
        metadata: { sourceType, phase: deal.phase },
      },
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error("Error creating deal:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Deals" },
      { status: 500 }
    );
  }
}
