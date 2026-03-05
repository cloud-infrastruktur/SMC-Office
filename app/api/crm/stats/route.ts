import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - CRM Statistiken
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    // Parallele Abfragen für Performance
    const [
      totalContacts,
      totalDeals,
      openDeals,
      wonDeals,
      lostDeals,
      dealsThisMonth,
      totalValue,
      wonValue,
      recentActivities,
      lastScan,
      keywordConfig,
    ] = await Promise.all([
      // Kontakte
      prisma.crmContact.count({ where: { isActive: true } }),
      // Alle Deals
      prisma.crmDeal.count(),
      // Offene Deals
      prisma.crmDeal.count({ where: { isWon: null } }),
      // Gewonnene Deals
      prisma.crmDeal.count({ where: { isWon: true } }),
      // Verlorene Deals
      prisma.crmDeal.count({ where: { isWon: false } }),
      // Deals diesen Monat
      prisma.crmDeal.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      // Gesamt-Wert aller Deals
      prisma.crmDeal.aggregate({ _sum: { value: true } }),
      // Wert gewonnener Deals
      prisma.crmDeal.aggregate({
        _sum: { value: true },
        where: { isWon: true },
      }),
      // Letzte Aktivitäten
      prisma.crmActivity.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      // Letzter Scan
      prisma.crmScanLog.findFirst({ orderBy: { createdAt: "desc" } }),
      // Keyword-Config
      prisma.crmKeywordConfig.findFirst({ where: { isActive: true } }),
    ]);

    // Win-Rate berechnen
    const closedDeals = wonDeals + lostDeals;
    const winRate = closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0;

    // Deals pro Phase
    const dealsPerPhase = await prisma.crmDeal.groupBy({
      by: ["phase"],
      _count: { id: true },
      where: { isWon: null },
    });

    const stats = {
      contacts: {
        total: totalContacts,
      },
      deals: {
        total: totalDeals,
        open: openDeals,
        won: wonDeals,
        lost: lostDeals,
        thisMonth: dealsThisMonth,
        winRate,
        perPhase: dealsPerPhase.reduce((acc, p) => {
          acc[p.phase] = p._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
      value: {
        total: totalValue._sum.value || 0,
        won: wonValue._sum.value || 0,
      },
      activities: {
        lastWeek: recentActivities,
      },
      automation: {
        lastScan: lastScan?.createdAt || null,
        totalScans: keywordConfig?.totalScans || 0,
        totalMatches: keywordConfig?.totalMatches || 0,
        keywordsCount: keywordConfig?.keywords?.length || 0,
      },
      health: {
        status: "healthy",
        emailConnected: true, // TODO: Tatsächlichen Status prüfen
        lastScanOk: lastScan ? !lastScan.errors : true,
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching CRM stats:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Statistiken" },
      { status: 500 }
    );
  }
}
