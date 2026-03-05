import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST: Modul aktivieren/deaktivieren
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
    const { module, isEnabled, settings } = body;

    if (!module) {
      return NextResponse.json(
        { error: "Modul erforderlich" },
        { status: 400 }
      );
    }

    // Upsert: Erstellen oder aktualisieren
    const projectModule = await prisma.crmProjectModule.upsert({
      where: {
        projectId_module: {
          projectId: params.id,
          module,
        },
      },
      update: {
        isEnabled: isEnabled ?? true,
        settings: settings || null,
      },
      create: {
        projectId: params.id,
        module,
        isEnabled: isEnabled ?? true,
        settings: settings || null,
      },
    });

    // Aktivität loggen
    await prisma.crmProjectActivity.create({
      data: {
        projectId: params.id,
        userId: (session.user as any).id,
        type: isEnabled ? 'MODULE_ENABLED' : 'MODULE_DISABLED',
        title: isEnabled ? 'Modul aktiviert' : 'Modul deaktiviert',
        description: `Modul "${module}" wurde ${isEnabled ? 'aktiviert' : 'deaktiviert'}`,
        metadata: { module, isEnabled },
      },
    });

    return NextResponse.json(projectModule);
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Moduls:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren" },
      { status: 500 }
    );
  }
}
