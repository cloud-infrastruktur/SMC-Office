// API Route: Single Paperless Document
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminOrManager } from '@/lib/auth';
import { getPaperlessClient } from '@/lib/paperless';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdminOrManager((session.user as { role?: string }).role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const client = await getPaperlessClient();
    if (!client) {
      return NextResponse.json({ error: 'Paperless nicht konfiguriert' }, { status: 400 });
    }

    const documentId = parseInt(params.id);
    if (isNaN(documentId)) {
      return NextResponse.json({ error: 'Ungültige Dokument-ID' }, { status: 400 });
    }

    const document = await client.getDocument(documentId);
    return NextResponse.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Abrufen des Dokuments' },
      { status: 500 }
    );
  }
}
