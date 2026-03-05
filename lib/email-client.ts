/**
 * E-Mail Client Bibliothek
 * Unterstützt IMAP für Empfang und SMTP für Versand
 */

import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';
import nodemailer from 'nodemailer';
import { prisma } from './db';

// Types
export interface EmailAccountConfig {
  id?: string;
  name: string;
  email: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string;
  imapPassword: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
}

export interface FolderInfo {
  name: string;
  path: string;
  type: string;
  unreadCount: number;
  totalCount: number;
}

export interface EmailMessage {
  uid: number;
  messageId: string | null;
  subject: string;
  fromAddress: string;
  fromName: string | null;
  toAddresses: string[];
  ccAddresses: string[];
  date: Date | null;
  snippet: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
}

export interface EmailContent {
  textBody: string | null;
  htmlBody: string | null;
  attachments: {
    filename: string;
    contentType: string;
    size: number;
    contentId?: string;
    content?: Buffer;
  }[];
}

export interface SendEmailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }[];
}

// Folder type mapping
const FOLDER_TYPE_MAP: Record<string, string> = {
  'INBOX': 'inbox',
  'Sent': 'sent',
  'Sent Messages': 'sent',
  'Sent Items': 'sent',
  'Gesendet': 'sent',
  'Drafts': 'drafts',
  'Entwürfe': 'drafts',
  'Trash': 'trash',
  'Deleted': 'trash',
  'Deleted Items': 'trash',
  'Papierkorb': 'trash',
  'Archive': 'archive',
  'Archiv': 'archive',
  'Spam': 'spam',
  'Junk': 'spam',
  'Junk E-Mail': 'spam',
};

/**
 * Bestimmt den Ordner-Typ basierend auf dem Namen
 */
function determineFolderType(name: string, path: string): string {
  // Check for exact matches first
  if (FOLDER_TYPE_MAP[name]) return FOLDER_TYPE_MAP[name];
  if (FOLDER_TYPE_MAP[path]) return FOLDER_TYPE_MAP[path];
  
  // Check for partial matches (case-insensitive)
  const lowerName = name.toLowerCase();
  if (lowerName.includes('inbox')) return 'inbox';
  if (lowerName.includes('sent') || lowerName.includes('gesendet')) return 'sent';
  if (lowerName.includes('draft') || lowerName.includes('entwurf') || lowerName.includes('entwürfe')) return 'drafts';
  if (lowerName.includes('trash') || lowerName.includes('deleted') || lowerName.includes('papierkorb')) return 'trash';
  if (lowerName.includes('archive') || lowerName.includes('archiv')) return 'archive';
  if (lowerName.includes('spam') || lowerName.includes('junk')) return 'spam';
  
  return 'custom';
}

/**
 * Erstellt einen IMAP-Client
 */
export function createImapClient(config: EmailAccountConfig): ImapFlow {
  return new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: config.imapSecure,
    auth: {
      user: config.imapUser,
      pass: config.imapPassword,
    },
    logger: false, // Deaktiviere Logging in Produktion
  });
}

/**
 * Erstellt einen SMTP-Transporter
 */
export function createSmtpTransporter(config: EmailAccountConfig) {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPassword,
    },
  });
}

/**
 * Testet die IMAP-Verbindung
 */
export async function testImapConnection(config: EmailAccountConfig): Promise<{ success: boolean; error?: string }> {
  const client = createImapClient(config);
  try {
    await client.connect();
    await client.logout();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Verbindung fehlgeschlagen' };
  }
}

/**
 * Testet die SMTP-Verbindung
 */
export async function testSmtpConnection(config: EmailAccountConfig): Promise<{ success: boolean; error?: string }> {
  const transporter = createSmtpTransporter(config);
  try {
    await transporter.verify();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Verbindung fehlgeschlagen' };
  }
}

/**
 * Holt alle Ordner eines Kontos
 */
export async function fetchFolders(config: EmailAccountConfig): Promise<FolderInfo[]> {
  const client = createImapClient(config);
  const folders: FolderInfo[] = [];
  
  try {
    await client.connect();
    
    const mailboxes = await client.list();
    
    for (const mailbox of mailboxes) {
      // Ignoriere nicht auswählbare Ordner
      if (mailbox.flags.has('\\Noselect')) continue;
      
      const name = mailbox.name;
      const path = mailbox.path;
      const type = determineFolderType(name, path);
      
      // Hole Status für Unread Count
      let unreadCount = 0;
      let totalCount = 0;
      
      try {
        const status = await client.status(path, { messages: true, unseen: true });
        unreadCount = status.unseen || 0;
        totalCount = status.messages || 0;
      } catch (e) {
        // Ignoriere Fehler beim Status-Abruf
      }
      
      folders.push({
        name,
        path,
        type,
        unreadCount,
        totalCount,
      });
    }
    
    await client.logout();
  } catch (error) {
    console.error('[EmailClient] Error fetching folders:', error);
    throw error;
  }
  
  return folders;
}

