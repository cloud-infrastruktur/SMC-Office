/**
 * E-Mail CRM Link API
 * Verknüpft E-Mails mit CRM-Kontakten, Deals und Projekten
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { hasAdminAccess } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET: CRM-Verknüpfungen für eine E-Mail abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const fromAddress = searchParams.get('fromAddress');

    if (!messageId && !fromAddress) {
      return NextResponse.json(
        { error: 'messageId oder fromAddress erforderlich' },
        { status: 400 }
      );
    }

    // Kontakte basierend auf E-Mail-Adresse finden
    let contacts: any[] = [];
    if (fromAddress) {
      const cleanEmail = fromAddress.toLowerCase().trim();
      contacts = await prisma.crmContact.findMany({
        where: {
          OR: [
            { email: { equals: cleanEmail, mode: 'insensitive' } },
            { email: { contains: cleanEmail, mode: 'insensitive' } },
          ],
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          company: true,
          organization: { select: { id: true, name: true } },
        },
        take: 5,
      });
    }

    // Wenn messageId vorhanden, auch verknüpfte Deals laden
    let linkedDeals: any[] = [];
    if (messageId) {
      const message = await prisma.emailMessage.findUnique({
        where: { id: messageId },
        include: {
          crmDeals: {
            select: { id: true, title: true, phase: true, value: true },
          },
        },
      });
      if (message) {
        linkedDeals = message.crmDeals;
      }
    }

    return NextResponse.json({
      contacts,
      linkedDeals,
      suggestedLinks: contacts.length > 0,
    });
  } catch (error) {
    console.error('Error fetching CRM links:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der CRM-Verknüpfungen' },
      { status: 500 }
    );
  }
}

// POST: E-Mail mit Deal verknüpfen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    if (!session || !hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, dealId, action } = body;

    if (!messageId || !dealId) {
      return NextResponse.json(
        { error: 'messageId und dealId sind erforderlich' },
        { status: 400 }
      );
    }

    // Prüfen ob Message existiert
    const message = await prisma.emailMessage.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      return NextResponse.json({ error: 'E-Mail nicht gefunden' }, { status: 404 });
    }

    // Prüfen ob Deal existiert
    const deal = await prisma.crmDeal.findUnique({
      where: { id: dealId },
    });
    if (!deal) {
      return NextResponse.json({ error: 'Deal nicht gefunden' }, { status: 404 });
    }

    if (action === 'unlink') {
      // Verknüpfung entfernen
      await prisma.crmDeal.update({
        where: { id: dealId },
        data: {
          sourceEmailId: deal.sourceEmailId === messageId ? null : deal.sourceEmailId,
        },
      });
    } else {
      // Verknüpfung erstellen
      await prisma.crmDeal.update({
        where: { id: dealId },
        data: { sourceEmailId: messageId },
      });

      // Activity loggen
      await prisma.crmActivity.create({
        data: {
          type: 'EMAIL',
          title: 'E-Mail verknüpft',
          description: `E-Mail "${message.subject}" wurde mit Deal verknüpft`,
          dealId,
          createdById: (session.user as any).id,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error linking email to CRM:', error);
    return NextResponse.json(
      { error: 'Fehler beim Verknüpfen' },
      { status: 500 }
    );
  }
}
