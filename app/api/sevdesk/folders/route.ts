import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { SevdeskClient, suggestFolderName, findMatchingFolder } from '@/lib/sevdesk';

export const dynamic = 'force-dynamic';

// GET - Unterordner des Steuervorbereitung-Ordners abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string } | undefined;
    
    if (!session || user?.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await prisma.sevdeskConfig.findFirst({
      where: { isActive: true },
    });

    if (!config) {
      return NextResponse.json(
        { error: 'SevDesk not configured' },
        { status: 400 }
      );
    }

    const client = new SevdeskClient(config.apiToken);
    const folders = await client.getSubfolders(config.parentFolderId);

    // Optional: Smart Suggest basierend auf Tag
    const tag = request.nextUrl.searchParams.get('tag');
    let suggestedFolder = null;

    if (tag) {
      const suggestions = suggestFolderName(tag);
      suggestedFolder = findMatchingFolder(folders, suggestions);
    }

    return NextResponse.json({
      folders: folders.map(f => ({
        id: f.id,
        name: f.name,
        url: `https://my.sevdesk.de/dms/folder/${f.id}`,
      })),
      suggestedFolder: suggestedFolder ? {
        id: suggestedFolder.id,
        name: suggestedFolder.name,
      } : null,
      parentFolderId: config.parentFolderId,
    });
  } catch (error) {
    console.error('Error fetching SevDesk folders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}

// POST - Neuen Ordner erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string } | undefined;
    
    if (!session || user?.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await prisma.sevdeskConfig.findFirst({
      where: { isActive: true },
    });

    if (!config) {
      return NextResponse.json(
        { error: 'SevDesk not configured' },
        { status: 400 }
      );
    }

    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    const client = new SevdeskClient(config.apiToken);
    const newFolder = await client.createFolder(name.trim(), config.parentFolderId);

    return NextResponse.json({
      success: true,
      folder: {
        id: newFolder.id,
        name: newFolder.name,
        url: `https://my.sevdesk.de/dms/folder/${newFolder.id}`,
      },
    });
  } catch (error) {
    console.error('Error creating SevDesk folder:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
