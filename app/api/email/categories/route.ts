import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Alle Kategorien abrufen
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'Benutzer-ID fehlt' }, { status: 400 });
    }

    const categories = await prisma.emailCategory.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Fehler beim Laden der Kategorien:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// POST: Neue Kategorie erstellen
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'Benutzer-ID fehlt' }, { status: 400 });
    }

    const { name, color, icon } = await request.json();

    if (!name || !color) {
      return NextResponse.json({ error: 'Name und Farbe erforderlich' }, { status: 400 });
    }

    // Prüfen auf Duplikat
    const existing = await prisma.emailCategory.findUnique({
      where: {
        userId_name: { userId, name },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Kategorie existiert bereits' }, { status: 409 });
    }

    const category = await prisma.emailCategory.create({
      data: {
        userId,
        name,
        color,
        icon,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Fehler beim Erstellen der Kategorie:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// PUT: Kategorie aktualisieren
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id, name, color, icon } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Kategorie-ID erforderlich' }, { status: 400 });
    }

    const category = await prisma.emailCategory.update({
      where: { id },
      data: { name, color, icon },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Kategorie:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// DELETE: Kategorie löschen
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Kategorie-ID erforderlich' }, { status: 400 });
    }

    // Löscht auch alle Zuordnungen (Cascade)
    await prisma.emailCategory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen der Kategorie:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
