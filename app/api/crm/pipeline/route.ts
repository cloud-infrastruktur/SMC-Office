import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";
import { CrmDealPhase } from "@prisma/client";

export const dynamic = "force-dynamic";

// Standard-Phasen Definition
const DEFAULT_PHASES = [
  {
    phase: "PHASE_1_ANFRAGE",
    name: "Projektanfrage",
    description: "Automatischer Eingang via Mail-Filter",
    color: "#6366f1", // indigo
    icon: "Inbox",
    sortOrder: 1,
  },
  {
    phase: "PHASE_2_ABSTIMMUNG",
    name: "In Abstimmung",
    description: "Rahmenbedingungen mit Unternehmensberatung klären",
    color: "#8b5cf6", // violet
    icon: "MessageSquare",
    sortOrder: 2,
  },
  {
    phase: "PHASE_3_PROFIL",
    name: "Profil vorgestellt",
    description: "Mein Profil liegt beim Endkunden vor",
    color: "#3b82f6", // blue
    icon: "User",
    sortOrder: 3,
  },
  {
    phase: "PHASE_4_INTERVIEW",
    name: "Interview",
    description: "Termin mit dem Kunden",
    color: "#0ea5e9", // sky
    icon: "Calendar",
    sortOrder: 4,
  },
  {
    phase: "PHASE_5_AUFTRAG",
    name: "Auftrag liegt vor",
    description: "Zusage erfolgt",
    color: "#10b981", // emerald
    icon: "CheckCircle",
    sortOrder: 5,
  },
  {
    phase: "PHASE_6_VERTRAG",
    name: "Vertragsabstimmung",
    description: "Finalisierung mit der Beratung",
    color: "#22c55e", // green
    icon: "FileSignature",
    sortOrder: 6,
  },
];

// GET - Pipeline-Phasen abrufen mit Deal-Counts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    // Phasen aus DB laden oder Defaults verwenden
    let phases = await prisma.crmPipelinePhase.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // Falls keine Phasen existieren, Defaults erstellen
    if (phases.length === 0) {
      for (const phase of DEFAULT_PHASES) {
        await prisma.crmPipelinePhase.create({
          data: phase as any,
        });
      }
      phases = await prisma.crmPipelinePhase.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
    }

    // Deal-Counts pro Phase
    const dealCounts = await prisma.crmDeal.groupBy({
      by: ["phase"],
      _count: { id: true },
      where: { isWon: null }, // Nur offene Deals
    });

    const countMap = new Map(dealCounts.map((dc) => [dc.phase, dc._count.id]));

    const phasesWithCounts = phases.map((p) => ({
      ...p,
      dealCount: countMap.get(p.phase as CrmDealPhase) || 0,
    }));

    return NextResponse.json(phasesWithCounts);
  } catch (error) {
    console.error("Error fetching pipeline:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Pipeline" },
      { status: 500 }
    );
  }
}

// PUT - Phase aktualisieren
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, color, icon, autoAssignTo, autoNotify, notifyEmails } = body;

    if (!id) {
      return NextResponse.json({ error: "Phase-ID erforderlich" }, { status: 400 });
    }

    const phase = await prisma.crmPipelinePhase.update({
      where: { id },
      data: {
        name,
        description,
        color,
        icon,
        autoAssignTo,
        autoNotify,
        notifyEmails,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(phase);
  } catch (error) {
    console.error("Error updating phase:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Phase" },
      { status: 500 }
    );
  }
}
