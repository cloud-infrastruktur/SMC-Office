// API Route: Einzelnes E-Mail-Konto
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { testImapConnection, testSmtpConnection, syncFolders } from '@/lib/email-client';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Einzelnes Konto abrufen
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { id } = await params;

    const account = await prisma.emailAccount.findUnique({
      where: { id },
      include: {
        folders: {
          orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({
      ...account,
      imapPassword: '********',
      smtpPassword: '********',
    });
  } catch (error) {
    console.error('[EmailAccount] GET Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Laden' },
      { status: 500 }
    );
  }
}

// PUT: Konto aktualisieren
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Prüfe ob Konto existiert
    const existing = await prisma.emailAccount.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 });
    }

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
      isActive,
      testConnection,
    } = body;

    // Update-Daten vorbereiten (nur geänderte Felder)
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (imapHost !== undefined) updateData.imapHost = imapHost;
    if (imapPort !== undefined) updateData.imapPort = imapPort;
    if (imapSecure !== undefined) updateData.imapSecure = imapSecure;
    if (imapUser !== undefined) updateData.imapUser = imapUser;
    if (imapPassword && imapPassword !== '********') updateData.imapPassword = imapPassword;
    if (smtpHost !== undefined) updateData.smtpHost = smtpHost;
    if (smtpPort !== undefined) updateData.smtpPort = smtpPort;
    if (smtpSecure !== undefined) updateData.smtpSecure = smtpSecure;
    if (smtpUser !== undefined) updateData.smtpUser = smtpUser;
    if (smtpPassword && smtpPassword !== '********') updateData.smtpPassword = smtpPassword;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Optional: Verbindung testen
    if (testConnection) {
      const config = {
        name: name || existing.name,
        email: email || existing.email,
        imapHost: imapHost || existing.imapHost,
        imapPort: imapPort || existing.imapPort,
        imapSecure: imapSecure !== undefined ? imapSecure : existing.imapSecure,
        imapUser: imapUser || existing.imapUser,
        imapPassword: (imapPassword && imapPassword !== '********') ? imapPassword : existing.imapPassword,
        smtpHost: smtpHost || existing.smtpHost,
        smtpPort: smtpPort || existing.smtpPort,
        smtpSecure: smtpSecure !== undefined ? smtpSecure : existing.smtpSecure,
        smtpUser: smtpUser || existing.smtpUser,
        smtpPassword: (smtpPassword && smtpPassword !== '********') ? smtpPassword : existing.smtpPassword,
      };

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
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
      updateData.isDefault = true;
    } else if (isDefault === false) {
      updateData.isDefault = false;
    }

    const account = await prisma.emailAccount.update({
      where: { id },
      data: updateData,
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
    console.error('[EmailAccount] PUT Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren' },
      { status: 500 }
    );
  }
}

// DELETE: Konto löschen
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nur Admins können Konten löschen' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.emailAccount.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[EmailAccount] DELETE Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Löschen' },
      { status: 500 }
    );
  }
}

// POST: Konto synchronisieren oder testen
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'sync';

    const account = await prisma.emailAccount.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 });
    }

    if (action === 'test') {
      const config = {
        name: account.name,
        email: account.email,
        imapHost: account.imapHost,
        imapPort: account.imapPort,
        imapSecure: account.imapSecure,
        imapUser: account.imapUser,
        imapPassword: account.imapPassword,
        smtpHost: account.smtpHost,
        smtpPort: account.smtpPort,
        smtpSecure: account.smtpSecure,
        smtpUser: account.smtpUser,
        smtpPassword: account.smtpPassword,
      };

      const imapResult = await testImapConnection(config);
      const smtpResult = await testSmtpConnection(config);

      return NextResponse.json({
        success: imapResult.success && smtpResult.success,
        imap: imapResult,
        smtp: smtpResult,
      });
    }

    // Default: Synchronisation
    const result = await syncFolders(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[EmailAccount] POST Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler' },
      { status: 500 }
    );
  }
}
