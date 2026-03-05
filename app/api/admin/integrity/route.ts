// API Route: Data Integrity Check
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { isAbsolutePath, normalizeStoragePath } from '@/lib/storage';

export const dynamic = 'force-dynamic';

interface OrphanedRecord {
  id: string;
  title: string;
  type: 'project' | 'training' | 'reference';
  invalidCategoryId: string | null;
}

interface AbsolutePathRecord {
  id: string;
  fileName: string;
  type: 'downloadFile';
  absolutePath: string;
}

interface CategorySelect {
  id: string;
}

interface ProjectSelect {
  id: string;
  title: string;
  categoryId: string | null;
}

interface TrainingSelect {
  id: string;
  title: string;
  categoryId: string | null;
}

interface ReferenceSelect {
  id: string;
  client: string;
  categoryId: string | null;
}

interface DownloadFileSelect {
  id: string;
  fileName: string;
  cloudStoragePath: string;
}

// GET: Check data integrity
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Alle gültigen Kategorie-IDs holen
    const categories = await prisma.category.findMany({ select: { id: true } });
    const validCategoryIds = categories.map((c: CategorySelect) => c.id);

    const orphanedRecords: OrphanedRecord[] = [];

    // Projekte mit ungültiger Kategorie
    const orphanedProjects = await prisma.project.findMany({
      where: {
        categoryId: { not: null },
        NOT: { categoryId: { in: validCategoryIds } }
      },
      select: { id: true, title: true, categoryId: true }
    });
    orphanedProjects.forEach((p: ProjectSelect) => {
      orphanedRecords.push({ id: p.id, title: p.title, type: 'project', invalidCategoryId: p.categoryId });
    });

    // Trainings mit ungültiger Kategorie
    const orphanedTrainings = await prisma.training.findMany({
      where: {
        categoryId: { not: null },
        NOT: { categoryId: { in: validCategoryIds } }
      },
      select: { id: true, title: true, categoryId: true }
    });
    orphanedTrainings.forEach((t: TrainingSelect) => {
      orphanedRecords.push({ id: t.id, title: t.title, type: 'training', invalidCategoryId: t.categoryId });
    });

    // Referenzen mit ungültiger Kategorie
    const orphanedReferences = await prisma.reference.findMany({
      where: {
        categoryId: { not: null },
        NOT: { categoryId: { in: validCategoryIds } }
      },
      select: { id: true, client: true, categoryId: true }
    });
    orphanedReferences.forEach((r: ReferenceSelect) => {
      orphanedRecords.push({ id: r.id, title: r.client, type: 'reference', invalidCategoryId: r.categoryId });
    });

    // Projekte ohne Kategorie (Warnung)
    const uncategorizedProjects = await prisma.project.count({ where: { categoryId: null } });
    const uncategorizedTrainings = await prisma.training.count({ where: { categoryId: null } });
    const uncategorizedReferences = await prisma.reference.count({ where: { categoryId: null } });

    // Prüfe auf absolute Pfade (Entwicklungsumgebungs-Altlasten)
    const absolutePathRecords: AbsolutePathRecord[] = [];
    
    // DownloadFiles mit absoluten Pfaden
    const downloadFiles = await prisma.downloadFile.findMany({
      select: { id: true, fileName: true, cloudStoragePath: true }
    });
    downloadFiles.forEach((f: DownloadFileSelect) => {
      if (isAbsolutePath(f.cloudStoragePath)) {
        absolutePathRecords.push({
          id: f.id,
          fileName: f.fileName,
          type: 'downloadFile',
          absolutePath: f.cloudStoragePath
        });
      }
    });

    // Statistiken
    const stats = {
      totalProjects: await prisma.project.count(),
      totalTrainings: await prisma.training.count(),
      totalReferences: await prisma.reference.count(),
      totalCategories: await prisma.category.count(),
      totalDownloadFiles: downloadFiles.length,
      orphanedCount: orphanedRecords.length,
      absolutePathCount: absolutePathRecords.length,
      uncategorized: {
        projects: uncategorizedProjects,
        trainings: uncategorizedTrainings,
        references: uncategorizedReferences,
      },
    };

    return NextResponse.json({
      healthy: orphanedRecords.length === 0 && absolutePathRecords.length === 0,
      orphanedRecords,
      absolutePathRecords,
      stats,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Integrity] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Prüfung fehlgeschlagen' },
      { status: 500 }
    );
  }
}

// POST: Fix orphaned records and absolute paths
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({})) as { fixType?: string };
    const fixType = body.fixType || 'all'; // 'orphaned', 'paths', 'all'

    const results = {
      orphaned: { projects: 0, trainings: 0, references: 0 },
      paths: { downloadFiles: 0 },
    };

    // Verwaiste Datensätze reparieren
    if (fixType === 'orphaned' || fixType === 'all') {
      const categories = await prisma.category.findMany({ select: { id: true } });
      const validCategoryIds = categories.map((c: CategorySelect) => c.id);

      const projectsFixed = await prisma.project.updateMany({
        where: {
          categoryId: { not: null },
          NOT: { categoryId: { in: validCategoryIds } }
        },
        data: { categoryId: null }
      });

      const trainingsFixed = await prisma.training.updateMany({
        where: {
          categoryId: { not: null },
          NOT: { categoryId: { in: validCategoryIds } }
        },
        data: { categoryId: null }
      });

      const referencesFixed = await prisma.reference.updateMany({
        where: {
          categoryId: { not: null },
          NOT: { categoryId: { in: validCategoryIds } }
        },
        data: { categoryId: null }
      });

      results.orphaned = {
        projects: projectsFixed.count,
        trainings: trainingsFixed.count,
        references: referencesFixed.count,
      };
    }

    // Absolute Pfade normalisieren
    if (fixType === 'paths' || fixType === 'all') {
      const downloadFiles = await prisma.downloadFile.findMany({
        where: { cloudStoragePath: { startsWith: '/' } },
        select: { id: true, cloudStoragePath: true }
      });

      for (const file of downloadFiles) {
        const normalizedPath = normalizeStoragePath(file.cloudStoragePath);
        if (normalizedPath && normalizedPath !== file.cloudStoragePath) {
          await prisma.downloadFile.update({
            where: { id: file.id },
            data: { cloudStoragePath: normalizedPath }
          });
          results.paths.downloadFiles++;
        }
      }
    }

    const totalFixed = 
      results.orphaned.projects + 
      results.orphaned.trainings + 
      results.orphaned.references +
      results.paths.downloadFiles;

    return NextResponse.json({
      success: true,
      message: `${totalFixed} Datensätze repariert`,
      fixed: results,
    });
  } catch (error) {
    console.error('[Integrity Fix] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reparatur fehlgeschlagen' },
      { status: 500 }
    );
  }
}
