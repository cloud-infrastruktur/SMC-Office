/**
 * Calendar Accounts API
 * GET: Liste aller Kalender-Accounts
 * POST: Neuen Kalender-Account anlegen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createCalDAVClient } from '@/lib/caldav';
import { CalendarProvider } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const accounts = await prisma.calendarAccount.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        provider: true,
        caldavUrl: true,
        color: true,
        isActive: true,
        lastSync: true,
        syncError: true,
        createdAt: true,
        _count: {
          select: { events: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error('Error fetching calendar accounts:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Kalender-Accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const body = await request.json();
    const { name, provider, caldavUrl, username, password, color } = body;

    if (!name || !provider) {
      return NextResponse.json(
        { error: 'Name und Provider sind erforderlich' },
        { status: 400 }
      );
    }

    // Validate provider
    const validProviders: CalendarProvider[] = ['LOCAL', 'APPLE', 'NEXTCLOUD', 'GOOGLE', 'CALDAV_GENERIC'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: 'Ungültiger Provider' },
        { status: 400 }
      );
    }

    // For CalDAV providers, test connection first
    if (provider !== 'LOCAL' && username && password) {
      const client = createCalDAVClient(provider, {
        username,
        password,
        serverUrl: caldavUrl
      });

      const testResult = await client.testConnection();
      if (!testResult.success) {
        return NextResponse.json(
          { error: `Verbindungstest fehlgeschlagen: ${testResult.error}` },
          { status: 400 }
        );
      }
    }

    // Create account
    const account = await prisma.calendarAccount.create({
      data: {
        userId: user.id,
        name,
        provider,
        caldavUrl: caldavUrl || null,
        username: username || null,
        password: password || null, // TODO: Encrypt
        color: color || '#3b82f6',
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        provider: account.provider,
        color: account.color,
        isActive: account.isActive
      }
    });
  } catch (error: any) {
    console.error('Error creating calendar account:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Kalender-Accounts' },
      { status: 500 }
    );
  }
}
