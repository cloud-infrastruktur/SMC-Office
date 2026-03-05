/**
 * SMC-Office Master Seed
 * =======================
 * Dieses Seed-Script stellt das komplette Grundgerüst der Homepage wieder her.
 * Es verwendet upsert-Operationen, um bestehende Daten NICHT zu löschen.
 * 
 * Ausführen: npx prisma db seed
 * 
 * WICHTIG: Bei Schema-Änderungen immer Migrations verwenden!
 * npx prisma migrate deploy (NICHT db push!)
 */

import { PrismaClient, UserRole, FileCategory, PermissionArea } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================
// KATEGORIEN - Training Categories
// ============================================
const trainingCategories = [
  { name: 'IT-Service Management', slug: 'it-service-management', type: 'training', icon: 'Settings', sortOrder: 1 },
  { name: 'Management', slug: 'management', type: 'training', icon: 'Briefcase', sortOrder: 2 },
  { name: 'Prozessmanagement', slug: 'prozessmanagement', type: 'training', icon: 'Workflow', sortOrder: 3 },
  { name: 'Projektmanagement', slug: 'projektmanagement', type: 'training', icon: 'FolderKanban', sortOrder: 4 },
  { name: 'Kommunikation', slug: 'kommunikation', type: 'training', icon: 'MessageCircle', sortOrder: 5 },
  { name: 'Agile', slug: 'agile', type: 'training', icon: 'Zap', sortOrder: 6 },
  { name: 'Sprachen', slug: 'sprachen', type: 'training', icon: 'Globe', sortOrder: 7 },
  { name: 'Sonstiges', slug: 'sonstiges', type: 'training', icon: 'MoreHorizontal', sortOrder: 8 },
];

// Referenz-Kategorien (Branchen)
const referenceCategories = [
  { name: 'Banken & Finanzdienstleistungen', slug: 'banking', type: 'reference', icon: 'Landmark', sortOrder: 1 },
  { name: 'Öffentlicher Dienst', slug: 'public', type: 'reference', icon: 'Building2', sortOrder: 2 },
  { name: 'Industrie', slug: 'industry', type: 'reference', icon: 'Factory', sortOrder: 3 },
];

// Projekt-Kategorien
const projectCategories = [
  { name: 'IT-Outsourcing', slug: 'it-outsourcing', type: 'project', icon: 'Layers', sortOrder: 1 },
  { name: 'IT-Service Management', slug: 'itsm-project', type: 'project', icon: 'Settings', sortOrder: 2 },
  { name: 'Projektmanagement', slug: 'pm-project', type: 'project', icon: 'Briefcase', sortOrder: 3 },
  { name: 'Prozessmanagement', slug: 'process-project', type: 'project', icon: 'Workflow', sortOrder: 4 },
  { name: 'Testmanagement', slug: 'test-project', type: 'project', icon: 'FileCheck', sortOrder: 5 },
];

// FALLBACK-Kategorie für verwaiste Datensätze
const uncategorizedCategory = {
  name: 'Nicht zugeordnet',
  slug: 'uncategorized',
  type: 'fallback',
  icon: 'HelpCircle',
  sortOrder: 999,
  description: 'Automatische Kategorie für nicht zugeordnete Einträge',
};

// ============================================
// SOC SERVICES
// ============================================
const socServices = [
  { name: 'SMC-DMS', slug: 'smc-dms', description: 'Dokumentenmanagement-System (Paperless-ngx)', icon: 'FileText', status: 'active', sortOrder: 1 },
  { name: 'SMC-Mailserver', slug: 'smc-mailserver', description: 'E-Mail Server und Kommunikation', icon: 'Mail', status: 'active', sortOrder: 2 },
  { name: 'SMC-Monitoring', slug: 'smc-monitoring', description: 'System-Monitoring und Alerting', icon: 'Activity', status: 'active', sortOrder: 3 },
  { name: 'SMC-PDF-Work', slug: 'smc-pdf-work', description: 'PDF-Verarbeitung und Dokumentenkonvertierung', icon: 'FileOutput', status: 'active', sortOrder: 4 },
  { name: 'SMC-Backup', slug: 'smc-backup', description: 'Backup und Datensicherung', icon: 'HardDrive', status: 'active', sortOrder: 5 },
  { name: 'SMC-Website', slug: 'smc-website', description: 'SMC Website und Portal', icon: 'Globe', status: 'active', sortOrder: 6 },
];

