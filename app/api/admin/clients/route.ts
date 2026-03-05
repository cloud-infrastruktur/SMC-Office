import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { hasAdminAccess } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET - Alle Kunden mit Anonymisierungsdaten abrufen
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const clients = await prisma.client.findMany({
      orderBy: [{ industry: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            projects: true,
            references: true,
          },
        },
      },
    });

    // Branchen-Kategorien abrufen
    const industries = await prisma.industryCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ clients, industries });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Kunden' }, { status: 500 });
  }
}

// POST - Neuen Kunden erstellen
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const data = await req.json();
    const { name, anonymizedName, industry, description, sortOrder } = data;

    if (!name || !anonymizedName || !industry) {
      return NextResponse.json(
        { error: 'Name, anonymisierter Name und Branche sind erforderlich' },
        { status: 400 }
      );
    }

    // Prüfen ob Kunde bereits existiert
    const existing = await prisma.client.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: 'Ein Kunde mit diesem Namen existiert bereits' },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        name,
        anonymizedName,
        industry,
        description: description || null,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Kunden' }, { status: 500 });
  }
}
