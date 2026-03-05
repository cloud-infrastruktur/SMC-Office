import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Entwürfe abrufen
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

    const drafts = await prisma.emailDraft.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(drafts);
  } catch (error) {
    console.error('Fehler beim Laden der Entwürfe:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// POST: Neuen Entwurf erstellen
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

    const {
      accountId,
      subject,
      toAddresses,
      ccAddresses,
      bccAddresses,
      textBody,
      htmlBody,
      replyToId,
      isReply,
      isForward,
    } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account-ID erforderlich' }, { status: 400 });
    }

    const draft = await prisma.emailDraft.create({
      data: {
        accountId,
        subject: subject || '',
        toAddresses: toAddresses || [],
        ccAddresses: ccAddresses || [],
        bccAddresses: bccAddresses || [],
        textBody,
        htmlBody,
        replyToId,
        isReply: isReply || false,
        isForward: isForward || false,
      },
    });

    return NextResponse.json(draft);
  } catch (error) {
    console.error('Fehler beim Erstellen des Entwurfs:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// PUT: Entwurf aktualisieren
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 });
    }

    const {
      id,
      subject,
      toAddresses,
      ccAddresses,
      bccAddresses,
      textBody,
      htmlBody,
    } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Entwurf-ID erforderlich' }, { status: 400 });
    }

    const draft = await prisma.emailDraft.update({
      where: { id },
      data: {
        subject: subject || '',
        toAddresses: toAddresses || [],
        ccAddresses: ccAddresses || [],
        bccAddresses: bccAddresses || [],
        textBody,
        htmlBody,
      },
    });

    return NextResponse.json(draft);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Entwurfs:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// DELETE: Entwurf löschen
export async function DELETE(request: Request) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entwurf-ID erforderlich' }, { status: 400 });
    }

    await prisma.emailDraft.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Entwurfs:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
