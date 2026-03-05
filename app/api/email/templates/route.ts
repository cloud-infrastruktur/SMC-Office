import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Alle Templates abrufen
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
    const category = searchParams.get('category');

    const where: any = { isActive: true };
    if (accountId) {
      where.OR = [
        { accountId },
        { accountId: null }, // Globale Templates
      ];
    }
    if (category) {
      where.category = category;
    }

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        account: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Kategorien sammeln
    const categories = [...new Set(templates.map(t => t.category).filter(Boolean))];

    return NextResponse.json({ templates, categories });
  } catch (error) {
    console.error('Fehler beim Laden der Templates:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// POST: Neues Template erstellen
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
      subject,
      content,
      category,
      shortcut,
      variables,
      isActive,
      sortOrder,
    } = data;

    if (!name || !content) {
      return NextResponse.json({ error: 'Name und Inhalt erforderlich' }, { status: 400 });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        accountId: accountId || null,
        name,
        subject: subject || '',
        content,
        category: category || null,
        shortcut: shortcut || null,
        variables: variables || [],
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
      },
      include: {
        account: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Fehler beim Erstellen des Templates:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