// ============================================
// KOMPETENZEN
// ============================================
const competenciesData = [
  { slug: 'it-service-management', title: 'IT-Service Management', description: 'Umfassende Expertise in ITIL-basierten ITSM-Prozessen, Service-Design, Service-Transition und kontinuierlicher Serviceverbesserung.', icon: 'Settings', category: 'core', sortOrder: 1 },
  { slug: 'prozessmanagement', title: 'Prozessmanagement (ITIL)', description: 'Entwicklung, Implementierung und Optimierung von IT-Prozessen nach ITIL-Framework mit Fokus auf Effizienz und Compliance.', icon: 'Workflow', category: 'core', sortOrder: 2 },
  { slug: 'providermanagement', title: 'Providermanagement', description: 'Strategische Steuerung von IT-Dienstleistern, Vendor-Management, SLA-Verhandlung und Multi-Provider-Koordination.', icon: 'Users', category: 'core', sortOrder: 3 },
  { slug: 'projektmanagement', title: 'Projektmanagement', description: 'Leitung komplexer IT-Projekte mit klassischen und agilen Methoden (PRINCE2, Scrum, Hybrid-Ansätze).', icon: 'Briefcase', category: 'core', sortOrder: 4 },
  { slug: 'qualitaetsmanagement', title: 'Qualitätsmanagement', description: 'Implementierung von QM-Systemen, Testmanagement, MaRisk-konforme Prozesse und kontinuierliche Qualitätssicherung.', icon: 'Shield', category: 'core', sortOrder: 5 },
  { slug: 'testmanagement', title: 'Test- und Release-Management', description: 'Aufbau und Steuerung von Testprozessen, Release-Planung und Koordination in komplexen IT-Umgebungen.', icon: 'FileCheck', category: 'core', sortOrder: 6 },
  { slug: 'outsourcing', title: 'IT-Outsourcing', description: 'Begleitung von Outsourcing-Projekten von der Strategie bis zur operativen Umsetzung und Providerwechsel.', icon: 'Layers', category: 'specialization', sortOrder: 7 },
  { slug: 'banking-it', title: 'Banking IT', description: 'Spezialisierung auf IT-Lösungen im Bankensektor, SB-Banking, Kernbankensysteme und regulatorische Anforderungen.', icon: 'Landmark', category: 'specialization', sortOrder: 8 },
  { slug: 'cmdb', title: 'CMDB-Aufbau', description: 'Konzeption und Implementierung von Configuration Management Databases für transparente IT-Landschaften.', icon: 'Database', category: 'specialization', sortOrder: 9 },
  { slug: 'governance', title: 'IT-Governance', description: 'Etablierung von Governance-Strukturen, Compliance-Management und regulatorische Beratung (BaFin, MaRisk).', icon: 'Shield', category: 'specialization', sortOrder: 10 },
];

