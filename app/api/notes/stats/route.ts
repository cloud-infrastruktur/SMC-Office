import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: Notizen-Statistiken
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Statistiken abrufen
    const [total, byCategory, byStatus, byPriority, overdue, pinned] = await Promise.all([
      // Gesamt (nicht archiviert)
      prisma.note.count({
        where: { userId, isArchived: false },
      }),
      
      // Nach Kategorie
      prisma.note.groupBy({
        by: ['category'],
        where: { userId, isArchived: false },
        _count: { id: true },
      }),
      
      // Nach Status
      prisma.note.groupBy({
        by: ['status'],
        where: { userId, isArchived: false },
        _count: { id: true },
      }),
      
      // Nach Priorität
      prisma.note.groupBy({
        by: ['priority'],
        where: { userId, isArchived: false },
        _count: { id: true },
      }),
      
      // Überfällig
      prisma.note.count({
        where: {
          userId,
          isArchived: false,
          status: { not: 'DONE' },
          dueDate: { lt: new Date() },
        },
      }),
      
      // Angepinnt
      prisma.note.count({
        where: { userId, isArchived: false, isPinned: true },
      }),
    ]);

    // Formatierte Statistiken
    const stats = {
      total,
      overdue,
      pinned,
      byCategory: byCategory.reduce((acc: Record<string, number>, item: any) => {
        acc[item.category] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byStatus: byStatus.reduce((acc: Record<string, number>, item: any) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byPriority: byPriority.reduce((acc: Record<string, number>, item: any) => {
        acc[item.priority] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Fehler beim Abrufen der Statistiken:", error);
    return NextResponse.json(
      { error: "Fehler beim Abrufen der Statistiken" },
      { status: 500 }
    );
  }
}
