import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { ImapFlow } from 'imapflow';

export const dynamic = 'force-dynamic';

interface ImapMailbox {
  path: string;
  name: string;
  delimiter: string;
  flags: Set<string>;
  specialUse?: string;
  listed: boolean;
  subscribed: boolean;
}

// Ordnertyp basierend auf IMAP Special-Use oder Name ermitteln
function getFolderType(mailbox: ImapMailbox): string {
  if (mailbox.specialUse) {
    const specialUseMap: Record<string, string> = {
      '\\Inbox': 'inbox',
      '\\Sent': 'sent',
      '\\Drafts': 'drafts',
      '\\Trash': 'trash',
      '\\Junk': 'spam',
      '\\Archive': 'archive',
      '\\All': 'all',
      '\\Flagged': 'starred',
    };
    return specialUseMap[mailbox.specialUse] || 'custom';
  }
  
  // Fallback: Name-basierte Erkennung
  const pathLower = mailbox.path.toLowerCase();
  if (pathLower === 'inbox') return 'inbox';
  if (pathLower.includes('sent') || pathLower.includes('gesendet')) return 'sent';
  if (pathLower.includes('draft') || pathLower.includes('entwürf')) return 'drafts';
  if (pathLower.includes('trash') || pathLower.includes('papierkorb') || pathLower.includes('deleted')) return 'trash';
  if (pathLower.includes('spam') || pathLower.includes('junk')) return 'spam';
  if (pathLower.includes('archive') || pathLower.includes('archiv')) return 'archive';
  
  return 'custom';
}

// GET: Alle Ordner synchronisieren (inkl. Unterordner)
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
      include: { folders: true },
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

      // Alle Ordner abrufen (LIST "" "*" für vollständige Hierarchie)
      const mailboxList = await client.list();
      const mailboxes: ImapMailbox[] = mailboxList as unknown as ImapMailbox[];

      await client.logout();

      // Ordner in der Datenbank synchronisieren
      const existingFolders = account.folders;
      const existingPaths = new Set(existingFolders.map(f => f.path));
      const remotePaths = new Set(mailboxes.map(m => m.path));

      // Neue Ordner erstellen
      const newFolders = mailboxes.filter(m => !existingPaths.has(m.path));
      for (const mailbox of newFolders) {
        await prisma.emailFolder.create({
          data: {
            accountId: account.id,
            name: mailbox.name,
            path: mailbox.path,
            type: getFolderType(mailbox),
            sortOrder: getSortOrder(getFolderType(mailbox)),
          },
        });
      }

      // Gelöschte Ordner entfernen
      const deletedFolders = existingFolders.filter(f => !remotePaths.has(f.path));
      for (const folder of deletedFolders) {
        await prisma.emailFolder.delete({
          where: { id: folder.id },
        });
      }

      // Aktualisierte Ordnerliste laden
      const updatedFolders = await prisma.emailFolder.findMany({
        where: { accountId: account.id },
        orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      });

      // Ordner als Baum strukturieren
      const folderTree = buildFolderTree(updatedFolders);

      return NextResponse.json({
        success: true,
        synced: newFolders.length,
        deleted: deletedFolders.length,
        total: updatedFolders.length,
        folders: updatedFolders,
        tree: folderTree,
      });
    } catch (imapError: any) {
      console.error('IMAP Sync Fehler:', imapError);
      await client.logout().catch(() => {});
      return NextResponse.json({ 
        error: 'IMAP-Verbindung fehlgeschlagen', 
        details: imapError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Fehler beim Ordner-Sync:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// POST: Neuen Ordner erstellen (IMAP CREATE)
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

    const { accountId, folderName, parentPath } = await request.json();

    if (!accountId || !folderName) {
      return NextResponse.json({ error: 'Account-ID und Ordnername erforderlich' }, { status: 400 });
    }

    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 });
    }

    // Vollständiger Pfad für den neuen Ordner
    const fullPath = parentPath ? `${parentPath}/${folderName}` : folderName;

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

      // Ordner auf IMAP-Server erstellen
      await client.mailboxCreate(fullPath);

      await client.logout();

      // Ordner in Datenbank speichern
      const newFolder = await prisma.emailFolder.create({
        data: {
          accountId: account.id,
          name: folderName,
          path: fullPath,
          type: 'custom',
          sortOrder: 100,
        },
      });

      return NextResponse.json({
        success: true,
        folder: newFolder,
        message: `Ordner "${folderName}" erstellt`,
      });
    } catch (imapError: any) {
      console.error('IMAP Create Fehler:', imapError);
      await client.logout().catch(() => {});
      return NextResponse.json({ 
        error: 'Ordner konnte nicht erstellt werden', 
        details: imapError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Fehler beim Erstellen des Ordners:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// Hilfsfunktionen
function getSortOrder(type: string): number {
  const order: Record<string, number> = {
    inbox: 1,
    drafts: 2,
    sent: 3,
    starred: 4,
    archive: 5,
    spam: 6,
    trash: 7,
    custom: 10,
  };
  return order[type] || 10;
}

interface FolderNode {
  id: string;
  name: string;
  path: string;
  type: string;
  children: FolderNode[];
}

function buildFolderTree(folders: any[]): FolderNode[] {
  const tree: FolderNode[] = [];
  const folderMap = new Map<string, FolderNode>();

  // Alle Ordner als Nodes erstellen
  folders.forEach(folder => {
    folderMap.set(folder.path, {
      id: folder.id,
      name: folder.name,
      path: folder.path,
      type: folder.type,
      children: [],
    });
  });

  // Hierarchie aufbauen
  folders.forEach(folder => {
    const node = folderMap.get(folder.path)!;
    const parentPath = folder.path.substring(0, folder.path.lastIndexOf('/'));
    
    if (parentPath && folderMap.has(parentPath)) {
      folderMap.get(parentPath)!.children.push(node);
    } else {
      tree.push(node);
    }
  });

  return tree;
}
