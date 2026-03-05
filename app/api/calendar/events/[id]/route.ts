/**
 * Single Calendar Event API
 * GET: Event-Details
 * PUT: Event aktualisieren
 * DELETE: Event löschen
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

    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: params.id,
        userId: user.id
      },
      include: {
        account: {
          select: { id: true, name: true, color: true, provider: true }
        },
        contact: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true, 
            phone: true,
            company: true 
          }
        },
        deal: {
          select: { id: true, title: true, phase: true, value: true }
        },
        project: {
          select: { id: true, projectNumber: true, title: true, status: true }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({
      event: {
        ...event,
        attendees: event.attendeesJson ? JSON.parse(event.attendeesJson) : null
      }
    });
  } catch (error: any) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden des Termins' },
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

    // Check ownership
    const existing = await prisma.calendarEvent.findFirst({
      where: { id: params.id, userId: user.id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      description,
      location,
      startDate,
      endDate,
      allDay,
      isRecurring,
      recurrenceRule,
      recurrenceEnd,
      color,
      reminderMinutes,
      isPrivate,
      status,
      contactId,
      dealId,
      projectId,
      responseStatus
    } = body;

    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (allDay !== undefined) updateData.allDay = allDay;
    if (isRecurring !== undefined) updateData.isRecurring = isRecurring;
    if (recurrenceRule !== undefined) updateData.recurrenceRule = recurrenceRule;
    if (recurrenceEnd !== undefined) updateData.recurrenceEnd = recurrenceEnd ? new Date(recurrenceEnd) : null;
    if (color !== undefined) updateData.color = color;
    if (reminderMinutes !== undefined) updateData.reminderMinutes = reminderMinutes;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
    if (status !== undefined) updateData.status = status;
    if (contactId !== undefined) updateData.contactId = contactId || null;
    if (dealId !== undefined) updateData.dealId = dealId || null;
    if (projectId !== undefined) updateData.projectId = projectId || null;
    if (responseStatus !== undefined) updateData.responseStatus = responseStatus;

    const event = await prisma.calendarEvent.update({
      where: { id: params.id },
      data: updateData,
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true }
        },
        deal: {
          select: { id: true, title: true }
        },
        project: {
          select: { id: true, title: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        start: event.startDate,
        end: event.endDate,
        allDay: event.allDay,
        color: event.color || '#3b82f6'
      }
    });
  } catch (error: any) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Termins' },
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
    const existing = await prisma.calendarEvent.findFirst({
      where: { id: params.id, userId: user.id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
    }

    await prisma.calendarEvent.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Termins' },
      { status: 500 }
    );
  }
}
