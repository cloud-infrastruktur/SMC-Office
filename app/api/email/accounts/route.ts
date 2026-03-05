// API Route: E-Mail Konten
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { testImapConnection, testSmtpConnection, syncFolders } from '@/lib/email-client';
import type { EmailAccount, EmailFolder } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Typ für E-Mail-Konto mit Beziehungen
interface EmailAccountWithRelations extends EmailAccount {
  folders: EmailFolder[];
  _count: {
    messages: number;
  };
}

// GET: Alle E-Mail-Konten abrufen
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const accounts = await prisma.emailAccount.findMany({
      include: {
        folders: {
          orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    // Passwörter nicht zurückgeben
    const safeAccounts = accounts.map((acc: EmailAccountWithRelations) => ({
      ...acc,
      imapPassword: '********',
      smtpPassword: '********',
    }));

    return NextResponse.json(safeAccounts);
  } catch (error) {
    console.error('[EmailAccounts] GET Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Laden' },
      { status: 500 }
    );
  }
}

// Typ für Session-User
interface SessionUser {
  id?: string;
  role?: string;
  email?: string | null;
  name?: string | null;
}

// POST: Neues E-Mail-Konto erstellen
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = session.user as SessionUser;
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      email,
      imapHost,
      imapPort,
      imapSecure,
      imapUser,
      imapPassword,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPassword,
      isDefault,
      testConnection,
    } = body;

    // Validierung
    if (!name || !email || !imapHost || !imapUser || !imapPassword || !smtpHost || !smtpUser || !smtpPassword) {
      return NextResponse.json(
        { error: 'Alle Pflichtfelder müssen ausgefüllt sein' },
        { status: 400 }
      );
    }

    const config = {
      name,
      email,
      imapHost,
      imapPort: imapPort || 993,
      imapSecure: imapSecure !== false,
      imapUser,
      imapPassword,
      smtpHost,
      smtpPort: smtpPort || 587,
      smtpSecure: smtpSecure === true,
      smtpUser,
      smtpPassword,
    };

    // Optional: Verbindung testen
    if (testConnection) {
      const imapTest = await testImapConnection(config);
      if (!imapTest.success) {
        return NextResponse.json(
          { error: `IMAP-Verbindung fehlgeschlagen: ${imapTest.error}` },
          { status: 400 }
        );
      }

      const smtpTest = await testSmtpConnection(config);
      if (!smtpTest.success) {
        return NextResponse.json(
          { error: `SMTP-Verbindung fehlgeschlagen: ${smtpTest.error}` },
          { status: 400 }
        );
      }
    }

    // Wenn als Standard markiert, andere Konten demarkieren
    if (isDefault) {
      await prisma.emailAccount.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Konto erstellen
    const account = await prisma.emailAccount.create({
      data: {
        ...config,
        isDefault: isDefault || false,
        isActive: true,
        userId: user.id || '',
      },
    });

    // Ordner synchronisieren
    await syncFolders(account.id).catch((err) => {
      console.error('[EmailAccounts] Folder sync failed:', err);
    });

    return NextResponse.json({
      success: true,
      account: {
        ...account,
        imapPassword: '********',
        smtpPassword: '********',
      },
    });
  } catch (error) {
    console.error('[EmailAccounts] POST Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Erstellen' },
      { status: 500 }
    );
  }
}
