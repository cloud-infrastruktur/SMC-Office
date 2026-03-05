// API Route: E-Mail senden
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { sendEmail, createQuote, fetchMessageContent, EmailAccountConfig } from '@/lib/email-client';

export const dynamic = 'force-dynamic';

// POST: E-Mail senden
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Handle FormData for attachment support
    const formData = await request.formData();
    
    const accountId = formData.get('accountId') as string;
    const to = JSON.parse(formData.get('to') as string || '[]');
    const cc = JSON.parse(formData.get('cc') as string || '[]');
    const bcc = JSON.parse(formData.get('bcc') as string || '[]');
    const subject = formData.get('subject') as string;
    const text = formData.get('text') as string;
    const html = formData.get('html') as string | null;
    const replyToUid = formData.get('replyToUid') ? parseInt(formData.get('replyToUid') as string) : undefined;
    const replyToFolderPath = formData.get('replyToFolderPath') as string | null;
    const isForward = formData.get('isForward') === 'true';
    const originalFrom = formData.get('originalFrom') as string | null;
    const originalDate = formData.get('originalDate') as string | null;
    
    // Extract attachments
    const attachmentFiles = formData.getAll('attachments') as File[];

    // Validierung
    if (!accountId || !to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'accountId und Empfänger erforderlich' }, { status: 400 });
    }

    if (!subject) {
      return NextResponse.json({ error: 'Betreff erforderlich' }, { status: 400 });
    }

    if (!text && !html) {
      return NextResponse.json({ error: 'Nachrichtentext erforderlich' }, { status: 400 });
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

    // Bei Antwort/Weiterleitung: Zitat erstellen
    let finalText = text;
    let finalHtml = html;

    if (replyToUid && replyToFolderPath && (originalFrom || originalDate)) {
      try {
        const originalContent = await fetchMessageContent(config, replyToFolderPath, replyToUid);
        const originalText = originalContent.textBody || '';
        
        const quote = createQuote(
          originalFrom || 'Unbekannt',
          originalDate ? new Date(originalDate) : null,
          originalText,
          isForward || false
        );
        
        finalText = text + quote;
        
        if (html) {
          const quoteHtml = quote.replace(/\n/g, '<br>');
          finalHtml = html + `<div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc;">${quoteHtml}</div>`;
        }
      } catch (error) {
        console.error('[EmailSend] Failed to create quote:', error);
        // Fahre ohne Zitat fort
      }
    }

    // Process attachments
    const attachments: { filename: string; content: Buffer; contentType?: string }[] = [];
    for (const file of attachmentFiles) {
      if (file instanceof File && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        attachments.push({
          filename: file.name,
          content: Buffer.from(arrayBuffer),
          contentType: file.type || 'application/octet-stream',
        });
      }
    }

    const result = await sendEmail(config, {
      to,
      cc: cc || [],
      bcc: bcc || [],
      subject,
      text: finalText,
      html: finalHtml || undefined,
      replyTo: replyToUid && originalFrom ? originalFrom : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Senden fehlgeschlagen' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('[EmailSend] POST Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Senden' },
      { status: 500 }
    );
  }
}
