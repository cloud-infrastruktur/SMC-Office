// API Route: Paperless Documents with full filter support
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminOrManager } from '@/lib/auth';
import { getPaperlessClient } from '@/lib/paperless';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdminOrManager((session.user as { role?: string }).role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const client = await getPaperlessClient();
    if (!client) {
      return NextResponse.json({ error: 'Paperless nicht konfiguriert' }, { status: 400 });
    }

    // Parse all filter parameters from query
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '25');
    const correspondent = searchParams.get('correspondent');
    const documentType = searchParams.get('document_type');
    const tagsParam = searchParams.get('tags');
    const searchQuery = searchParams.get('search');

    // Parse tag IDs if provided
    const tagIds = tagsParam 
      ? tagsParam.split(',').map(t => parseInt(t.trim())).filter(id => !isNaN(id))
      : [];

    // Fetch documents from Paperless with all filters
    const response = await client.getDocuments({
      page,
      page_size: pageSize,
      correspondent: correspondent ? parseInt(correspondent) : undefined,
      document_type: documentType ? parseInt(documentType) : undefined,
      tags__id__all: tagIds.length > 0 ? tagIds : undefined,
      search: searchQuery || undefined,
      ordering: '-created',
    });

    // Get correspondent and document type names for enrichment
    const [correspondentsRes, docTypesRes, tagsRes] = await Promise.all([
      client.getCorrespondents(),
      client.getDocumentTypes(),
      client.getTags(),
    ]);

    const correspondentMap = new Map(correspondentsRes.results.map(c => [c.id, c.name]));
    const docTypeMap = new Map(docTypesRes.results.map(d => [d.id, d.name]));
    const tagMap = new Map(tagsRes.results.map(t => [t.id, { name: t.name, color: t.color }]));

    // Get export status from cache
    const docIds = response.results.map(d => d.id);
    const cachedDocs = docIds.length > 0 ? await prisma.paperlessDocumentCache.findMany({
      where: { documentId: { in: docIds } },
      select: {
        documentId: true,
        sevdeskId: true,
        sevdeskExportedAt: true,
        sevdeskFolderId: true,
      },
    }) : [];

    const cacheMap = new Map(cachedDocs.map(d => [d.documentId, d]));

    // Enrich documents with names and export status
    const enrichedResults = response.results.map(doc => {
      const cached = cacheMap.get(doc.id);
      return {
        id: doc.id,
        title: doc.title,
        correspondent: doc.correspondent,
        correspondentName: doc.correspondent ? correspondentMap.get(doc.correspondent) || null : null,
        document_type: doc.document_type,
        documentTypeName: doc.document_type ? docTypeMap.get(doc.document_type) || null : null,
        tags: doc.tags,
        tagNames: doc.tags.map(tid => tagMap.get(tid)?.name || '').filter(Boolean),
        created: doc.created,
        added: doc.added,
        original_file_name: doc.original_file_name,
        sevdeskId: cached?.sevdeskId || null,
        sevdeskExportedAt: cached?.sevdeskExportedAt?.toISOString() || null,
        sevdeskFolderId: cached?.sevdeskFolderId || null,
      };
    });

    // Return in the format expected by frontend (results, count)
    return NextResponse.json({
      results: enrichedResults,
      count: response.count,
      next: response.next,
      previous: response.previous,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Abrufen der Dokumente' },
      { status: 500 }
    );
  }
}
