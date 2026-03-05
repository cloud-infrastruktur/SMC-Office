import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Alle Signaturen für ein Konto abrufen
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account-ID erforderlich' }, { status: 400 });
    }

    const signatures = await prisma.emailSignature.findMany({
      where: { accountId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(signatures);
  } catch (error) {
    console.error('Fehler beim Laden der Signaturen:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// POST: Neue Signatur erstellen
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { accountId, name, content, isDefault, isReplyDefault } = await request.json();

    if (!accountId || !name || !content) {
      return NextResponse.json({ error: 'Alle Felder erforderlich' }, { status: 400 });
    }

    // Wenn als Standard gesetzt, andere zurücksetzen
    if (isDefault) {
      await prisma.emailSignature.updateMany({
        where: { accountId, isDefault: true },
        data: { isDefault: false },
      });
    }

    if (isReplyDefault) {
      await prisma.emailSignature.updateMany({
        where: { accountId, isReplyDefault: true },
        data: { isReplyDefault: false },
      });
    }

    const signature = await prisma.emailSignature.create({
      data: {
        accountId,
        name,
        content,
        isDefault: isDefault ?? false,
        isReplyDefault: isReplyDefault ?? false,
      },
    });

    return NextResponse.json(signature);
  } catch (error) {
    console.error('Fehler beim Erstellen der Signatur:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// PUT: Signatur aktualisieren
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id, accountId, name, content, isDefault, isReplyDefault } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Signatur-ID erforderlich' }, { status: 400 });
    }

    // Wenn als Standard gesetzt, andere zurücksetzen
    if (isDefault) {
      await prisma.emailSignature.updateMany({
        where: { accountId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    if (isReplyDefault) {
      await prisma.emailSignature.updateMany({
        where: { accountId, isReplyDefault: true, id: { not: id } },
        data: { isReplyDefault: false },
      });
    }

    const signature = await prisma.emailSignature.update({
      where: { id },
      data: {
        name,
        content,
        isDefault: isDefault ?? false,
        isReplyDefault: isReplyDefault ?? false,
      },
    });

    return NextResponse.json(signature);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Signatur:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// DELETE: Signatur löschen
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Signatur-ID erforderlich' }, { status: 400 });
    }

    await prisma.emailSignature.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen der Signatur:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
