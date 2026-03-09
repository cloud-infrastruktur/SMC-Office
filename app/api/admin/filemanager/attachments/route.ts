/**
 * File Attachments API
 * Verknüpft Dateien mit CRM-Entitäten (Kontakte, Deals, Projekte)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { hasAdminAccess } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Erlaubte Entity-Typen
const ALLOWED_ENTITY_TYPES = ['CrmContact', 'CrmDeal', 'CrmProject', 'Note', 'CalendarEvent'];

// GET: Attachments für eine Entity abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const fileId = searchParams.get('fileId');

    // Attachments für eine spezifische Datei abrufen
    if (fileId) {
      const attachments = await prisma.fileAttachment.findMany({
        where: { fileId },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(attachments);
    }

    // Attachments für eine Entity abrufen
    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType und entityId sind erforderlich' },
        { status: 400 }
      );
    }

    if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
      return NextResponse.json(
        { error: 'Ungültiger entityType' },
        { status: 400 }
      );
    }

    const attachments = await prisma.fileAttachment.findMany({
      where: { entityType, entityId },
      include: {
        file: {
          select: {
            id: true,
            fileName: true,
            displayName: true,
            mimeType: true,
            fileSize: true,
            uploadedAt: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Anhänge' },
      { status: 500 }
    );
  }
}

// POST: Neue Verknüpfung erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const { fileId, entityType, entityId, sortOrder } = body;

    if (!fileId || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'fileId, entityType und entityId sind erforderlich' },
        { status: 400 }
      );
    }

    if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
      return NextResponse.json(
        { error: 'Ungültiger entityType' },
        { status: 400 }
      );
    }

    // Prüfen ob Datei existiert
    const file = await prisma.managedFile.findUnique({ where: { id: fileId } });
    if (!file) {
      return NextResponse.json(
        { error: 'Datei nicht gefunden' },
        { status: 404 }
      );
    }

    // Prüfen ob Entity existiert (je nach Typ)
    let entityExists = false;
    switch (entityType) {
      case 'CrmContact':
        entityExists = !!(await prisma.crmContact.findUnique({ where: { id: entityId } }));
        break;
      case 'CrmDeal':
        entityExists = !!(await prisma.crmDeal.findUnique({ where: { id: entityId } }));
        break;
      case 'CrmProject':
        entityExists = !!(await prisma.crmProject.findUnique({ where: { id: entityId } }));
        break;
      case 'Note':
        entityExists = !!(await prisma.note.findUnique({ where: { id: entityId } }));
        break;
      case 'CalendarEvent':
        entityExists = !!(await prisma.calendarEvent.findUnique({ where: { id: entityId } }));
        break;
    }

    if (!entityExists) {
      return NextResponse.json(
        { error: 'Ziel-Entity nicht gefunden' },
        { status: 404 }
      );
    }

    // Prüfen ob Verknüpfung bereits existiert
    const existing = await prisma.fileAttachment.findUnique({
      where: {
        fileId_entityType_entityId: { fileId, entityType, entityId }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Diese Verknüpfung existiert bereits' },
        { status: 409 }
      );
    }

    const attachment = await prisma.fileAttachment.create({
      data: {
        fileId,
        entityType,
        entityId,
        sortOrder: sortOrder || 0,
      },
      include: {
        file: {
          select: {
            id: true,
            fileName: true,
            displayName: true,
            mimeType: true,
            fileSize: true,
          },
        },
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Error creating attachment:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Verknüpfung' },
      { status: 500 }
    );
  }
}

// DELETE: Verknüpfung löschen
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const fileId = searchParams.get('fileId');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    // Löschen über ID
    if (id) {
      await prisma.fileAttachment.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // Löschen über Kombination
    if (fileId && entityType && entityId) {
      await prisma.fileAttachment.delete({
        where: {
          fileId_entityType_entityId: { fileId, entityType, entityId }
        }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'id oder fileId+entityType+entityId erforderlich' },
      { status: 400 }
    );
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Verknüpfung nicht gefunden' }, { status: 404 });
    }
    console.error('Error deleting attachment:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Verknüpfung' },
      { status: 500 }
    );
  }
}
