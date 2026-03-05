import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Einzelnes Template abrufen
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const template = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
      include: {
        account: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Fehler beim Laden des Templates:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// PUT: Template aktualisieren
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

    const template = await prisma.emailTemplate.update({
      where: { id: params.id },
      data: {
        name: data.name,
        subject: data.subject,
        content: data.content,
        category: data.category || null,
        shortcut: data.shortcut || null,
        variables: data.variables || [],
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
      include: {
        account: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Templates:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// DELETE: Template löschen
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

    await prisma.emailTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Template gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Templates:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