/**
 * Holt E-Mails aus einem Ordner
 */
export async function fetchMessages(
  config: EmailAccountConfig,
  folderPath: string,
  options: {
    limit?: number;
    offset?: number;
    search?: string;
  } = {}
): Promise<EmailMessage[]> {
  const client = createImapClient(config);
  const messages: EmailMessage[] = [];
  const { limit = 50, offset = 0, search } = options;
  
  try {
    await client.connect();
    
    const lock = await client.getMailboxLock(folderPath);
    
    try {
      // Suche nach UIDs
      let searchQuery: any = { all: true };
      
      if (search) {
        searchQuery = {
          or: [
            { subject: search },
            { from: search },
            { body: search },
          ],
        };
      }
      
      const searchResult = await client.search(searchQuery, { uid: true });
      
      // Handle empty result (no messages found)
      if (!searchResult || !Array.isArray(searchResult) || searchResult.length === 0) {
        return [];
      }
      
      const uids = searchResult;
      
      // Sortiere absteigend (neueste zuerst) und paginiere
      const sortedUids = uids.sort((a: number, b: number) => b - a);
      const paginatedUids = sortedUids.slice(offset, offset + limit);
      
      if (paginatedUids.length === 0) {
        return [];
      }
      
      // Hole Nachrichten
      for await (const msg of client.fetch(paginatedUids, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
      }, { uid: true })) {
        const envelope = msg.envelope;
        const flags = msg.flags;
        
        if (!envelope) continue;
        
        messages.push({
          uid: msg.uid,
          messageId: envelope.messageId || null,
          subject: envelope.subject || '(Kein Betreff)',
          fromAddress: envelope.from?.[0]?.address || '',
          fromName: envelope.from?.[0]?.name || null,
          toAddresses: envelope.to?.map((t: any) => t.address).filter(Boolean) || [],
          ccAddresses: envelope.cc?.map((c: any) => c.address).filter(Boolean) || [],
          date: envelope.date || null,
          snippet: '', // Wird später gefüllt
          isRead: flags?.has('\\Seen') || false,
          isStarred: flags?.has('\\Flagged') || false,
          hasAttachments: hasAttachments(msg.bodyStructure),
        });
      }
    } finally {
      lock.release();
    }
    
    await client.logout();
  } catch (error) {
    console.error('[EmailClient] Error fetching messages:', error);
    throw error;
  }
  
  // Sortiere nach Datum absteigend (neueste zuerst)
  messages.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });
  
  return messages;
}

/**
 * Prüft ob eine Nachricht Anhänge hat
 */
function hasAttachments(structure: any): boolean {
  if (!structure) return false;
  
  if (structure.disposition === 'attachment') return true;
  
  if (structure.childNodes) {
    for (const child of structure.childNodes) {
      if (hasAttachments(child)) return true;
    }
  }
  
  return false;
}

/**
 * Holt den vollständigen Inhalt einer E-Mail
 */
