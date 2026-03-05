import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { ImapFlow } from 'imapflow';

export const dynamic = 'force-dynamic';

// POST: Alle Nachrichten im Ordner als gelesen markieren
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

    const { accountId, folderPath } = await request.json();

    if (!accountId || !folderPath) {
      return NextResponse.json({ error: 'Account-ID und Ordner-Pfad erforderlich' }, { status: 400 });
    }

    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 });
    }

    const client = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort,
      secure: account.imapSecure,
      auth: {
        user: account.imapUser,
        pass: account.imapPassword,
      },
      logger: false,
    });

    try {
      await client.connect();
      
      // Ordner öffnen
      const mailbox = await client.mailboxOpen(folderPath);
      
      if (mailbox.exists > 0) {
        // Alle ungelesenen Nachrichten als gelesen markieren
        await client.messageFlagsAdd({ all: true }, ['\\Seen']);
      }

      await client.logout();

      // Ordner-Unread-Count in DB auf 0 setzen
      await prisma.emailFolder.updateMany({
        where: { accountId, path: folderPath },
        data: { unreadCount: 0 },
      });

      return NextResponse.json({
        success: true,
        message: `Alle Nachrichten in "${folderPath}" als gelesen markiert`,
        count: mailbox.exists,
      });
    } catch (imapError: any) {
      console.error('IMAP Mark Read Fehler:', imapError);
      await client.logout().catch(() => {});
      return NextResponse.json({ 
        error: 'Fehler beim Markieren', 
        details: imapError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Fehler beim Markieren als gelesen:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
