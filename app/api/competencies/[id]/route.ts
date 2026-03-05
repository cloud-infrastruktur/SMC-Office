import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const competency = await prisma.competency.findUnique({
      where: { id: params.id },
    });
    if (!competency) {
      return NextResponse.json({ error: 'Competency not found' }, { status: 404 });
    }
    return NextResponse.json(competency);
  } catch (error) {
    console.error('Error fetching competency:', error);
    return NextResponse.json({ error: 'Failed to fetch competency' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Nicht autorisiert',
        details: 'Sie müssen als Administrator angemeldet sein.'
      }, { status: 401 });
    }

    const data = await request.json();
    const competency = await prisma.competency.update({
      where: { id: params.id },
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        icon: data.icon,
        category: data.category,
        sortOrder: data.sortOrder,
      },
    });
    return NextResponse.json(competency);
  } catch (error: any) {
    console.error('Error updating competency:', error);
    
    // Detaillierte Fehlerausgabe
    let errorMessage = 'Fehler beim Aktualisieren der Kompetenz';
    let errorDetails = '';
    
    if (error.code === 'P2025') {
      errorMessage = 'Kompetenz nicht gefunden';
      errorDetails = 'Die zu aktualisierende Kompetenz existiert nicht.';
    } else if (error.code === 'P2002') {
      errorMessage = 'Slug bereits vergeben';
      errorDetails = 'Eine andere Kompetenz verwendet diesen Slug bereits.';
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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.competency.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting competency:', error);
    return NextResponse.json({ error: 'Failed to delete competency' }, { status: 500 });
  }
}
