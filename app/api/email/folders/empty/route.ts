import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { ImapFlow } from 'imapflow';

export const dynamic = 'force-dynamic';

// POST: Ordner leeren (nur für Papierkorb/Spam erlaubt)
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

    const { accountId, folderPath, folderType } = await request.json();

    if (!accountId || !folderPath) {
      return NextResponse.json({ error: 'Account-ID und Ordner-Pfad erforderlich' }, { status: 400 });
    }

    // Nur Papierkorb und Spam dürfen geleert werden
    const allowedTypes = ['trash', 'spam'];
    if (folderType && !allowedTypes.includes(folderType)) {
      return NextResponse.json({ 
        error: 'Nur Papierkorb und Spam können geleert werden' 
      }, { status: 400 });
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
      const deletedCount = mailbox.exists;
      
      if (deletedCount > 0) {
        // Alle Nachrichten zum Löschen markieren
        await client.messageFlagsAdd({ all: true }, ['\\Deleted']);
        // Gelöschte Nachrichten endgültig entfernen (EXPUNGE)
        await client.messageDelete({ all: true });
      }

      await client.logout();

      // Ordner-Counts in DB zurücksetzen
      await prisma.emailFolder.updateMany({
        where: { accountId, path: folderPath },
        data: { unreadCount: 0, totalCount: 0 },
      });

      return NextResponse.json({
        success: true,
        message: `${deletedCount} Nachrichten aus "${folderPath}" gelöscht`,
        count: deletedCount,
      });
    } catch (imapError: any) {
      console.error('IMAP Empty Folder Fehler:', imapError);
      await client.logout().catch(() => {});
      return NextResponse.json({ 
        error: 'Fehler beim Leeren des Ordners', 
        details: imapError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Fehler beim Leeren des Ordners:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
