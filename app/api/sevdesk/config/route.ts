import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { SevdeskClient, saveSevdeskConfig } from '@/lib/sevdesk';

export const dynamic = 'force-dynamic';

// GET - Abrufen der SevDesk Konfiguration
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string } | undefined;
    
    if (!session || user?.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await prisma.sevdeskConfig.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        parentFolderId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Token wird aus Sicherheitsgründen nicht zurückgegeben
      },
    });

    // Prüfe Verbindung wenn Config existiert
    let isConnected = false;
    if (config) {
      const fullConfig = await prisma.sevdeskConfig.findFirst({
        where: { isActive: true },
      });
      if (fullConfig) {
        const client = new SevdeskClient(fullConfig.apiToken);
        isConnected = await client.checkConnection();
      }
    }

    return NextResponse.json({
      configured: !!config,
      connected: isConnected,
      config: config ? {
        parentFolderId: config.parentFolderId,
        updatedAt: config.updatedAt,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching SevDesk config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

// POST - Speichern der SevDesk Konfiguration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string } | undefined;
    
    if (!session || user?.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apiToken, parentFolderId } = await request.json();

    if (!apiToken) {
      return NextResponse.json(
        { error: 'API Token is required' },
        { status: 400 }
      );
    }

    // Teste Verbindung vor dem Speichern
    const client = new SevdeskClient(apiToken);
    const isConnected = await client.checkConnection();

    if (!isConnected) {
      return NextResponse.json(
        { error: 'Could not connect to SevDesk. Please check your API token.' },
        { status: 400 }
      );
    }

    // Speichern
    await saveSevdeskConfig(apiToken, parentFolderId || '22128948');

    return NextResponse.json({
      success: true,
      message: 'SevDesk configuration saved successfully',
    });
  } catch (error) {
    console.error('Error saving SevDesk config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
