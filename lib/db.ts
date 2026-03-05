import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy initialization - PrismaClient wird erst bei erstem Zugriff erstellt
// Dies verhindert Fehler während des Next.js Build-Prozesses
function getPrismaClient(): PrismaClient {
  // Prüfe ob wir im Build-Prozess sind (keine echte DB-Verbindung)
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
                      process.env.BUILDING === 'true' ||
                      !process.env.DATABASE_URL ||
                      process.env.DATABASE_URL === 'postgresql://dummy:dummy@localhost:5432/dummy';
  
  if (isBuildTime) {
    // Während des Builds: Erstelle einen Proxy der Fehler abfängt
    // Dies ermöglicht den Build ohne echte DB-Verbindung
    return new Proxy({} as PrismaClient, {
      get(target, prop) {
        // Erlaube Zugriff auf $connect, $disconnect etc.
        if (typeof prop === 'string' && prop.startsWith('$')) {
          return () => Promise.resolve();
        }
        // Für Model-Zugriffe (user, project, etc.) - gib leeres Proxy zurück
        return new Proxy({}, {
          get() {
            return () => Promise.resolve(null);
          }
        });
      }
    });
  }
  
  // Runtime: Normale PrismaClient Initialisierung
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }
  
  return globalForPrisma.prisma;
}

// Export als Getter für Lazy Initialization
export const prisma = getPrismaClient();
