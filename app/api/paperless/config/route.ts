// API Route: Paperless Configuration
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { isAdminOrManager } from '@/lib/auth';
import { PaperlessClient } from '@/lib/paperless';

export const dynamic = 'force-dynamic';

// GET: Retrieve current Paperless config
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdminOrManager((session.user as { role?: string }).role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const config = await prisma.paperlessConfig.findFirst({
      where: { isActive: true },
    });

    if (!config) {
      return NextResponse.json({ configured: false });
    }

    // Don't expose full API token
    return NextResponse.json({
      configured: true,
      baseUrl: config.baseUrl,
      tokenMasked: config.apiToken.substring(0, 8) + '***',
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching Paperless config:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

// POST: Save Paperless config
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdminOrManager((session.user as { role?: string }).role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { baseUrl, apiToken, testConnection } = await request.json();

    if (!baseUrl || !apiToken) {
      return NextResponse.json({ error: 'URL und API-Token erforderlich' }, { status: 400 });
    }

    // Test connection if requested
    if (testConnection) {
      const client = new PaperlessClient(baseUrl, apiToken);
      const isConnected = await client.checkConnection();
      if (!isConnected) {
        return NextResponse.json({ error: 'Verbindung fehlgeschlagen. Bitte URL und Token überprüfen.' }, { status: 400 });
      }
    }

    // Deactivate all existing configs
    await prisma.paperlessConfig.updateMany({
      data: { isActive: false },
    });

    // Create new active config
    const config = await prisma.paperlessConfig.create({
      data: {
        baseUrl: baseUrl.replace(/\/$/, ''),
        apiToken,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Konfiguration gespeichert',
      baseUrl: config.baseUrl,
    });
  } catch (error) {
    console.error('Error saving Paperless config:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

// DELETE: Remove Paperless config
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdminOrManager((session.user as { role?: string }).role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    await prisma.paperlessConfig.deleteMany({});

    return NextResponse.json({ success: true, message: 'Konfiguration gelöscht' });
  } catch (error) {
    console.error('Error deleting Paperless config:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
