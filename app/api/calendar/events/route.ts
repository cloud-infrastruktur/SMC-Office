/**
 * Calendar Events API
 * GET: Liste Events mit Filterung
 * POST: Neues Event erstellen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const accountId = searchParams.get('accountId');
    const contactId = searchParams.get('contactId');
    const dealId = searchParams.get('dealId');
    const projectId = searchParams.get('projectId');
    const view = searchParams.get('view'); // day, week, month, agenda

    // Build where clause
    const where: any = { userId: user.id };

    if (startDate && endDate) {
      where.startDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    } else if (startDate) {
      where.startDate = { gte: new Date(startDate) };
    } else if (endDate) {
      where.startDate = { lte: new Date(endDate) };
    }

    if (accountId) where.accountId = accountId;
    if (contactId) where.contactId = contactId;
    if (dealId) where.dealId = dealId;
    if (projectId) where.projectId = projectId;

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        account: {
          select: { id: true, name: true, color: true }
        },
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true, company: true }
        },
        deal: {
          select: { id: true, title: true, phase: true }
        },
        project: {
          select: { id: true, projectNumber: true, title: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    // Transform events for frontend
    const transformedEvents = events.map((event: any) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      start: event.startDate,
      end: event.endDate,
      allDay: event.allDay,
      color: event.color || event.account?.color || '#3b82f6',
      isRecurring: event.isRecurring,
      recurrenceRule: event.recurrenceRule,
      status: event.status,
      reminderMinutes: event.reminderMinutes,
      isPrivate: event.isPrivate,
      // CRM Links
      contact: event.contact,
      deal: event.deal,
      project: event.project,
      // Meeting info
      organizer: event.organizer,
      attendees: event.attendeesJson ? JSON.parse(event.attendeesJson) : null,
      responseStatus: event.responseStatus,
      // Meta
      accountId: event.accountId,
      accountName: event.account?.name
    }));

    return NextResponse.json({ events: transformedEvents });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Termine' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
      accountId,
      contactId,
      dealId,
      projectId
    } = body;

    if (!title || !startDate) {
      return NextResponse.json(
        { error: 'Titel und Startdatum sind erforderlich' },
        { status: 400 }
      );
    }

    // Validate account ownership if provided
    if (accountId) {
      const account = await prisma.calendarAccount.findFirst({
        where: { id: accountId, userId: user.id }
      });
      if (!account) {
        return NextResponse.json(
          { error: 'Kalender-Account nicht gefunden' },
          { status: 404 }
        );
      }
    }

    // Generate ICS UID
    const icsUid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@smc-crm`;

    const event = await prisma.calendarEvent.create({
      data: {
        userId: user.id,
        accountId: accountId || null,
        icsUid,
        title,
        description: description || null,
        location: location || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        allDay: allDay || false,
        isRecurring: isRecurring || false,
        recurrenceRule: recurrenceRule || null,
        recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : null,
        color: color || null,
        reminderMinutes: reminderMinutes || null,
        isPrivate: isPrivate || false,
        contactId: contactId || null,
        dealId: dealId || null,
        projectId: projectId || null,
        organizer: session.user.email,
        status: 'CONFIRMED'
      },
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
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Termins' },
      { status: 500 }
    );
  }
}
