import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canViewFullClientDetails } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Session prüfen für Rollen-basierte Anonymisierung
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    const showFullDetails = canViewFullClientDetails(userRole);
    
    const references = await prisma.reference.findMany({
      orderBy: { sortOrder: 'desc' },
      include: { 
        project: true,
        clientRef: true  // Client-Daten für Anonymisierung
      },
    });
    
    // Anonymisierung anwenden falls Benutzer keine Berechtigung hat
    const processedReferences = references.map((ref) => {
      if (showFullDetails) {
        // Volle Details anzeigen
        return {
          ...ref,
          displayClient: ref.clientRef?.name || ref.client
        };
      } else {
        // Anonymisierte Ansicht
        return {
          ...ref,
          client: ref.clientRef?.anonymizedName || ref.client,
          displayClient: ref.clientRef?.anonymizedName || ref.client
        };
      }
    });
    
    return NextResponse.json(processedReferences);
  } catch (error) {
    console.error('Error fetching references:', error);
    return NextResponse.json({ error: 'Failed to fetch references' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role?.toUpperCase();
    
    if (!session || (userRole !== 'ADMIN' && userRole !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const reference = await prisma.reference.create({
      data: {
        client: data.client,
        period: data.period,
        role: data.role,
        focus: data.focus,
        industry: data.industry,
        sortOrder: data.sortOrder || 0,
        projectId: data.projectId || null,
      },
    });
    return NextResponse.json(reference);
  } catch (error) {
    console.error('Error creating reference:', error);
    return NextResponse.json({ error: 'Failed to create reference' }, { status: 500 });
  }
}
