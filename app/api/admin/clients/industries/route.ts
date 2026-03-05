import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { isAdminOrManager } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET - Alle Branchen-Kategorien abrufen
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !isAdminOrManager(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    
    const industries = await prisma.industryCategory.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    
    return NextResponse.json(industries);
  } catch (error) {
    console.error('Fehler beim Abrufen der Branchen:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// POST - Neue Branche anlegen
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !isAdminOrManager(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    
    const data = await request.json();
    
    if (!data.name) {
      return NextResponse.json(
        { error: 'Name ist erforderlich' },
        { status: 400 }
      );
    }
    
    const industry = await prisma.industryCategory.create({
      data: {
        name: data.name,
        description: data.description || null,
        sortOrder: data.sortOrder || 0
      }
    });
    
    return NextResponse.json(industry, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Anlegen der Branche:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
