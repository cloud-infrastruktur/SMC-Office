import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Benutzer-Panel-Layout abrufen
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

    let layout = await prisma.userPanelLayout.findUnique({
      where: { userId },
    });

    // Standardwerte zurückgeben, wenn kein Layout existiert
    if (!layout) {
      layout = {
        id: '',
        userId,
        emailPanelSizes: { folders: 15, messages: 30, content: 55 },
        emailListView: 'list',
        emailSortBy: 'date',
        emailSortOrder: 'desc',
        conversationView: false,
        previewPane: 'right',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return NextResponse.json(layout);
  } catch (error) {
    console.error('Fehler beim Laden des Layouts:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// PUT: Benutzer-Panel-Layout speichern
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'Benutzer-ID fehlt' }, { status: 400 });
    }

    const data = await request.json();

    const layout = await prisma.userPanelLayout.upsert({
      where: { userId },
      update: {
        emailPanelSizes: data.emailPanelSizes,
        emailListView: data.emailListView,
        emailSortBy: data.emailSortBy,
        emailSortOrder: data.emailSortOrder,
        conversationView: data.conversationView,
        previewPane: data.previewPane,
      },
      create: {
        userId,
        emailPanelSizes: data.emailPanelSizes || { folders: 15, messages: 30, content: 55 },
        emailListView: data.emailListView || 'list',
        emailSortBy: data.emailSortBy || 'date',
        emailSortOrder: data.emailSortOrder || 'desc',
        conversationView: data.conversationView || false,
        previewPane: data.previewPane || 'right',
      },
    });

    return NextResponse.json(layout);
  } catch (error) {
    console.error('Fehler beim Speichern des Layouts:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
