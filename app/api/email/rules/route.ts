import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Alle Regeln abrufen
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    const where = accountId ? { accountId } : {};

    const rules = await prisma.emailRule.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        account: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error('Fehler beim Laden der Regeln:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// POST: Neue Regel erstellen
export async function POST(request: Request) {
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
    const {
      accountId,
      name,
      conditions,
      matchAll,
      moveToFolder,
      markAsRead,
      markAsStarred,
      addCategory,
      forwardTo,
      deleteMessage,
      isActive,
      sortOrder,
    } = data;

    if (!accountId || !name) {
      return NextResponse.json({ error: 'Account-ID und Name erforderlich' }, { status: 400 });
    }

    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return NextResponse.json({ error: 'Mindestens eine Bedingung erforderlich' }, { status: 400 });
    }

    const rule = await prisma.emailRule.create({
      data: {
        accountId,
        name,
        conditions,
        matchAll: matchAll ?? true,
        moveToFolder: moveToFolder || null,
        markAsRead: markAsRead ?? false,
        markAsStarred: markAsStarred ?? false,
        addCategory: addCategory || null,
        forwardTo: forwardTo || null,
        deleteMessage: deleteMessage ?? false,
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
      },
      include: {
        account: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Fehler beim Erstellen der Regel:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
