import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { canViewCustomerReferences } from '@/lib/types';
import { getFileBuffer, isLocalStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// Download eines Referenz-PDFs (nur für berechtigte Benutzer)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string })?.role;
    
    // Nur berechtigte Rollen dürfen PDFs herunterladen
    if (!session || !canViewCustomerReferences(userRole)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;
    
    // Referenz mit PDF-Daten laden
    const reference = await prisma.reference.findUnique({
      where: { id },
      select: {
        id: true,
        client: true,
        pdfFileName: true,
        pdfStoragePath: true,
      },
    });

    if (!reference) {
      return NextResponse.json({ error: 'Referenz nicht gefunden' }, { status: 404 });
    }

    if (!reference.pdfStoragePath || !reference.pdfFileName) {
      return NextResponse.json({ error: 'Kein PDF verfügbar' }, { status: 404 });
    }

    // PDF herunterladen
    if (isLocalStorage()) {
      const buffer = await getFileBuffer(reference.pdfStoragePath);
      
      if (!buffer) {
        return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 });
      }

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${reference.pdfFileName}"`,
          'Content-Length': buffer.length.toString(),
        },
      });
    } else {
      // S3 Storage - signierte URL zurückgeben
      const { getFileUrl } = await import('@/lib/storage');
      const url = await getFileUrl(reference.pdfStoragePath, false); // private files
      return NextResponse.json({ url, fileName: reference.pdfFileName });
    }
  } catch (error) {
    console.error('Error downloading reference PDF:', error);
    return NextResponse.json({ error: 'Fehler beim Download' }, { status: 500 });
  }
}
