// API Route: E-Mail Nachrichten
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { fetchMessages, EmailAccountConfig } from '@/lib/email-client';

export const dynamic = 'force-dynamic';

// GET: Nachrichten aus einem Ordner abrufen
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const folderId = searchParams.get('folderId');
    const folderPath = searchParams.get('folderPath');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || undefined;

    if (!accountId) {
      return NextResponse.json({ error: 'accountId erforderlich' }, { status: 400 });
    }

    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 });
    }

    // Ordner-Pfad ermitteln
    let path = folderPath;
    if (!path && folderId) {
      const folder = await prisma.emailFolder.findUnique({ where: { id: folderId } });
      if (folder) path = folder.path;
    }
    if (!path) path = 'INBOX';

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

    const messages = await fetchMessages(config, path, { limit, offset, search });

    return NextResponse.json({
      messages,
      pagination: {
        limit,
        offset,
        hasMore: messages.length === limit,
      },
    });
  } catch (error) {
    console.error('[EmailMessages] GET Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Laden' },
      { status: 500 }
    );
  }
}
