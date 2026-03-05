// API Route: Einzelne E-Mail Nachricht
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { 
  fetchMessageContent, 
  setMessageFlags, 
  deleteMessage, 
  moveMessage,
  EmailAccountConfig 
} from '@/lib/email-client';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Vollständigen E-Mail-Inhalt abrufen
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
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const folderPath = searchParams.get('folderPath') || 'INBOX';
    const uid = parseInt(id);

    if (!accountId || isNaN(uid)) {
      return NextResponse.json({ error: 'accountId und gültige uid erforderlich' }, { status: 400 });
    }

    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 });
    }

    const config: EmailAccountConfig = {
      id: account.id,
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

    const content = await fetchMessageContent(config, folderPath, uid);

    // Nachricht als gelesen markieren
    await setMessageFlags(config, folderPath, uid, { read: true }).catch(() => {});

    // Anhänge ohne Content zurückgeben (zu groß)
    const attachments = content.attachments.map((att) => ({
      filename: att.filename,
      contentType: att.contentType,
      size: att.size,
      contentId: att.contentId,
    }));

    return NextResponse.json({
      textBody: content.textBody,
      htmlBody: content.htmlBody,
      attachments,
    });
  } catch (error) {
    console.error('[EmailMessage] GET Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Laden' },
      { status: 500 }
    );
  }
}

// PUT: Nachricht aktualisieren (Flags setzen)
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
    const { accountId, folderPath, read, starred, moveTo } = body;
    const uid = parseInt(id);

    if (!accountId || isNaN(uid)) {
      return NextResponse.json({ error: 'accountId und gültige uid erforderlich' }, { status: 400 });
    }

    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 });
    }

    const config: EmailAccountConfig = {
      id: account.id,
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

    const currentFolder = folderPath || 'INBOX';

    // Verschieben
    if (moveTo) {
      await moveMessage(config, currentFolder, uid, moveTo);
      return NextResponse.json({ success: true, action: 'moved' });
    }

    // Flags setzen
    if (read !== undefined || starred !== undefined) {
      await setMessageFlags(config, currentFolder, uid, { read, starred });
      return NextResponse.json({ success: true, action: 'flags_updated' });
    }

    return NextResponse.json({ error: 'Keine Aktion angegeben' }, { status: 400 });
  } catch (error) {
    console.error('[EmailMessage] PUT Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren' },
      { status: 500 }
    );
  }
}

// DELETE: Nachricht löschen
export async function DELETE(request: Request, { params }: RouteParams) {
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
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const folderPath = searchParams.get('folderPath') || 'INBOX';
    const uid = parseInt(id);

    if (!accountId || isNaN(uid)) {
      return NextResponse.json({ error: 'accountId und gültige uid erforderlich' }, { status: 400 });
    }

    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
      include: { folders: true },
    });

    if (!account) {
      return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 });
    }

    const config: EmailAccountConfig = {
      id: account.id,
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

    // Finde Papierkorb-Ordner
    const trashFolder = account.folders.find((f) => f.type === 'trash');

    await deleteMessage(config, folderPath, uid, trashFolder?.path);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[EmailMessage] DELETE Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Löschen' },
      { status: 500 }
    );
  }
}
