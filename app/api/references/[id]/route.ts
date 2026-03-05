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
    const reference = await prisma.reference.findUnique({
      where: { id: params.id },
      include: { project: true },
    });
    if (!reference) {
      return NextResponse.json({ error: 'Reference not found' }, { status: 404 });
    }
    return NextResponse.json(reference);
  } catch (error) {
    console.error('Error fetching reference:', error);
    return NextResponse.json({ error: 'Failed to fetch reference' }, { status: 500 });
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
    const reference = await prisma.reference.update({
      where: { id: params.id },
      data: {
        client: data.client,
        period: data.period,
        role: data.role,
        focus: data.focus,
        industry: data.industry,
        sortOrder: data.sortOrder,
        projectId: data.projectId || null,
      },
    });
    return NextResponse.json(reference);
  } catch (error) {
    console.error('Error updating reference:', error);
    return NextResponse.json({ error: 'Failed to update reference' }, { status: 500 });
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

    await prisma.reference.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reference:', error);
    return NextResponse.json({ error: 'Failed to delete reference' }, { status: 500 });
  }
}
