import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { ImapFlow } from 'imapflow';

export const dynamic = 'force-dynamic';

// GET: Quota-Informationen abrufen
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account-ID erforderlich' }, { status: 400 });
    }

    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 });
    }

    // IMAP-Verbindung herstellen
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

      // Quota abrufen über getQuota (IMAP QUOTA extension)
      let quotaInfo = null;
      try {
        // Versuche GETQUOTAROOT für INBOX
        const quotaResult = await (client as any).getQuota?.('INBOX') || 
                           await (client as any).getQuotaRoot?.('INBOX');
        
        if (quotaResult) {
          // ImapFlow gibt Quota in KB zurück
          const storage = quotaResult.storage || quotaResult;
          if (storage && storage.usage !== undefined && storage.limit !== undefined) {
            quotaInfo = {
              used: storage.usage * 1024, // KB zu Bytes
              total: storage.limit * 1024,
              percentage: Math.round((storage.usage / storage.limit) * 100),
            };
          }
        }
      } catch (quotaError) {
        // Server unterstützt möglicherweise keine Quota oder QUOTA extension
        console.log('Quota nicht verfügbar:', quotaError);
        
        // Fallback: Versuche die Mailbox-Status zu nutzen
        try {
          const mailbox = await client.mailboxOpen('INBOX');
          // Einige Server geben Quota-Info im Mailbox-Status
          if (mailbox && (mailbox as any).quota) {
            const q = (mailbox as any).quota;
            quotaInfo = {
              used: q.usage || 0,
              total: q.limit || 0,
              percentage: q.limit ? Math.round((q.usage / q.limit) * 100) : 0,
            };
          }
        } catch {
          // Ignorieren
        }
      }

      await client.logout();

      // Quota in DB speichern
      if (quotaInfo) {
        await prisma.emailAccount.update({
          where: { id: accountId },
          data: {
            quotaUsed: BigInt(quotaInfo.used),
            quotaTotal: BigInt(quotaInfo.total),
            quotaUpdated: new Date(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        quota: quotaInfo,
        supported: quotaInfo !== null,
      });
    } catch (imapError: any) {
      console.error('IMAP Quota Fehler:', imapError);
      await client.logout().catch(() => {});
      return NextResponse.json({ 
        error: 'Quota-Abfrage fehlgeschlagen', 
        details: imapError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Fehler bei Quota-Abfrage:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
