import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const profileData = await prisma.profileData.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return NextResponse.json({ error: 'Failed to fetch profile data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Upsert - update if exists, create if not
    const profileData = await prisma.profileData.upsert({
      where: { key: data.key },
      update: {
        value: data.value,
        category: data.category,
        sortOrder: data.sortOrder || 0,
      },
      create: {
        key: data.key,
        value: data.value,
        category: data.category,
        sortOrder: data.sortOrder || 0,
      },
    });
    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Error saving profile data:', error);
    return NextResponse.json({ error: 'Failed to save profile data' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Nicht autorisiert',
        details: 'Sie müssen als Administrator angemeldet sein.'
      }, { status: 401 });
    }

    const dataArray = await request.json();
    
    // Batch update multiple profile entries
    const results = await Promise.all(
      dataArray.map((item: { key: string; value: string; category: string; sortOrder?: number }) =>
        prisma.profileData.upsert({
          where: { key: item.key },
          update: {
            value: item.value,
            category: item.category,
            sortOrder: item.sortOrder || 0,
          },
          create: {
            key: item.key,
            value: item.value,
            category: item.category,
            sortOrder: item.sortOrder || 0,
          },
        })
      )
    );
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error updating profile data:', error);
    
    // Detaillierte Fehlerausgabe
    let errorMessage = 'Fehler beim Speichern der Profildaten';
    let errorDetails = '';
    
    if (error.code === 'P2002') {
      errorMessage = 'Daten-Konflikt';
      errorDetails = 'Ein Eintrag mit diesem Schlüssel existiert bereits.';
    } else if (error.code === 'P2003') {
      errorMessage = 'Datenbank-Beziehungsfehler';
      errorDetails = 'Referenzierte Daten existieren nicht.';
    } else if (error.code === 'P2025') {
      errorMessage = 'Eintrag nicht gefunden';
      errorDetails = 'Der zu aktualisierende Eintrag existiert nicht.';
    } else if (error.message && error.message.includes('does not exist')) {
      errorMessage = 'Datenbank-Schema fehlt';
      errorDetails = 'Die Tabelle "ProfileData" existiert nicht. Bitte führen Sie die Datenbank-Migrationen aus: yarn prisma migrate deploy';
    } else if (error.message) {
      errorDetails = error.message;
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails
    }, { status: 500 });
  }
}