// ============================================
// PROFIL-DATEN
// ============================================
const profileDataItems = [
  { key: 'personal_name', value: 'Thomas Schwarz', category: 'personal', sortOrder: 1 },
  { key: 'personal_birthdate', value: '22.12.1962', category: 'personal', sortOrder: 2 },
  { key: 'personal_nationality', value: 'Deutsch', category: 'personal', sortOrder: 3 },
  { key: 'personal_family', value: 'Verheiratet, drei Kinder', category: 'personal', sortOrder: 4 },
  { key: 'personal_motto', value: 'LEBEN UND LEBEN LASSEN', category: 'personal', sortOrder: 5 },
  { key: 'company_name', value: 'Schwarz Management Consulting GmbH', category: 'company', sortOrder: 1 },
  { key: 'company_founded', value: '1993', category: 'company', sortOrder: 2 },
  { key: 'company_description', value: 'Seit der Gründung im Jahr 1993 steht Schwarz Management Consulting für exzellente IT-Beratung mit einem ganzheitlichen Ansatz im IT-Projektgeschäft.', category: 'company', sortOrder: 3 },
  { key: 'company_philosophy', value: 'Menschen im Mittelpunkt aller Projekte', category: 'company', sortOrder: 4 },
  { key: 'career_current', value: '1993 - heute', category: 'career', sortOrder: 1 },
  { key: 'career_current_title', value: 'Selbständiger IT Management Consultant', category: 'career', sortOrder: 2 },
  { key: 'career_founding', value: '1993 - 1996', category: 'career', sortOrder: 4 },
  { key: 'career_founding_title', value: 'Firmengründung', category: 'career', sortOrder: 5 },
  { key: 'career_early', value: '1988 - 1993', category: 'career', sortOrder: 7 },
  { key: 'career_early_title', value: 'Geschäftsführer & Objektberater', category: 'career', sortOrder: 8 },
  { key: 'education_1_year', value: '1991-1992', category: 'education', sortOrder: 1 },
  { key: 'education_1_title', value: 'Geprüfter Handelsfachwirt', category: 'education', sortOrder: 2 },
  { key: 'education_1_subtitle', value: 'IHK mit Abschluss', category: 'education', sortOrder: 3 },
  { key: 'education_2_year', value: '1992', category: 'education', sortOrder: 4 },
  { key: 'education_2_title', value: 'Ausbildung zum Ausbilder', category: 'education', sortOrder: 5 },
  { key: 'education_2_subtitle', value: 'IHK mit Abschluss', category: 'education', sortOrder: 6 },
  { key: 'education_3_year', value: '1980-1982', category: 'education', sortOrder: 7 },
  { key: 'education_3_title', value: 'Kaufmann im Einzelhandel', category: 'education', sortOrder: 8 },
  { key: 'education_3_subtitle', value: 'IHK mit Abschluss', category: 'education', sortOrder: 9 },
];

// ============================================
// SEITENINHALTE (PageContent)
// ============================================
const pageContentData = [
  // Home-Seite
  { page: 'home', section: 'hero_title', content: 'Schwarz Management Consulting', sortOrder: 1 },
  { page: 'home', section: 'hero_subtitle', content: 'Erfahrene IT-Beratung mit ganzheitlichem Ansatz', sortOrder: 2 },
  { page: 'home', section: 'hero_description', content: 'Seit 1993 unterstützen wir Unternehmen bei der erfolgreichen Umsetzung komplexer IT-Projekte.', sortOrder: 3 },
  // Footer
  { page: 'footer', section: 'company_name', content: 'Schwarz Management Consulting GmbH', sortOrder: 1 },
  { page: 'footer', section: 'address_street', content: 'Hainerweg 50', sortOrder: 2 },
  { page: 'footer', section: 'address_city', content: '65779 Kelkheim', sortOrder: 3 },
  { page: 'footer', section: 'phone', content: '+49 6195 9799 585', sortOrder: 4 },
  { page: 'footer', section: 'email', content: 'ts@smc-office.eu', sortOrder: 5 },
  { page: 'footer', section: 'website', content: 'www.smc-office.eu', sortOrder: 6 },
];

