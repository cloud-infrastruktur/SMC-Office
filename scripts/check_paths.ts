import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPaths() {
  console.log('\n=== Pruefe Dateipfade in der Datenbank ===\n');

  const downloads = await prisma.downloadFile.findMany({
    select: { id: true, fileName: true, cloudStoragePath: true }
  });
  console.log('DownloadFile (' + downloads.length + ' Eintraege):');
  downloads.forEach(d => {
    const isAbsolute = d.cloudStoragePath?.startsWith('/');
    console.log('  ' + d.fileName + ': ' + d.cloudStoragePath + ' ' + (isAbsolute ? '(ABSOLUT)' : '(relativ)'));
  });

  try {
    const files = await (prisma as any).managedFile.findMany({
      select: { id: true, originalName: true, storagePath: true }
    });
    console.log('\nManagedFile (' + files.length + ' Eintraege):');
    files.forEach((f: any) => {
      const isAbsolute = f.storagePath?.startsWith('/');
      console.log('  ' + f.originalName + ': ' + f.storagePath + ' ' + (isAbsolute ? '(ABSOLUT)' : '(relativ)'));
    });
  } catch (e) {
    console.log('\nManagedFile: Tabelle nicht vorhanden');
  }

  await prisma.$disconnect();
}

checkPaths();
