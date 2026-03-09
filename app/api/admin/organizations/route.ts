import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { hasAdminAccess, isAdmin } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET - Alle Organisationen abrufen
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const organizations = await prisma.organization.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { users: true, contacts: true }
        }
      }
    });

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Organisationen' }, { status: 500 });
  }
}

// POST - Neue Organisation erstellen
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !isAdmin(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const data = await req.json();
    const { name, displayName, industry, website, email, phone, address, city, postalCode, country, description, logoUrl, isActive, sortOrder } = data;

    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
    }

    // Prüfen ob Name bereits existiert
    const existing = await prisma.organization.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: 'Eine Organisation mit diesem Namen existiert bereits' },
        { status: 400 }
      );
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        displayName: displayName || null,
        industry: industry || null,
        website: website || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        postalCode: postalCode || null,
        country: country || 'Deutschland',
        description: description || null,
        logoUrl: logoUrl || null,
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
      },
      include: {
        _count: {
          select: { users: true, contacts: true }
        }
      }
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der Organisation' }, { status: 500 });
  }
}