// ============================================
// TRAININGS (Basis-Trainings)
// ============================================
const trainingsData = [
  { title: 'ITIL Foundation V3', provider: 'TÜV Rheinland', year: '2009', category: 'Zertifizierung', sortOrder: 1, isHighlight: true },
  { title: 'CMMI Introduction', provider: 'SEI / Carnegie Mellon', year: '2010', category: 'Zertifizierung', sortOrder: 2, isHighlight: true },
  { title: 'Professional Scrum Master I (PSM I)', provider: 'Scrum.org', year: '2012', category: 'Agile', sortOrder: 3, isHighlight: true },
  { title: 'PRINCE2 Foundation', provider: 'APMG International', year: '2008', category: 'Zertifizierung', sortOrder: 4, isHighlight: true },
  { title: 'Kommunikationsausbildung', provider: 'Management Institut Ruhleder', year: '1990er', category: 'Kommunikation', link: 'https://ruhleder.de', sortOrder: 5, isHighlight: true },
  { title: 'Scrum Master Training', provider: 'TÜV Süd', year: '2015', category: 'Agile', sortOrder: 6, isHighlight: false },
  { title: 'Lean Management', provider: 'TÜV Rheinland', year: '2011', category: 'Management', sortOrder: 7, isHighlight: false },
  { title: 'IHK-zertifizierter Trainer', provider: 'IHK', year: '1992', category: 'Zertifizierung', sortOrder: 8, isHighlight: true },
  { title: 'ITSM Practitioner', provider: 'EXIN', year: '2010', category: 'ITSM', sortOrder: 9, isHighlight: false },
  { title: 'Test Manager ISTQB', provider: 'ISTQB', year: '2013', category: 'Zertifizierung', sortOrder: 10, isHighlight: false },
  { title: 'Kanban Training', provider: 'Lean Kanban University', year: '2014', category: 'Agile', sortOrder: 11, isHighlight: false },
  { title: 'Englisch - Verhandlungssicher', provider: null, year: null, category: 'Sprachen', sortOrder: 12, isHighlight: false },
  { title: 'Französisch - Grundkenntnisse', provider: null, year: null, category: 'Sprachen', sortOrder: 13, isHighlight: false },
];

// ============================================
// STANDARD-ORDNER für Dateimanager
// ============================================
const defaultFolders = [
  { name: 'Profile', slug: 'profile', sortOrder: 1 },
  { name: 'Referenzen', slug: 'references', sortOrder: 2 },
  { name: 'Trainings', slug: 'trainings', sortOrder: 3 },
  { name: 'Zertifikate', slug: 'certificates', sortOrder: 4 },
  { name: 'Projekte', slug: 'projects', sortOrder: 5 },
  { name: 'Sonstiges', slug: 'misc', sortOrder: 6 },
];

// ============================================
// MAIN SEED FUNCTION
// ============================================
async function main() {
  console.log('\n========================================');
  console.log('SMC-Office Master Seed');
  console.log('========================================\n');

  // 1. ADMIN USER (upsert - sicher)
  console.log('[1/10] Admin-Benutzer...');
  const adminEmail = 'admin@smc-office.eu';
  const adminPassword = 'soadmin146810!';
  const hashedPassword = await hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.ADMIN },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Thomas Schwarz',
      role: UserRole.ADMIN,
    },
  });
  console.log('  ✓ Admin-User sichergestellt');

  // 2. KATEGORIEN (alle Typen)
  console.log('[2/10] Kategorien...');
  const allCategories = [
    ...trainingCategories,
    ...referenceCategories,
    ...projectCategories,
    uncategorizedCategory,
  ];

  for (const cat of allCategories) {
    const catData = cat as any;
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, sortOrder: cat.sortOrder, description: catData.description || null },
      create: catData,
    });
  }
  console.log(`  ✓ ${allCategories.length} Kategorien erstellt/aktualisiert`);

  // 3. SOC SERVICES
  console.log('[3/10] SOC Services...');
  for (const service of socServices) {
    await prisma.socService.upsert({
      where: { slug: service.slug },
      update: { name: service.name, description: service.description, icon: service.icon, sortOrder: service.sortOrder },
      create: service,
    });
  }
  console.log(`  ✓ ${socServices.length} SOC Services erstellt/aktualisiert`);

  // 4. KOMPETENZEN
  console.log('[4/10] Kompetenzen...');
  for (const comp of competenciesData) {
    await prisma.competency.upsert({
      where: { slug: comp.slug },
      update: { title: comp.title, description: comp.description, icon: comp.icon, category: comp.category, sortOrder: comp.sortOrder },
      create: comp,
    });
  }
  console.log(`  ✓ ${competenciesData.length} Kompetenzen erstellt/aktualisiert`);

  // 5. PROFIL-DATEN
  console.log('[5/10] Profil-Daten...');
  for (const item of profileDataItems) {
    await prisma.profileData.upsert({
      where: { key: item.key },
      update: { value: item.value, category: item.category, sortOrder: item.sortOrder },
      create: item,
    });
  }
  console.log(`  ✓ ${profileDataItems.length} Profil-Einträge erstellt/aktualisiert`);

  // 6. SEITENINHALTE
  console.log('[6/10] Seiteninhalte...');
  for (const content of pageContentData) {
    await prisma.pageContent.upsert({
      where: { page_section: { page: content.page, section: content.section } },
      update: { content: content.content, sortOrder: content.sortOrder },
      create: content,
    });
  }
  console.log(`  ✓ ${pageContentData.length} Seiteninhalte erstellt/aktualisiert`);

  // 7. TRAININGS (nur erstellen wenn nicht vorhanden)
  console.log('[7/10] Trainings...');
  const existingTrainings = await prisma.training.count();
  if (existingTrainings === 0) {
    for (const training of trainingsData) {
      await prisma.training.create({ data: training });
    }
    console.log(`  ✓ ${trainingsData.length} Trainings erstellt`);
  } else {
    console.log(`  ✓ ${existingTrainings} Trainings bereits vorhanden (keine Änderung)`);
  }

  // 8. STANDARD-ORDNER
  console.log('[8/10] Standard-Ordner...');
  for (const folder of defaultFolders) {
    await prisma.fileFolder.upsert({
      where: { slug: folder.slug },
      update: { name: folder.name, sortOrder: folder.sortOrder },
      create: folder,
    });
  }
  console.log(`  ✓ ${defaultFolders.length} Ordner erstellt/aktualisiert`);

  // 9. DATA INTEGRITY CHECK (verwaiste Datensätze)
  console.log('[9/10] Daten-Integritätsprüfung...');
  await checkDataIntegrity();

  // 10. STATISTIK
  console.log('[10/10] Abschließende Statistik...');
  await printStatistics();

  console.log('\n========================================');
  console.log('Seed erfolgreich abgeschlossen!');
  console.log('========================================\n');
}

