import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { ImapFlow } from 'imapflow';

export const dynamic = 'force-dynamic';

interface MoveRequest {
  messageUids: number[];
  sourceAccountId: string;
  sourceFolderPath: string;
  targetAccountId: string;
  targetFolderPath: string;
}

// POST: E-Mails verschieben (auch kontenübergreifend)
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

    const data: MoveRequest = await request.json();
    const { messageUids, sourceAccountId, sourceFolderPath, targetAccountId, targetFolderPath } = data;

    if (!messageUids || messageUids.length === 0) {
      return NextResponse.json({ error: 'Keine Nachrichten ausgewählt' }, { status: 400 });
    }

    // Source-Konto laden
    const sourceAccount = await prisma.emailAccount.findUnique({
      where: { id: sourceAccountId },
    });

    if (!sourceAccount) {
      return NextResponse.json({ error: 'Quell-Konto nicht gefunden' }, { status: 404 });
    }

    // Verschiebung innerhalb desselben Kontos
    if (sourceAccountId === targetAccountId) {
      const client = new ImapFlow({
        host: sourceAccount.imapHost,
        port: sourceAccount.imapPort,
        secure: sourceAccount.imapSecure,
        auth: {
          user: sourceAccount.imapUser,
          pass: sourceAccount.imapPassword,
        },
        logger: false,
      });

      try {
        await client.connect();
        await client.mailboxOpen(sourceFolderPath);
        
        // Nachrichten verschieben
        await client.messageMove(messageUids.join(','), targetFolderPath);
        
        await client.logout();

        return NextResponse.json({
          success: true,
          moved: messageUids.length,
          message: `${messageUids.length} Nachricht(en) verschoben`,
        });
      } catch (error) {
        console.error('IMAP Move Fehler:', error);
        await client.logout().catch(() => {});
        return NextResponse.json({ error: 'Verschieben fehlgeschlagen' }, { status: 500 });
      }
    }

    // Kontenübergreifende Verschiebung (Copy + Delete)
    const targetAccount = await prisma.emailAccount.findUnique({
      where: { id: targetAccountId },
    });

    if (!targetAccount) {
      return NextResponse.json({ error: 'Ziel-Konto nicht gefunden' }, { status: 404 });
    }

    const sourceClient = new ImapFlow({
      host: sourceAccount.imapHost,
      port: sourceAccount.imapPort,
      secure: sourceAccount.imapSecure,
      auth: {
        user: sourceAccount.imapUser,
        pass: sourceAccount.imapPassword,
      },
      logger: false,
    });

    const targetClient = new ImapFlow({
      host: targetAccount.imapHost,
      port: targetAccount.imapPort,
      secure: targetAccount.imapSecure,
      auth: {
        user: targetAccount.imapUser,
        pass: targetAccount.imapPassword,
      },
      logger: false,
    });

    try {
      await sourceClient.connect();
      await targetClient.connect();

      await sourceClient.mailboxOpen(sourceFolderPath);
      
      let movedCount = 0;

      // Jede Nachricht einzeln kopieren und löschen
      for (const uid of messageUids) {
        try {
          // Nachricht vom Quell-Server laden
          const message = await sourceClient.fetchOne(String(uid), {
            source: true,
          });

          if (message && message.source) {
            // Nachricht zum Ziel-Server hochladen
            await targetClient.append(targetFolderPath, message.source, ['\\Seen']);

            // Nachricht vom Quell-Server löschen
            await sourceClient.messageFlagsAdd(String(uid), ['\\Deleted']);
            movedCount++;
          }
        } catch (msgError) {
          console.error(`Fehler beim Verschieben von UID ${uid}:`, msgError);
        }
      }

      // Gelöschte Nachrichten endgültig entfernen
      await sourceClient.messageDelete({ deleted: true });

      await sourceClient.logout();
      await targetClient.logout();

      return NextResponse.json({
        success: true,
        moved: movedCount,
        message: `${movedCount} von ${messageUids.length} Nachricht(en) verschoben`,
      });
    } catch (error) {
      console.error('Kontenübergreifendes Verschieben fehlgeschlagen:', error);
      await sourceClient.logout().catch(() => {});
      await targetClient.logout().catch(() => {});
      return NextResponse.json({ error: 'Kontenübergreifendes Verschieben fehlgeschlagen' }, { status: 500 });
    }
  } catch (error) {
    console.error('Fehler beim Verschieben:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
