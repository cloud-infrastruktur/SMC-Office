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
    const training = await prisma.training.findUnique({
      where: { id: params.id },
    });
    if (!training) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }
    return NextResponse.json(training);
  } catch (error) {
    console.error('Error fetching training:', error);
    return NextResponse.json({ error: 'Failed to fetch training' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role?.toUpperCase();
    
    if (!session || (userRole !== 'ADMIN' && userRole !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const training = await prisma.training.update({
      where: { id: params.id },
      data: {
        title: data.title,
        provider: data.provider,
        year: data.year,
        category: data.category,
        description: data.description,
        link: data.link,
        sortOrder: data.sortOrder,
        isHighlight: data.isHighlight,
      },
    });
    return NextResponse.json(training);
  } catch (error) {
    console.error('Error updating training:', error);
    return NextResponse.json({ error: 'Failed to update training' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role?.toUpperCase();
    
    if (!session || (userRole !== 'ADMIN' && userRole !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.training.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting training:', error);
    return NextResponse.json({ error: 'Failed to delete training' }, { status: 500 });
  }
}
