import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { hasAdminAccess } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET - Einzelnen Kunden abrufen
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: { select: { id: true, title: true, period: true } },
        references: { select: { id: true, period: true, role: true } },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: 'Fehler beim Laden des Kunden' }, { status: 500 });
  }
}

// PUT - Kunden aktualisieren
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();
    const { name, anonymizedName, industry, description, sortOrder } = data;

    if (!name || !anonymizedName || !industry) {
      return NextResponse.json(
        { error: 'Name, anonymisierter Name und Branche sind erforderlich' },
        { status: 400 }
      );
    }

    // Prüfen ob anderer Kunde mit diesem Namen existiert
    const existing = await prisma.client.findFirst({
      where: { name, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Ein anderer Kunde mit diesem Namen existiert bereits' },
        { status: 400 }
      );
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        name,
        anonymizedName,
        industry,
        description: description || null,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Kunden' }, { status: 500 });
  }
}

// DELETE - Kunden löschen
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;

    // Prüfen ob Kunde noch verknüpft ist
    const client = await prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { projects: true, references: true } } },
    });

    if (!client) {
      return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 404 });
    }

    if (client._count.projects > 0 || client._count.references > 0) {
      return NextResponse.json(
        { 
          error: `Kunde kann nicht gelöscht werden (${client._count.projects} Projekte, ${client._count.references} Referenzen verknüpft)` 
        },
        { status: 400 }
      );
    }

    await prisma.client.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen des Kunden' }, { status: 500 });
  }
}
