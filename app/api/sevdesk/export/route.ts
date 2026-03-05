import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { SevdeskClient, getSevdeskFolderUrl } from '@/lib/sevdesk';
import { getPaperlessClient } from '@/lib/paperless';

export const dynamic = 'force-dynamic';

interface ExportRequest {
  documentIds: number[]; // Paperless Document IDs
  folderId: string;      // SevDesk Folder ID
}

// POST - Dokumente nach SevDesk exportieren
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string } | undefined;
    
    if (!session || user?.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentIds, folderId }: ExportRequest = await request.json();

    if (!documentIds || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'No documents selected' },
        { status: 400 }
      );
    }

    if (!folderId) {
      return NextResponse.json(
        { error: 'Target folder is required' },
        { status: 400 }
      );
    }

    // SevDesk Client holen
    const sevdeskConfig = await prisma.sevdeskConfig.findFirst({
      where: { isActive: true },
    });

    if (!sevdeskConfig) {
      return NextResponse.json(
        { error: 'SevDesk not configured' },
        { status: 400 }
      );
    }

    const sevdeskClient = new SevdeskClient(sevdeskConfig.apiToken);

    // Paperless Client holen
    const paperlessClient = await getPaperlessClient();
    if (!paperlessClient) {
      return NextResponse.json(
        { error: 'SMC-DMS not configured' },
        { status: 400 }
      );
    }

    const results: {
      documentId: number;
      title: string;
      success: boolean;
      sevdeskId?: string;
      error?: string;
      skipped?: boolean;
    }[] = [];

    for (const docId of documentIds) {
      try {
        // Prüfe ob bereits exportiert
        const cached = await prisma.paperlessDocumentCache.findUnique({
          where: { documentId: docId },
        });

        if (cached?.sevdeskId) {
          results.push({
            documentId: docId,
            title: cached.title,
            success: true,
            skipped: true,
            sevdeskId: cached.sevdeskId,
          });
          continue;
        }

        // Dokument-Details von Paperless holen
        const doc = await paperlessClient.getDocument(docId);
        
        // Dokument herunterladen
        const fileBuffer = await paperlessClient.downloadDocument(docId);
        
        // Dateiname bestimmen
        const filename = doc.original_file_name || `${doc.title}.pdf`;
        
        // Nach SevDesk hochladen
        const sevdeskDoc = await sevdeskClient.uploadDocument(
          Buffer.from(fileBuffer),
          filename,
          folderId
        );

        // Cache aktualisieren
        await prisma.paperlessDocumentCache.upsert({
          where: { documentId: docId },
          update: {
            sevdeskId: sevdeskDoc.id,
            sevdeskExportedAt: new Date(),
            sevdeskFolderId: folderId,
          },
          create: {
            documentId: docId,
            title: doc.title,
            sevdeskId: sevdeskDoc.id,
            sevdeskExportedAt: new Date(),
            sevdeskFolderId: folderId,
          },
        });

        results.push({
          documentId: docId,
          title: doc.title,
          success: true,
          sevdeskId: sevdeskDoc.id,
        });

      } catch (error) {
        console.error(`Error exporting document ${docId}:`, error);
        results.push({
          documentId: docId,
          title: `Document ${docId}`,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successful = results.filter(r => r.success && !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: documentIds.length,
        exported: successful,
        skipped,
        failed,
      },
      results,
      folderUrl: getSevdeskFolderUrl(folderId),
    });
  } catch (error) {
    console.error('Error in SevDesk export:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}
