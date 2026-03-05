import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const competencies = await prisma.competency.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(competencies);
  } catch (error) {
    console.error('Error fetching competencies:', error);
    return NextResponse.json({ error: 'Failed to fetch competencies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Nicht autorisiert',
        details: 'Sie müssen als Administrator angemeldet sein.'
      }, { status: 401 });
    }

    const data = await request.json();
    const competency = await prisma.competency.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        icon: data.icon,
        category: data.category,
        sortOrder: data.sortOrder || 0,
      },
    });
    return NextResponse.json(competency);
  } catch (error: any) {
    console.error('Error creating competency:', error);
    
    // Detaillierte Fehlerausgabe
    let errorMessage = 'Fehler beim Erstellen der Kompetenz';
    let errorDetails = '';
    
    if (error.code === 'P2002') {
      errorMessage = 'Slug bereits vergeben';
      errorDetails = 'Eine Kompetenz mit diesem Slug existiert bereits. Bitte wählen Sie einen anderen Slug.';
    } else if (error.message && error.message.includes('does not exist')) {
      errorMessage = 'Datenbank-Schema fehlt';
      errorDetails = 'Die Tabelle "Competency" existiert nicht. Bitte führen Sie die Datenbank-Migrationen aus: yarn prisma migrate deploy';
    } else if (error.message) {
      errorDetails = error.message;
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails
    }, { status: 500 });
  }
}
