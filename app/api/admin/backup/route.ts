// API Route: Database Backup (Export als JSON)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Download Database Backup (JSON Format)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role?.toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    console.log('[Backup] Starting database export...');

    // Alle Daten exportieren (außer sensible Auth-Daten)
    const backup = {
      meta: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        createdBy: (session.user as { email?: string }).email,
        type: 'full-backup',
      },
      data: {
        // Kategorien
        categories: await prisma.category.findMany(),
        
        // Projekte
        projects: await prisma.project.findMany(),
        
        // Referenzen
        references: await prisma.reference.findMany(),
        
        // Trainings
        trainings: await prisma.training.findMany(),
        
        // Kompetenzen
        competencies: await prisma.competency.findMany(),
        
        // Profil-Daten
        profileData: await prisma.profileData.findMany(),
        
        // Seiteninhalte
        pageContent: await prisma.pageContent.findMany(),
        
        // SOC Services
        socServices: await prisma.socService.findMany(),
        
        // Download-Dateien (nur Metadaten)
        downloadFiles: await prisma.downloadFile.findMany(),
        
        // Ordner
        folders: await prisma.fileFolder.findMany(),
        
        // Managed Files (nur Metadaten)
        managedFiles: await prisma.managedFile.findMany(),
        
        // SMTP Config (ohne Passwort)
        smtpConfig: await prisma.smtpConfig.findMany({
          select: {
            id: true,
            host: true,
            port: true,
            secure: true,
            username: true,
            fromEmail: true,
            fromName: true,
            contactEmail: true,
            isActive: true,
          }
        }),
        
        // Paperless Config (ohne Token)
        paperlessConfig: await prisma.paperlessConfig.findMany({
          select: {
            id: true,
            baseUrl: true,
            isActive: true,
          }
        }),
        
        // N8n Workflows
        n8nWorkflows: await prisma.n8nWorkflow.findMany(),
      },
      statistics: {
        categories: await prisma.category.count(),
        projects: await prisma.project.count(),
        references: await prisma.reference.count(),
        trainings: await prisma.training.count(),
        competencies: await prisma.competency.count(),
      }
    };

    console.log('[Backup] Export completed successfully');

    // Als Download zurückgeben
    const filename = `smc-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Backup] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Backup fehlgeschlagen' },
      { status: 500 }
    );
  }
}

// POST: Restore from Backup
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role?.toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const backup = await request.json();

    if (!backup?.meta?.version || !backup?.data) {
      return NextResponse.json({ error: 'Ungültiges Backup-Format' }, { status: 400 });
    }

    console.log('[Restore] Starting database restore from backup...');
    console.log(`[Restore] Backup version: ${backup.meta.version}, created: ${backup.meta.createdAt}`);

    const results: Record<string, number> = {};

    // Kategorien wiederherstellen (upsert)
    if (backup.data.categories) {
      for (const cat of backup.data.categories) {
        await prisma.category.upsert({
          where: { slug: cat.slug },
          update: cat,
          create: cat,
        });
      }
      results.categories = backup.data.categories.length;
    }

    // Kompetenzen wiederherstellen
    if (backup.data.competencies) {
      for (const comp of backup.data.competencies) {
        await prisma.competency.upsert({
          where: { slug: comp.slug },
          update: comp,
          create: comp,
        });
      }
      results.competencies = backup.data.competencies.length;
    }

    // Profil-Daten wiederherstellen
    if (backup.data.profileData) {
      for (const item of backup.data.profileData) {
        await prisma.profileData.upsert({
          where: { key: item.key },
          update: item,
          create: item,
        });
      }
      results.profileData = backup.data.profileData.length;
    }

    // Seiteninhalte wiederherstellen
    if (backup.data.pageContent) {
      for (const content of backup.data.pageContent) {
        await prisma.pageContent.upsert({
          where: { page_section: { page: content.page, section: content.section } },
          update: content,
          create: content,
        });
      }
      results.pageContent = backup.data.pageContent.length;
    }

    // SOC Services wiederherstellen
    if (backup.data.socServices) {
      for (const service of backup.data.socServices) {
        await prisma.socService.upsert({
          where: { slug: service.slug },
          update: service,
          create: service,
        });
      }
      results.socServices = backup.data.socServices.length;
    }

    // Ordner wiederherstellen
    if (backup.data.folders) {
      for (const folder of backup.data.folders) {
        await prisma.fileFolder.upsert({
          where: { slug: folder.slug },
          update: folder,
          create: folder,
        });
      }
      results.folders = backup.data.folders.length;
    }

    console.log('[Restore] Restore completed:', results);

    return NextResponse.json({
      success: true,
      message: 'Wiederherstellung erfolgreich',
      restored: results,
    });
  } catch (error) {
    console.error('[Restore] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Wiederherstellung fehlgeschlagen' },
      { status: 500 }
    );
  }
}
