// API Route: Paperless Correspondents
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminOrManager } from '@/lib/auth';
import { getPaperlessClient } from '@/lib/paperless';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdminOrManager((session.user as { role?: string }).role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const client = await getPaperlessClient();
    if (!client) {
      return NextResponse.json({ error: 'Paperless nicht konfiguriert' }, { status: 400 });
    }

    const correspondents = await client.getCorrespondents();
    return NextResponse.json(correspondents);
  } catch (error) {
    console.error('Error fetching correspondents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Abrufen der Korrespondenten' },
      { status: 500 }
    );
  }
}
