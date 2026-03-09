import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { hasAdminAccess, isAdmin } from '@/lib/types';
import { hash } from 'bcryptjs';

export const dynamic = 'force-dynamic';

// GET - Alle Benutzer abrufen
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      orderBy: [{ role: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        organizationRole: true,
        organization: {
          select: { id: true, name: true, displayName: true }
        },
        notes: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        permissions: {
          select: { area: true },
        },
        crmContact: {
          select: { id: true, firstName: true, lastName: true }
        },
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Benutzer' }, { status: 500 });
  }
}

// POST - Neuen Benutzer erstellen
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    // Nur Admin kann neue Benutzer erstellen
    if (!session || !isAdmin(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const data = await req.json();
    const { name, email, password, role, organizationId, organizationRole, notes, isActive, permissions } = data;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      );
    }

    // Prüfen ob E-Mail bereits existiert
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Ein Benutzer mit dieser E-Mail existiert bereits' },
        { status: 400 }
      );
    }

    // Passwort hashen
    const hashedPassword = await hash(password, 12);

    // Benutzer erstellen
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        role: role || 'USER',
        organizationId: organizationId || null,
        organizationRole: organizationRole || null,
        notes: notes || null,
        isActive: isActive !== false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        organizationRole: true,
        organization: {
          select: { id: true, name: true, displayName: true }
        },
        isActive: true,
        createdAt: true,
      },
    });

    // Berechtigungen hinzufügen
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      await prisma.userPermission.createMany({
        data: permissions.map((area: string) => ({
          userId: user.id,
          area: area as 'PROFILE' | 'REFERENCES' | 'TRAININGS' | 'FILES',
        })),
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Benutzers' }, { status: 500 });
  }
}
