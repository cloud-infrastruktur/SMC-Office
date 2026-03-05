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
    
    const projects = await prisma.project.findMany({
      orderBy: { sortOrder: 'desc' },
      include: { 
        references: true,
        clientRef: true  // Client-Daten für Anonymisierung
      },
    });
    
    // Anonymisierung anwenden falls Benutzer keine Berechtigung hat
    const processedProjects = projects.map((project) => {
      if (showFullDetails) {
        // Volle Details anzeigen
        return {
          ...project,
          displayClient: project.clientRef?.name || project.client
        };
      } else {
        // Anonymisierte Ansicht
        return {
          ...project,
          client: project.clientRef?.anonymizedName || project.client,
          displayClient: project.clientRef?.anonymizedName || project.client
        };
      }
    });
    
    return NextResponse.json(processedProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
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
    const project = await prisma.project.create({
      data: {
        projectNumber: data.projectNumber,
        title: data.title,
        client: data.client,
        period: data.period,
        role: data.role,
        objective: data.objective,
        keyTasks: data.keyTasks || [],
        highlights: data.highlights || [],
        technologies: data.technologies || [],
        sortOrder: data.sortOrder || 0,
      },
    });
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
