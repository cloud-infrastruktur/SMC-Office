import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { ImapFlow } from 'imapflow';

export const dynamic = 'force-dynamic';

// PUT: Ordner umbenennen (IMAP RENAME)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 });
    }

    const { newName } = await request.json();
    const folderId = params.id;

    if (!newName) {
      return NextResponse.json({ error: 'Neuer Name erforderlich' }, { status: 400 });
    }

    // Ordner mit Account laden
    const folder = await prisma.emailFolder.findUnique({
      where: { id: folderId },
      include: { account: true },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Ordner nicht gefunden' }, { status: 404 });
    }

    // System-Ordner können nicht umbenannt werden
    const protectedTypes = ['inbox', 'sent', 'drafts', 'trash', 'spam'];
    if (protectedTypes.includes(folder.type)) {
      return NextResponse.json({ error: 'System-Ordner können nicht umbenannt werden' }, { status: 400 });
    }

    const account = folder.account;

    // Neuen Pfad berechnen
    const pathParts = folder.path.split('/');
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join('/');

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

      // Ordner auf IMAP-Server umbenennen
      await client.mailboxRename(folder.path, newPath);

      await client.logout();

      // Ordner in Datenbank aktualisieren
      const updatedFolder = await prisma.emailFolder.update({
        where: { id: folderId },
        data: {
          name: newName,
          path: newPath,
        },
      });

      // Unterordner-Pfade ebenfalls aktualisieren
      const subfolders = await prisma.emailFolder.findMany({
        where: {
          accountId: account.id,
          path: { startsWith: folder.path + '/' },
        },
      });

      for (const subfolder of subfolders) {
        const newSubPath = subfolder.path.replace(folder.path, newPath);
        await prisma.emailFolder.update({
          where: { id: subfolder.id },
          data: { path: newSubPath },
        });
      }

      return NextResponse.json({
        success: true,
        folder: updatedFolder,
        message: `Ordner zu "${newName}" umbenannt`,
      });
    } catch (imapError: any) {
      console.error('IMAP Rename Fehler:', imapError);
      await client.logout().catch(() => {});
      return NextResponse.json({ 
        error: 'Ordner konnte nicht umbenannt werden', 
        details: imapError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Fehler beim Umbenennen des Ordners:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// DELETE: Ordner löschen (IMAP DELETE)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 });
    }

    const folderId = params.id;

    // Ordner mit Account laden
    const folder = await prisma.emailFolder.findUnique({
      where: { id: folderId },
      include: { account: true },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Ordner nicht gefunden' }, { status: 404 });
    }

    // System-Ordner können nicht gelöscht werden
    const protectedTypes = ['inbox', 'sent', 'drafts', 'trash', 'spam'];
    if (protectedTypes.includes(folder.type)) {
      return NextResponse.json({ error: 'System-Ordner können nicht gelöscht werden' }, { status: 400 });
    }

    const account = folder.account;

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

      // Ordner auf IMAP-Server löschen
      await client.mailboxDelete(folder.path);

      await client.logout();

      // Unterordner in Datenbank löschen
      await prisma.emailFolder.deleteMany({
        where: {
          accountId: account.id,
          path: { startsWith: folder.path + '/' },
        },
      });

      // Ordner in Datenbank löschen
      await prisma.emailFolder.delete({
        where: { id: folderId },
      });

      return NextResponse.json({
        success: true,
        message: `Ordner "${folder.name}" gelöscht`,
      });
    } catch (imapError: any) {
      console.error('IMAP Delete Fehler:', imapError);
      await client.logout().catch(() => {});
      return NextResponse.json({ 
        error: 'Ordner konnte nicht gelöscht werden', 
        details: imapError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Fehler beim Löschen des Ordners:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