export async function fetchMessageContent(
  config: EmailAccountConfig,
  folderPath: string,
  uid: number
): Promise<EmailContent> {
  const client = createImapClient(config);
  
  try {
    await client.connect();
    
    const lock = await client.getMailboxLock(folderPath);
    
    try {
      // Hole die vollständige Nachricht
      const source = await client.download(uid.toString(), undefined, { uid: true });
      
      if (!source || !source.content) {
        throw new Error('Nachricht nicht gefunden');
      }
      
      // Parse die Nachricht
      const chunks: Buffer[] = [];
      for await (const chunk of source.content) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const parsed = await simpleParser(buffer);
      
      // Extrahiere Anhänge
      const attachments = (parsed.attachments || []).map((att: Attachment) => ({
        filename: att.filename || 'attachment',
        contentType: att.contentType,
        size: att.size,
        contentId: att.contentId,
        content: att.content,
      }));
      
      return {
        textBody: parsed.text || null,
        htmlBody: parsed.html || null,
        attachments,
      };
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch (e) {
      // Ignoriere Logout-Fehler
    }
  }
}

/**
 * Markiert eine Nachricht als gelesen/ungelesen
 */
export async function setMessageFlags(
  config: EmailAccountConfig,
  folderPath: string,
  uid: number,
  flags: { read?: boolean; starred?: boolean }
): Promise<void> {
  const client = createImapClient(config);
  
  try {
    await client.connect();
    
    const lock = await client.getMailboxLock(folderPath);
    
    try {
      if (flags.read !== undefined) {
        if (flags.read) {
          await client.messageFlagsAdd(uid.toString(), ['\\Seen'], { uid: true });
        } else {
          await client.messageFlagsRemove(uid.toString(), ['\\Seen'], { uid: true });
        }
      }
      
      if (flags.starred !== undefined) {
        if (flags.starred) {
          await client.messageFlagsAdd(uid.toString(), ['\\Flagged'], { uid: true });
        } else {
          await client.messageFlagsRemove(uid.toString(), ['\\Flagged'], { uid: true });
        }
      }
    } finally {
      lock.release();
    }
    
    await client.logout();
  } catch (error) {
    console.error('[EmailClient] Error setting flags:', error);
    throw error;
  }
}

/**
 * Löscht eine Nachricht (verschiebt in Papierkorb)
 */
export async function deleteMessage(
  config: EmailAccountConfig,
  folderPath: string,
  uid: number,
  trashPath?: string
): Promise<void> {
  const client = createImapClient(config);
  
  try {
    await client.connect();
    
    const lock = await client.getMailboxLock(folderPath);
    
    try {
      if (trashPath && trashPath !== folderPath) {
        // Verschiebe in Papierkorb
        await client.messageMove(uid.toString(), trashPath, { uid: true });
      } else {
        // Markiere als gelöscht und expunge
        await client.messageFlagsAdd(uid.toString(), ['\\Deleted'], { uid: true });
        await client.messageDelete(uid.toString(), { uid: true });
      }
    } finally {
      lock.release();
    }
    
    await client.logout();
  } catch (error) {
    console.error('[EmailClient] Error deleting message:', error);
    throw error;
  }
}

/**
 * Verschiebt eine Nachricht in einen anderen Ordner
 */
export async function moveMessage(
  config: EmailAccountConfig,
  sourceFolderPath: string,
  uid: number,
  targetFolderPath: string
): Promise<void> {
  const client = createImapClient(config);
  
  try {
    await client.connect();
    
    const lock = await client.getMailboxLock(sourceFolderPath);
    
    try {
      await client.messageMove(uid.toString(), targetFolderPath, { uid: true });
    } finally {
      lock.release();
    }
    
    await client.logout();
  } catch (error) {
    console.error('[EmailClient] Error moving message:', error);
    throw error;
  }
}

/**
 * Sendet eine E-Mail via SMTP
 */
export async function sendEmail(
  config: EmailAccountConfig,
  options: SendEmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const transporter = createSmtpTransporter(config);
  
  try {
    const result = await transporter.sendMail({
      from: `"${config.name}" <${config.email}>`,
      to: options.to.join(', '),
      cc: options.cc?.join(', '),
      bcc: options.bcc?.join(', '),
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    });
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Senden fehlgeschlagen' };
  }
}

/**
 * Synchronisiert Ordner eines Kontos mit der Datenbank
 */
export async function syncFolders(accountId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
    });
    
    if (!account) {
      return { success: false, error: 'Konto nicht gefunden' };
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
    
    const folders = await fetchFolders(config);
    
    // Upsert alle Ordner
    for (const folder of folders) {
      await prisma.emailFolder.upsert({
        where: {
          accountId_path: {
            accountId: account.id,
            path: folder.path,
          },
        },
        create: {
          accountId: account.id,
          name: folder.name,
          path: folder.path,
          type: folder.type,
          unreadCount: folder.unreadCount,
          totalCount: folder.totalCount,
        },
        update: {
          name: folder.name,
          type: folder.type,
          unreadCount: folder.unreadCount,
          totalCount: folder.totalCount,
        },
      });
    }
    
    // Update lastSync
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: { lastSync: new Date(), syncError: null },
    });
    
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Synchronisation fehlgeschlagen';
    
    // Update sync error
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: { syncError: errorMsg },
    }).catch(() => {});
    
    return { success: false, error: errorMsg };
  }
}

/**
 * Erstellt ein Zitat für Antworten/Weiterleitungen
 */
export function createQuote(
  originalFrom: string,
  originalDate: Date | null,
  originalContent: string,
  isForward: boolean = false
): string {
  const dateStr = originalDate
    ? originalDate.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  
  if (isForward) {
    return `\n\n-------- Weitergeleitete Nachricht --------\nVon: ${originalFrom}\nDatum: ${dateStr}\n\n${originalContent}`;
  }
  
  return `\n\nAm ${dateStr} schrieb ${originalFrom}:\n\n> ${originalContent.split('\n').join('\n> ')}`;
}
