// API Route: Paperless Document Thumbnail
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
      return new NextResponse('Nicht autorisiert', { status: 403 });
    }

    const client = await getPaperlessClient();
    if (!client) {
      return new NextResponse('Paperless nicht konfiguriert', { status: 400 });
    }

    const documentId = parseInt(params.id);
    if (isNaN(documentId)) {
      return new NextResponse('Ungültige Dokument-ID', { status: 400 });
    }

    const thumbnail = await client.getDocumentThumbnail(documentId);
    
    return new NextResponse(thumbnail, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching thumbnail:', error);
    return new NextResponse('Fehler beim Laden des Thumbnails', { status: 500 });
  }
}
