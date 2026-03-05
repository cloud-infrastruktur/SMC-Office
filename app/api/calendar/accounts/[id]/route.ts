/**
 * Single Calendar Account API
 * GET: Account-Details
 * PUT: Account aktualisieren
 * DELETE: Account löschen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const account = await prisma.calendarAccount.findFirst({
      where: {
        id: params.id,
        userId: user.id
      },
      select: {
        id: true,
        name: true,
        provider: true,
        caldavUrl: true,
        username: true,
        color: true,
        isActive: true,
        lastSync: true,
        syncError: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { events: true }
        }
      }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ account });
  } catch (error: any) {
    console.error('Error fetching calendar account:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden des Accounts' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const body = await request.json();
    const { name, color, isActive, caldavUrl, username, password } = body;

    // Check ownership
    const existing = await prisma.calendarAccount.findFirst({
      where: { id: params.id, userId: user.id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Account nicht gefunden' }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (caldavUrl !== undefined) updateData.caldavUrl = caldavUrl;
    if (username !== undefined) updateData.username = username;
    if (password !== undefined) updateData.password = password; // TODO: Encrypt

    const account = await prisma.calendarAccount.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        provider: account.provider,
        color: account.color,
        isActive: account.isActive
      }
    });
  } catch (error: any) {
    console.error('Error updating calendar account:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Accounts' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    // Check ownership
    const existing = await prisma.calendarAccount.findFirst({
      where: { id: params.id, userId: user.id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Account nicht gefunden' }, { status: 404 });
    }

    // Delete account (cascades to events)
    await prisma.calendarAccount.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting calendar account:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Accounts' },
      { status: 500 }
    );
  }
}
