import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { hasAdminAccess, isAdmin } from '@/lib/types';
import { hash } from 'bcryptjs';

export const dynamic = 'force-dynamic';

// GET - Einzelnen Benutzer abrufen
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
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organization: true,
        notes: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        permissions: { select: { area: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Fehler beim Laden des Benutzers' }, { status: 500 });
  }
}

// PUT - Benutzer aktualisieren
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
    const { name, email, password, role, organization, notes, isActive, permissions } = data;

    // Manager kann keine Admins bearbeiten
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    
    if (targetUser.role === 'ADMIN' && !isAdmin(userRole)) {
      return NextResponse.json({ error: 'Nur Admins können Admin-Benutzer bearbeiten' }, { status: 403 });
    }

    // Prüfen ob E-Mail bereits verwendet wird (von anderem Benutzer)
    if (email && email !== targetUser.email) {
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Diese E-Mail wird bereits verwendet' },
          { status: 400 }
        );
      }
    }

    // Update-Daten vorbereiten
    const updateData: {
      name?: string | null;
      email?: string;
      password?: string;
      role?: 'USER' | 'CONSULTANT' | 'CUSTOMER_REF' | 'MANAGER' | 'ADMIN';
      organization?: string | null;
      notes?: string | null;
      isActive?: boolean;
    } = {
      name: name || null,
      organization: organization || null,
      notes: notes || null,
    };

    if (email) updateData.email = email;
    if (role && isAdmin(userRole)) updateData.role = role; // Nur Admin kann Rolle ändern
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Passwort nur wenn angegeben
    if (password && password.length > 0) {
      updateData.password = await hash(password, 12);
    }

    // Benutzer aktualisieren
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organization: true,
        isActive: true,
      },
    });

    // Berechtigungen aktualisieren
    if (permissions !== undefined && Array.isArray(permissions)) {
      // Alte Berechtigungen löschen
      await prisma.userPermission.deleteMany({ where: { userId: id } });
      
      // Neue Berechtigungen hinzufügen
      if (permissions.length > 0) {
        await prisma.userPermission.createMany({
          data: permissions.map((area: string) => ({
            userId: id,
            area: area as 'PROFILE' | 'REFERENCES' | 'TRAININGS' | 'FILES',
          })),
        });
      }
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Benutzers' }, { status: 500 });
  }
}

// DELETE - Benutzer löschen
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    const userId = (session?.user as { id?: string })?.id;
    
    // Nur Admin kann Benutzer löschen
    if (!session || !isAdmin(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;

    // Kann sich nicht selbst löschen
    if (id === userId) {
      return NextResponse.json(
        { error: 'Sie können sich nicht selbst löschen' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    // Benutzer löschen (Cascade löscht auch Berechtigungen)
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen des Benutzers' }, { status: 500 });
  }
}
