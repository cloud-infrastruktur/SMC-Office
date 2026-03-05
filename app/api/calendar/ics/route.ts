/**
 * ICS Import/Export API
 * POST: ICS importieren (aus E-Mail oder Datei)
 * GET: Events als ICS exportieren
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { parseICS, generateICS, isMeetingInvitation, ICSEvent } from '@/lib/ics-parser';

export const dynamic = 'force-dynamic';

/**
 * Import ICS content and create events
 */
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
    const { icsContent, accountId, sourceEmailId, autoAccept } = body;

    if (!icsContent) {
      return NextResponse.json(
        { error: 'ICS-Inhalt erforderlich' },
        { status: 400 }
      );
    }

    // Parse ICS
    const parsedEvents = parseICS(icsContent);
    
    if (parsedEvents.length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen Events im ICS gefunden' },
        { status: 400 }
      );
    }

    const isInvitation = isMeetingInvitation(icsContent);
    const createdEvents: any[] = [];
    const updatedEvents: any[] = [];

    for (const icsEvent of parsedEvents) {
      // Try to find contact by organizer email
      let contactId: string | null = null;
      if (icsEvent.organizer?.email) {
        const contact = await prisma.crmContact.findFirst({
          where: { email: icsEvent.organizer.email.toLowerCase() }
        });
        contactId = contact?.id || null;
      }

      // Check if event already exists (by ICS UID)
      const existingEvent = await prisma.calendarEvent.findFirst({
        where: {
          userId: user.id,
          icsUid: icsEvent.uid
        }
      });

      const eventData = {
        title: icsEvent.summary,
        description: icsEvent.description || null,
        location: icsEvent.location || null,
        startDate: icsEvent.dtstart,
        endDate: icsEvent.dtend || null,
        allDay: icsEvent.allDay,
        isRecurring: !!icsEvent.rrule,
        recurrenceRule: icsEvent.rrule || null,
        status: icsEvent.status === 'CANCELLED' ? 'CANCELLED' as const :
                icsEvent.status === 'TENTATIVE' ? 'TENTATIVE' as const : 'CONFIRMED' as const,
        organizer: icsEvent.organizer?.email || null,
        attendeesJson: icsEvent.attendees ? JSON.stringify(icsEvent.attendees) : null,
        responseStatus: isInvitation ? (autoAccept ? 'ACCEPTED' as const : 'NEEDS_ACTION' as const) : null,
        sourceEmailId: sourceEmailId || null,
        contactId
      };

      if (existingEvent) {
        // Update existing event
        const updated = await prisma.calendarEvent.update({
          where: { id: existingEvent.id },
          data: eventData
        });
        updatedEvents.push(updated);
      } else {
        // Create new event
        const created = await prisma.calendarEvent.create({
          data: {
            userId: user.id,
            accountId: accountId || null,
            icsUid: icsEvent.uid,
            ...eventData
          }
        });
        createdEvents.push(created);
      }
    }

    return NextResponse.json({
      success: true,
      isInvitation,
      created: createdEvents.length,
      updated: updatedEvents.length,
      events: [...createdEvents, ...updatedEvents].map(e => ({
        id: e.id,
        title: e.title,
        start: e.startDate,
        end: e.endDate,
        isInvitation,
        needsResponse: e.responseStatus === 'NEEDS_ACTION'
      }))
    });
  } catch (error: any) {
    console.error('Error importing ICS:', error);
    return NextResponse.json(
      { error: 'Fehler beim Importieren der ICS-Datei' },
      { status: 500 }
    );
  }
}

/**
 * Export events as ICS
 */
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
    const eventIds = searchParams.get('ids')?.split(',');
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    const where: any = { userId: user.id };

    if (eventIds && eventIds.length > 0) {
      where.id = { in: eventIds };
    } else if (startDate && endDate) {
      where.startDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' }
    });

    // Convert to ICS format
    const icsEvents: ICSEvent[] = events.map((event: any) => ({
      uid: event.icsUid || event.id,
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      dtstart: event.startDate,
      dtend: event.endDate || undefined,
      allDay: event.allDay,
      rrule: event.recurrenceRule || undefined,
      status: event.status as 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED',
      organizer: event.organizer ? { email: event.organizer } : undefined,
      attendees: event.attendeesJson ? JSON.parse(event.attendeesJson) : undefined
    }));

    const icsContent = generateICS(icsEvents);

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="kalender.ics"'
      }
    });
  } catch (error: any) {
    console.error('Error exporting ICS:', error);
    return NextResponse.json(
      { error: 'Fehler beim Exportieren' },
      { status: 500 }
    );
  }
}
