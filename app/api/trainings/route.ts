import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const trainings = await prisma.training.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(trainings);
  } catch (error) {
    console.error('Error fetching trainings:', error);
    return NextResponse.json({ error: 'Failed to fetch trainings' }, { status: 500 });
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
    const training = await prisma.training.create({
      data: {
        title: data.title,
        provider: data.provider || null,
        year: data.year || null,
        category: data.category,
        description: data.description || null,
        link: data.link || null,
        sortOrder: data.sortOrder || 0,
        isHighlight: data.isHighlight || false,
      },
    });
    return NextResponse.json(training);
  } catch (error) {
    console.error('Error creating training:', error);
    return NextResponse.json({ error: 'Failed to create training' }, { status: 500 });
  }
}
