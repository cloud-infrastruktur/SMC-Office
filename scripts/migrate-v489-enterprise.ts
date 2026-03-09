/**
 * V4.8.9 Enterprise Migration Script
 * 
 * Migriert bestehende Daten für die neue Enterprise-Architektur:
 * 1. Erstellt Organizations aus bestehenden User.organization Textwerten
 * 2. Verknüpft User mit Organizations (organizationId)
 * 3. Erstellt CrmContact-Einträge für User (1:1 Verknüpfung)
 * 
 * WICHTIG: Dieses Skript ist idempotent und kann mehrfach ausgeführt werden!
 * 
 * Ausführung:
 *   npx tsx scripts/migrate-v489-enterprise.ts
 * 
 * Oder via yarn:
 *   yarn migrate:enterprise
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  V4.8.9 Enterprise Migration                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Statistiken
  let orgsCreated = 0;
  let usersLinked = 0;
  let contactsCreated = 0;
  let contactsLinked = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHRITT 1: Organizations aus User.organization Textwerten erstellen
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('📦 Schritt 1: Organizations erstellen...');

  // Alle User mit organization-Textwerten holen (altes Schema)
  // Wir prüfen ob das Feld noch existiert (Rückwärtskompatibilität)
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      organizationId: true,
      // @ts-ignore - Das alte 'organization' Feld existiert möglicherweise noch
      organization: true,
    },
  });

  // Einzigartige Organization-Namen sammeln (nicht-leere)
  const orgNames = new Set<string>();
  for (const user of users) {
    // @ts-ignore
    const orgText = (user as any).organization;
    if (orgText && typeof orgText === 'string' && orgText.trim().length > 0) {
      orgNames.add(orgText.trim());
    }
  }

  console.log(`   Gefunden: ${orgNames.size} einzigartige Organization-Namen`);

  // Organizations erstellen (falls noch nicht vorhanden)
  for (const orgName of orgNames) {
    const existing = await prisma.organization.findUnique({
      where: { name: orgName },
    });

    if (!existing) {
      await prisma.organization.create({
        data: {
          name: orgName,
          displayName: orgName,
          isActive: true,
        },
      });
      console.log(`   ✅ Organization erstellt: "${orgName}"`);
      orgsCreated++;
    } else {
      console.log(`   ⏭️  Organization existiert bereits: "${orgName}"`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHRITT 2: User mit Organizations verknüpfen
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n🔗 Schritt 2: User mit Organizations verknüpfen...');

  for (const user of users) {
    // @ts-ignore
    const orgText = (user as any).organization;
    
    // Skip wenn User bereits verknüpft ist
    if (user.organizationId) {
      console.log(`   ⏭️  User bereits verknüpft: ${user.email}`);
      continue;
    }

    // Skip wenn kein Organization-Text vorhanden
    if (!orgText || typeof orgText !== 'string' || orgText.trim().length === 0) {
      console.log(`   ⏭️  Keine Organization für: ${user.email}`);
      continue;
    }

    // Organization finden
    const org = await prisma.organization.findUnique({
      where: { name: orgText.trim() },
    });

    if (org) {
      await prisma.user.update({
        where: { id: user.id },
        data: { organizationId: org.id },
      });
      console.log(`   ✅ User verknüpft: ${user.email} → "${org.name}"`);
      usersLinked++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHRITT 3: CrmContact für User erstellen (1:1 Verknüpfung)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n👤 Schritt 3: CrmContact-Einträge für User erstellen...');

  // Alle User neu laden mit aktuellen Daten
  const allUsers = await prisma.user.findMany({
    include: {
      crmContact: true,
      organization: true,
    },
  });

  for (const user of allUsers) {
    // Skip System-User (Admin ohne echten Namen)
    if (user.email === 'admin@smc-office.eu' && user.name?.includes('Admin')) {
      console.log(`   ⏭️  System-User übersprungen: ${user.email}`);
      continue;
    }

    // Skip wenn bereits ein CrmContact verknüpft ist
    if (user.crmContact) {
      console.log(`   ⏭️  CrmContact existiert bereits für: ${user.email}`);
      continue;
    }

    // Prüfen ob ein CrmContact mit gleicher E-Mail existiert
    const existingContact = await prisma.crmContact.findFirst({
      where: { email: user.email || '' },
    });

    if (existingContact) {
      // Bestehenden Contact mit User verknüpfen (falls noch nicht verknüpft)
      if (!existingContact.userId) {
        await prisma.crmContact.update({
          where: { id: existingContact.id },
          data: { 
            userId: user.id,
            organizationId: user.organizationId,
          },
        });
        console.log(`   🔗 Bestehender CrmContact verknüpft: ${user.email}`);
        contactsLinked++;
      }
    } else {
      // Neuen CrmContact erstellen
      const nameParts = (user.name || 'Unbekannt').split(' ');
      const firstName = nameParts[0] || 'Unbekannt';
      const lastName = nameParts.slice(1).join(' ') || '';

      await prisma.crmContact.create({
        data: {
          firstName,
          lastName,
          email: user.email || `user-${user.id}@placeholder.local`,
          userId: user.id,
          organizationId: user.organizationId,
          company: user.organization?.name,
          source: 'V4.8.9 Migration',
          isActive: true,
        },
      });
      console.log(`   ✅ CrmContact erstellt für: ${user.email} (${firstName} ${lastName})`);
      contactsCreated++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZUSAMMENFASSUNG
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Migration abgeschlossen                                   ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Organizations erstellt:     ${String(orgsCreated).padStart(4)}                         ║`);
  console.log(`║  User verknüpft:             ${String(usersLinked).padStart(4)}                         ║`);
  console.log(`║  CrmContacts erstellt:       ${String(contactsCreated).padStart(4)}                         ║`);
  console.log(`║  CrmContacts verknüpft:      ${String(contactsLinked).padStart(4)}                         ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Finale Statistiken
  const finalOrgs = await prisma.organization.count();
  const finalLinkedUsers = await prisma.user.count({ where: { organizationId: { not: null } } });
  const finalLinkedContacts = await prisma.crmContact.count({ where: { userId: { not: null } } });

  console.log('📊 Finale Statistiken:');
  console.log(`   Organizations gesamt:     ${finalOrgs}`);
  console.log(`   User mit Organization:    ${finalLinkedUsers}`);
  console.log(`   CrmContacts mit User:     ${finalLinkedContacts}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Migration fehlgeschlagen:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
