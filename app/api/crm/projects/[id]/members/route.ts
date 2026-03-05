import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST: Mitglied hinzufügen
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Benutzer-ID erforderlich" },
        { status: 400 }
      );
    }

    // Prüfen ob bereits Mitglied
    const existingMember = await prisma.crmProjectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: params.id,
          userId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "Benutzer ist bereits Mitglied" },
        { status: 400 }
      );
    }

    const member = await prisma.crmProjectMember.create({
      data: {
        projectId: params.id,
        userId,
        role: role || 'MEMBER',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    // Aktivität loggen
    await prisma.crmProjectActivity.create({
      data: {
        projectId: params.id,
        userId: (session.user as any).id,
        type: 'MEMBER_ADDED',
        title: 'Mitglied hinzugefügt',
        description: `${member.user.name || member.user.email} wurde zum Projekt hinzugefügt`,
        metadata: { memberId: userId, role },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Fehler beim Hinzufügen des Mitglieds:", error);
    return NextResponse.json(
      { error: "Fehler beim Hinzufügen" },
      { status: 500 }
    );
  }
}

// DELETE: Mitglied entfernen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Benutzer-ID erforderlich" },
        { status: 400 }
      );
    }

    await prisma.crmProjectMember.delete({
      where: {
        projectId_userId: {
          projectId: params.id,
          userId,
        },
      },
    });

    // Aktivität loggen
    await prisma.crmProjectActivity.create({
      data: {
        projectId: params.id,
        userId: (session.user as any).id,
        type: 'MEMBER_REMOVED',
        title: 'Mitglied entfernt',
        metadata: { memberId: userId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Entfernen des Mitglieds:", error);
    return NextResponse.json(
      { error: "Fehler beim Entfernen" },
      { status: 500 }
    );
  }
}
