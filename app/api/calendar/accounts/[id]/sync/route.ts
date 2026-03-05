/**
 * Calendar Sync API
 * POST: Synchronisiere Events vom CalDAV-Server
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createCalDAVClient } from '@/lib/caldav';
import { CalendarProvider } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
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
      }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account nicht gefunden' }, { status: 404 });
    }

    // LOCAL provider doesn't sync
    if (account.provider === 'LOCAL') {
      return NextResponse.json({
        success: true,
        message: 'Lokaler Kalender benötigt keine Synchronisation',
        synced: 0
      });
    }

    // Need credentials for CalDAV sync
    if (!account.username || !account.password) {
      return NextResponse.json(
        { error: 'Anmeldedaten fehlen für Synchronisation' },
        { status: 400 }
      );
    }

    const client = createCalDAVClient(
      account.provider as 'APPLE' | 'NEXTCLOUD' | 'GOOGLE' | 'CALDAV_GENERIC',
      {
        username: account.username,
        password: account.password,
        serverUrl: account.caldavUrl || undefined
      }
    );

    // Get date range for sync (3 months back, 12 months forward)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 12);

    // Discover calendars first
    const calendars = await client.discoverCalendars();
    
    if (calendars.length === 0) {
      await prisma.calendarAccount.update({
        where: { id: account.id },
        data: {
          lastSync: new Date(),
          syncError: 'Keine Kalender gefunden'
        }
      });
      return NextResponse.json(
        { error: 'Keine Kalender gefunden' },
        { status: 404 }
      );
    }

    let totalSynced = 0;
    const errors: string[] = [];

    // Sync each calendar
    for (const calendar of calendars) {
      try {
        const events = await client.getEvents(calendar.href, startDate, endDate);
        
        for (const event of events) {
          // Upsert event by externalId
          await prisma.calendarEvent.upsert({
            where: {
              id: event.data.uid // Use UID as ID lookup
            },
            create: {
              userId: user.id,
              accountId: account.id,
              externalId: event.data.uid,
              title: event.data.summary,
              description: event.data.description,
              location: event.data.location,
              startDate: event.data.dtstart,
              endDate: event.data.dtend,
              allDay: event.data.allDay,
              isRecurring: !!event.data.rrule,
              recurrenceRule: event.data.rrule,
              status: event.data.status === 'CANCELLED' ? 'CANCELLED' : 
                      event.data.status === 'TENTATIVE' ? 'TENTATIVE' : 'CONFIRMED',
              organizer: event.data.organizer?.email,
              attendeesJson: event.data.attendees ? JSON.stringify(event.data.attendees) : null
            },
            update: {
              title: event.data.summary,
              description: event.data.description,
              location: event.data.location,
              startDate: event.data.dtstart,
              endDate: event.data.dtend,
              allDay: event.data.allDay,
              isRecurring: !!event.data.rrule,
              recurrenceRule: event.data.rrule,
              status: event.data.status === 'CANCELLED' ? 'CANCELLED' : 
                      event.data.status === 'TENTATIVE' ? 'TENTATIVE' : 'CONFIRMED',
              organizer: event.data.organizer?.email,
              attendeesJson: event.data.attendees ? JSON.stringify(event.data.attendees) : null
            }
          });
          totalSynced++;
        }
      } catch (calError: any) {
        errors.push(`${calendar.displayName}: ${calError.message}`);
      }
    }

    // Update sync status
    await prisma.calendarAccount.update({
      where: { id: account.id },
      data: {
        lastSync: new Date(),
        syncError: errors.length > 0 ? errors.join('; ') : null
      }
    });

    return NextResponse.json({
      success: true,
      synced: totalSynced,
      calendars: calendars.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Error syncing calendar:', error);
    
    // Update sync error
    if (params.id) {
      await prisma.calendarAccount.update({
        where: { id: params.id },
        data: {
          syncError: error.message || 'Synchronisationsfehler'
        }
      }).catch(() => {});
    }

    return NextResponse.json(
      { error: 'Fehler bei der Synchronisation' },
      { status: 500 }
    );
  }
}
