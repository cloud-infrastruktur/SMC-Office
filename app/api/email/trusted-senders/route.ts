import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Alle vertrauenswürdigen Absender abrufen
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

    const trustedSenders = await prisma.trustedSender.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(trustedSenders);
  } catch (error) {
    console.error('Fehler beim Laden der vertrauenswürdigen Absender:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// POST: Vertrauenswürdigen Absender hinzufügen
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

    const { email, domain, trustImages, trustLinks } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-Mail-Adresse erforderlich' }, { status: 400 });
    }

    // Prüfen, ob bereits vorhanden
    const existing = await prisma.trustedSender.findUnique({
      where: {
        userId_email: { userId, email: email.toLowerCase() },
      },
    });

    if (existing) {
      // Aktualisieren
      const updated = await prisma.trustedSender.update({
        where: { id: existing.id },
        data: {
          domain,
          trustImages: trustImages ?? true,
          trustLinks: trustLinks ?? false,
        },
      });
      return NextResponse.json(updated);
    }

    // Neu erstellen
    const trustedSender = await prisma.trustedSender.create({
      data: {
        userId,
        email: email.toLowerCase(),
        domain: domain?.toLowerCase(),
        trustImages: trustImages ?? true,
        trustLinks: trustLinks ?? false,
      },
    });

    return NextResponse.json(trustedSender);
  } catch (error) {
    console.error('Fehler beim Hinzufügen des vertrauenswürdigen Absenders:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// DELETE: Vertrauenswürdigen Absender entfernen
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'Benutzer-ID fehlt' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'E-Mail-Adresse erforderlich' }, { status: 400 });
    }

    await prisma.trustedSender.deleteMany({
      where: {
        userId,
        email: email.toLowerCase(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Entfernen des vertrauenswürdigen Absenders:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