// ============================================
// DATA INTEGRITY CHECK
// ============================================
async function checkDataIntegrity() {
  const orphanedProjects = await prisma.project.count({
    where: {
      categoryId: { not: null },
      NOT: {
        categoryId: {
          in: (await prisma.category.findMany({ select: { id: true } })).map(c => c.id)
        }
      }
    }
  });

  const orphanedTrainings = await prisma.training.count({
    where: {
      categoryId: { not: null },
      NOT: {
        categoryId: {
          in: (await prisma.category.findMany({ select: { id: true } })).map(c => c.id)
        }
      }
    }
  });

  const orphanedReferences = await prisma.reference.count({
    where: {
      categoryId: { not: null },
      NOT: {
        categoryId: {
          in: (await prisma.category.findMany({ select: { id: true } })).map(c => c.id)
        }
      }
    }
  });

  const totalOrphaned = orphanedProjects + orphanedTrainings + orphanedReferences;

  if (totalOrphaned > 0) {
    console.log(`  ⚠ Warnung: ${totalOrphaned} verwaiste Datensätze gefunden!`);
    console.log(`    - Projekte: ${orphanedProjects}`);
    console.log(`    - Trainings: ${orphanedTrainings}`);
    console.log(`    - Referenzen: ${orphanedReferences}`);
  } else {
    console.log('  ✓ Keine verwaisten Datensätze gefunden');
  }
}

// ============================================
// STATISTIK
// ============================================
async function printStatistics() {
  const stats = {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    projects: await prisma.project.count(),
    references: await prisma.reference.count(),
    trainings: await prisma.training.count(),
    competencies: await prisma.competency.count(),
    socServices: await prisma.socService.count(),
    folders: await prisma.fileFolder.count(),
  };

  console.log('  Datenbank-Status:');
  console.log(`    - Benutzer:      ${stats.users}`);
  console.log(`    - Kategorien:    ${stats.categories}`);
  console.log(`    - Projekte:      ${stats.projects}`);
  console.log(`    - Referenzen:    ${stats.references}`);
  console.log(`    - Trainings:     ${stats.trainings}`);
  console.log(`    - Kompetenzen:   ${stats.competencies}`);
  console.log(`    - SOC Services:  ${stats.socServices}`);
  console.log(`    - Ordner:        ${stats.folders}`);
}

// ============================================
// EXECUTE
// ============================================
main()
  .catch((e) => {
    console.error('\n❌ Fehler beim Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
