/**
 * Meeting Response API
 * POST: Antwort auf Meeting-Einladung senden
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { generateReply, parseICS } from '@/lib/ics-parser';

export const dynamic = 'force-dynamic';

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
    const { eventId, icsContent, response } = body;

    if (!response || !['ACCEPTED', 'DECLINED', 'TENTATIVE'].includes(response)) {
      return NextResponse.json(
        { error: 'Ungültige Antwort' },
        { status: 400 }
      );
    }

    // If eventId provided, update event in database
    if (eventId) {
      const event = await prisma.calendarEvent.findFirst({
        where: { id: eventId, userId: user.id }
      });

      if (event) {
        await prisma.calendarEvent.update({
          where: { id: eventId },
          data: { responseStatus: response }
        });
      }
    }

    // If ICS content provided, generate reply ICS
    let replyIcs: string | null = null;
    
    if (icsContent) {
      const events = parseICS(icsContent);
      if (events.length > 0) {
        replyIcs = generateReply(
          events[0],
          session.user.email,
          session.user.name || '',
          response
        );

        // If we have the event in DB, update it
        const existingEvent = await prisma.calendarEvent.findFirst({
          where: {
            userId: user.id,
            icsUid: events[0].uid
          }
        });

        if (existingEvent) {
          await prisma.calendarEvent.update({
            where: { id: existingEvent.id },
            data: { responseStatus: response }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      response,
      replyIcs // Can be used to send email reply
    });
  } catch (error: any) {
    console.error('Error responding to meeting:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Antwort' },
      { status: 500 }
    );
  }
}
