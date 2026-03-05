import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Einzelne Regel abrufen
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const rule = await prisma.emailRule.findUnique({
      where: { id: params.id },
      include: {
        account: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!rule) {
      return NextResponse.json({ error: 'Regel nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Fehler beim Laden der Regel:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// PUT: Regel aktualisieren
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 });
    }

    const data = await request.json();

    const rule = await prisma.emailRule.update({
      where: { id: params.id },
      data: {
        name: data.name,
        conditions: data.conditions,
        matchAll: data.matchAll,
        moveToFolder: data.moveToFolder || null,
        markAsRead: data.markAsRead,
        markAsStarred: data.markAsStarred,
        addCategory: data.addCategory || null,
        forwardTo: data.forwardTo || null,
        deleteMessage: data.deleteMessage,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
      include: {
        account: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Regel:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// DELETE: Regel löschen
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 });
    }

    await prisma.emailRule.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Regel gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Regel:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
