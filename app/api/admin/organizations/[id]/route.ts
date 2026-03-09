import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { hasAdminAccess, isAdmin } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET - Einzelne Organisation abrufen
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, organizationRole: true }
        },
        contacts: {
          select: { id: true, firstName: true, lastName: true, email: true, position: true }
        }
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organisation nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Organisation' }, { status: 500 });
  }
}

// PUT - Organisation aktualisieren
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !isAdmin(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();
    const { name, displayName, industry, website, email, phone, address, city, postalCode, country, description, logoUrl, isActive, sortOrder } = data;

    // Name-Eindeutigkeit prüfen (falls geändert)
    if (name) {
      const existing = await prisma.organization.findFirst({
        where: { name, NOT: { id } }
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Eine Organisation mit diesem Namen existiert bereits' },
          { status: 400 }
        );
      }
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...(name && { name }),
        displayName: displayName ?? undefined,
        industry: industry ?? undefined,
        website: website ?? undefined,
        email: email ?? undefined,
        phone: phone ?? undefined,
        address: address ?? undefined,
        city: city ?? undefined,
        postalCode: postalCode ?? undefined,
        country: country ?? undefined,
        description: description ?? undefined,
        logoUrl: logoUrl ?? undefined,
        isActive: isActive ?? undefined,
        sortOrder: sortOrder ?? undefined,
      },
      include: {
        _count: {
          select: { users: true, contacts: true }
        }
      }
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Organisation' }, { status: 500 });
  }
}

// DELETE - Organisation löschen
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !isAdmin(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;

    // Prüfen ob Benutzer oder Kontakte verknüpft sind
    const org = await prisma.organization.findUnique({
      where: { id },
      include: { _count: { select: { users: true, contacts: true } } }
    });

    if (!org) {
      return NextResponse.json({ error: 'Organisation nicht gefunden' }, { status: 404 });
    }

    if (org._count.users > 0 || org._count.contacts > 0) {
      return NextResponse.json(
        { error: `Organisation kann nicht gelöscht werden: ${org._count.users} Benutzer und ${org._count.contacts} Kontakte verknüpft` },
        { status: 400 }
      );
    }

    await prisma.organization.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen der Organisation' }, { status: 500 });
  }
}
