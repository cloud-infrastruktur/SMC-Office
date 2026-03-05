'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Wrench,
  Server,
  Database,
  Shield,
  Code,
  Cloud,
  Webhook,
  FileText,
  Terminal,
  Settings,
  Menu,
  X,
  Copy,
  Check,
  HardDrive,
  RefreshCw,
  Calendar,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const sections = [
  { id: 'architektur', title: 'Architektur', icon: Server },
  { id: 'datenbank', title: 'Datenbankmodell', icon: Database },
  { id: 'api-endpunkte', title: 'API-Endpunkte', icon: Code },
  { id: 'authentifizierung', title: 'Authentifizierung', icon: Shield },
  { id: 'storage', title: 'Dateispeicher', icon: HardDrive },
  { id: 'crm', title: 'SMC-CRM', icon: Terminal },
  { id: 'kalender', title: 'Kalender & CalDAV', icon: Calendar },
  { id: 'email', title: 'E-Mail-Client', icon: Inbox },
  { id: 'paperless', title: 'SMC-DMS', icon: FileText },
  { id: 'soc-dashboard', title: 'SOC Dashboard', icon: Webhook },
  { id: 'backup', title: 'Backup & Recovery', icon: RefreshCw },
  { id: 'deployment', title: 'Deployment', icon: Cloud },
  { id: 'wartung', title: 'Wartung', icon: Settings },
];

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
      </button>
    </div>
  );
}

export default function TechnicalManualPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('architektur');
  const [showToc, setShowToc] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (role !== 'admin' && role !== 'ADMIN' && role !== 'MANAGER' && role !== 'manager') {
        router.push('/');
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map(s => document.getElementById(s.id));
      const scrollPosition = window.scrollY + 150;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const section = sectionElements[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setShowToc(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Mobile TOC Toggle */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setShowToc(!showToc)}
          className="bg-orange-600 hover:bg-orange-700 rounded-full w-12 h-12 shadow-lg"
        >
          {showToc ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile TOC */}
      {showToc && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowToc(false)}>
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            className="absolute right-0 top-0 h-full w-80 bg-white p-6 shadow-xl overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-4">Inhalt</h3>
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    activeSection === section.id
                      ? 'bg-orange-100 text-orange-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  {section.title}
                </button>
              ))}
            </nav>
          </motion.div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/admin/docs" className="inline-flex items-center text-slate-500 hover:text-orange-600 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zur Dokumentation
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">Technisches Handbuch</h1>
          <p className="text-gray-600 mt-2">Architektur, APIs, Deployment und Wartung</p>
        </motion.div>

        <div className="flex gap-8">
          {/* Desktop TOC */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:block w-64 flex-shrink-0"
          >
            <div className="sticky top-24 bg-white rounded-xl shadow-lg p-4">
              <h3 className="font-bold text-gray-900 mb-4">Inhalt</h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                      activeSection === section.id
                        ? 'bg-orange-100 text-orange-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <section.icon className="w-4 h-4" />
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </motion.aside>

          {/* Content */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 bg-white rounded-xl shadow-lg p-8 max-w-none"
          >
            {/* Architektur */}
            <section id="architektur" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Server className="w-6 h-6 text-orange-600" />
                Architektur
              </h2>
              <p className="text-gray-600 mb-4">
                Die SMC-Office Website basiert auf einem modernen Tech-Stack:
              </p>
              <div className="bg-slate-100 rounded-lg p-4 mb-4">
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Framework:</strong> Next.js 14 (App Router)</li>
                  <li><strong>Sprache:</strong> TypeScript</li>
                  <li><strong>Styling:</strong> Tailwind CSS</li>
                  <li><strong>Datenbank:</strong> PostgreSQL mit Prisma ORM</li>
                  <li><strong>Auth:</strong> NextAuth.js</li>
                  <li><strong>Storage:</strong> Lokal (Docker Volume) oder S3</li>
                  <li><strong>Deployment:</strong> Docker + Portainer</li>
                </ul>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Verzeichnisstruktur</h3>
              <CodeBlock code={`nextjs_space/
├── app/              # Next.js App Router
│   ├── api/          # API Routes
│   ├── admin/        # SMC Dashboard
│   └── (pages)/      # Öffentliche Seiten
├── components/       # React-Komponenten
├── lib/              # Utilities & Services
│   ├── storage.ts    # Abstrahierte Dateispeicherung
│   ├── db.ts         # Prisma Client
│   └── auth.ts       # Auth Helper
├── prisma/           # Datenbankschema & Migrationen
│   ├── schema.prisma
│   └── migrations/
├── scripts/          # Seed & Utilities
└── public/           # Statische Assets`} />
            </section>

            {/* Datenbank */}
            <section id="datenbank" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Database className="w-6 h-6 text-orange-600" />
                Datenbankmodell
              </h2>
              <p className="text-gray-600 mb-4">
                Die Datenbank verwendet PostgreSQL mit Prisma ORM. Schema-Änderungen werden über Migrations verwaltet.
              </p>
              
              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Benutzer & Authentifizierung</h3>
              <CodeBlock language="prisma" code={`model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String?
  role          UserRole  @default(USER)
  permissions   UserPermission[]
  createdAt     DateTime  @default(now())
}

enum UserRole {
  USER      // Normaler Benutzer
  MANAGER   // Manager-Zugriff
  ADMIN     // Voller Admin-Zugriff
}

model UserPermission {
  id     String         @id @default(cuid())
  userId String
  area   PermissionArea
  user   User           @relation(...)
}`} />

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Inhaltsmodelle</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Project</strong> – Projekterfahrungen mit Kategorie und PDF-Anhang</li>
                <li><strong>Reference</strong> – Kundenreferenzen mit Branche und Projekt-Verknüpfung</li>
                <li><strong>Training</strong> – Zertifikate mit Kategorien</li>
                <li><strong>Competency</strong> – Kernkompetenzen</li>
                <li><strong>Category</strong> – Kategorien (type: PROJECT/REFERENCE/TRAINING)</li>
                <li><strong>DownloadFile</strong> – Geschützte Downloads</li>
                <li><strong>PageContent</strong> – Dynamische Seiteninhalte (Home, Footer)</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">System-Integrationen</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>SocService</strong> – Überwachte Services mit Heartbeat</li>
                <li><strong>SocEvent</strong> – Events vom n8n-Webhook</li>
                <li><strong>N8nWorkflow</strong> – Registrierte n8n-Workflows</li>
                <li><strong>PaperlessConfig</strong> – SMC-DMS Verbindung</li>
                <li><strong>SmtpConfig</strong> – E-Mail-Server Konfiguration</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Prisma-Befehle</h3>
              <CodeBlock code={`# WICHTIG: Nur Migrations verwenden, NICHT db push!

# Neue Migration erstellen (Development)
yarn prisma migrate dev --name beschreibung

# Migration deployen (Production)
yarn prisma migrate deploy

# Client neu generieren
yarn prisma generate

# Datenbank-Seed ausführen
yarn prisma db seed

# Prisma Studio (öffnet GUI)
yarn prisma studio`} />

              <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-4">
                <p className="text-red-800 font-medium">Wichtig: Migrations statt db push</p>
                <p className="text-red-700 text-sm">
                  Verwenden Sie immer <code>prisma migrate</code> für Schema-Änderungen.
                  <code>db push</code> kann zu Datenverlust führen!
                </p>
              </div>
            </section>

            {/* API-Endpunkte */}
            <section id="api-endpunkte" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Code className="w-6 h-6 text-orange-600" />
                API-Endpunkte
              </h2>
              
              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Öffentliche Endpunkte</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Methode</th>
                      <th className="px-4 py-2 text-left">Endpunkt</th>
                      <th className="px-4 py-2 text-left">Beschreibung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="px-4 py-2 font-mono text-green-600">GET</td><td className="px-4 py-2">/api/projects</td><td className="px-4 py-2">Alle Projekte (desc)</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-green-600">GET</td><td className="px-4 py-2">/api/projects/[id]</td><td className="px-4 py-2">Einzelnes Projekt</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-green-600">GET</td><td className="px-4 py-2">/api/references</td><td className="px-4 py-2">Alle Referenzen</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-green-600">GET</td><td className="px-4 py-2">/api/trainings</td><td className="px-4 py-2">Alle Trainings</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-green-600">GET</td><td className="px-4 py-2">/api/competencies</td><td className="px-4 py-2">Alle Kompetenzen</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-blue-600">POST</td><td className="px-4 py-2">/api/contact</td><td className="px-4 py-2">Kontaktformular</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-blue-600">POST</td><td className="px-4 py-2">/api/signup</td><td className="px-4 py-2">Registrierung</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Geschützte Endpunkte</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Endpunkt</th>
                      <th className="px-4 py-2 text-left">Rolle</th>
                      <th className="px-4 py-2 text-left">Beschreibung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="px-4 py-2">/api/downloads</td><td className="px-4 py-2">USER+</td><td className="px-4 py-2">Download-Dateien</td></tr>
                    <tr><td className="px-4 py-2">/api/paperless/*</td><td className="px-4 py-2">MANAGER+</td><td className="px-4 py-2">Paperless-Integration</td></tr>
                    <tr><td className="px-4 py-2">/api/soc/*</td><td className="px-4 py-2">MANAGER+</td><td className="px-4 py-2">SOC Dashboard</td></tr>
                    <tr><td className="px-4 py-2">/api/admin/backup</td><td className="px-4 py-2">ADMIN</td><td className="px-4 py-2">Backup Export/Import</td></tr>
                    <tr><td className="px-4 py-2">/api/admin/integrity</td><td className="px-4 py-2">ADMIN</td><td className="px-4 py-2">Datenintegrität</td></tr>
                    <tr><td className="px-4 py-2">/api/admin/*</td><td className="px-4 py-2">ADMIN</td><td className="px-4 py-2">Alle Admin-Funktionen</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Webhook-Endpunkte</h3>
              <CodeBlock code={`POST /api/soc/ingest
Header: X-N8N-API-KEY: <your-api-key>
Body: {
  "type": "error|warning|info|success|heartbeat",
  "title": "Event-Titel",
  "message": "Detaillierte Nachricht",
  "serviceSlug": "smc-dms",
  "source": "n8n",
  "metadata": {}
}`} />
            </section>

            {/* Authentifizierung */}
            <section id="authentifizierung" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Shield className="w-6 h-6 text-orange-600" />
                Authentifizierung
              </h2>
              <p className="text-gray-600 mb-4">
                Die Authentifizierung verwendet NextAuth.js mit Credentials-Provider:
              </p>
              
              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Rollen</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>USER</strong> – Zugriff auf Downloads nach Freischaltung</li>
                <li><strong>MANAGER</strong> – Zusätzlich: Paperless, SOC Dashboard</li>
                <li><strong>ADMIN</strong> – Vollzugriff auf alle Funktionen</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Admin-Account</h3>
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                <p className="text-amber-800 font-medium">Standard-Zugangsdaten</p>
                <p className="text-amber-700 font-mono text-sm">
                  E-Mail: admin@smc-office.eu<br />
                  Passwort: soadmin146810!
                </p>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Konfigurationsdateien</h3>
              <CodeBlock code={`/lib/auth-options.ts  # NextAuth Konfiguration
/lib/auth.ts          # Helper: requireAdmin, requireAuth, getCurrentUser`} />
            </section>

            {/* Storage */}
            <section id="storage" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <HardDrive className="w-6 h-6 text-orange-600" />
                Dateispeicher (Storage)
              </h2>
              <p className="text-gray-600 mb-4">
                Der Dateispeicher ist umgebungsunabhängig abstrahiert und unterstützt lokale Speicherung oder S3.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Konfiguration</h3>
              <CodeBlock code={`# .env - Lokale Speicherung (Standard)
UPLOAD_STORAGE=local
UPLOAD_DIR=uploads

# .env - S3 Speicherung
UPLOAD_STORAGE=s3
AWS_BUCKET_NAME=your-bucket
AWS_FOLDER_PREFIX=smc/`} />

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Storage API (lib/storage.ts)</h3>
              <CodeBlock code={`// Datei hochladen
uploadFile(buffer, fileName, contentType, isPublic) → string

// Datei-URL abrufen
getFileUrl(fileKey, isPublic) → string

// Datei löschen
deleteFile(fileKey) → void

// Pfad normalisieren (für Migration)
normalizeStoragePath(path) → string | null

// Absoluten Pfad prüfen
isAbsolutePath(path) → boolean`} />

              <div className="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
                <p className="text-green-800 font-medium">Environment Agnosticism</p>
                <p className="text-green-700 text-sm">
                  In der Datenbank werden nur relative Pfade/Keys gespeichert (z.B. <code>1706618400000-dokument.pdf</code>).
                  Niemals absolute Pfade aus Entwicklungsumgebungen
                </p>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Docker Volume</h3>
              <CodeBlock code={`# docker-compose.yml
volumes:
  - smc-uploads:/app/uploads

# Persistenter Speicher für Uploads`} />
            </section>

            {/* SMC-CRM */}
            <section id="crm" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Terminal className="w-6 h-6 text-orange-600" />
                SMC-CRM Modul
              </h2>
              <p className="text-gray-600 mb-4">
                Das CRM-Modul implementiert ein vollständiges Lead- und Deal-Management mit 
                automatischer E-Mail-Analyse. Inspiriert von Pipedrive als &quot;Single Point of Truth&quot;.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Datenbankmodelle</h3>
              <CodeBlock language="prisma" code={`// 6-Phasen Pipeline
enum CrmDealPhase {
  ANFRAGE      // Phase 1: Projektanfrage
  ABSTIMMUNG   // Phase 2: In Abstimmung
  PROFIL       // Phase 3: Profil vorgestellt
  INTERVIEW    // Phase 4: Kundengespräch
  AUFTRAG      // Phase 5: Auftrag liegt vor
  VERTRAG      // Phase 6: Vertragsabstimmung
}

// Kontakte/Leads
model CrmContact {
  id        String   @id @default(cuid())
  firstName String
  lastName  String
  email     String   @unique
  phone     String?
  company   String?
  position  String?
  linkedInUrl String?
  deals     CrmDeal[]
}

// Deals/Opportunities
model CrmDeal {
  id              String        @id @default(cuid())
  title           String
  description     String?
  value           Float?        // Geschätzter Wert
  probability     Int           @default(50)
  phase           CrmDealPhase  @default(ANFRAGE)
  sourceType      String        @default("manual")
  sourceEmailId   String?       // Verknüpfung zur E-Mail
  matchedKeywords String[]      // Gefundene Keywords
  contact         CrmContact?
  assignedTo      User?
  activities      CrmActivity[]
}

// Aktivitäten (Notes, Tasks, Calls)
model CrmActivity {
  type        CrmActivityType
  title       String
  description String?
  dueDate     DateTime?
  isCompleted Boolean @default(false)
  deal        CrmDeal?
  contact     CrmContact?
}

// Keyword-Konfiguration
model CrmKeywordConfig {
  id              String   @id @default(cuid())
  keywords        String[] // z.B. ["ITIL", "Projektmanagement"]
  blacklistEmails String[] // Ignorierte E-Mails
  checkSubject    Boolean  @default(true)
  checkBody       Boolean  @default(true)
  totalScans      Int      @default(0)
  totalMatches    Int      @default(0)
}`} />

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">API-Endpunkte</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Methode</th>
                      <th className="px-4 py-2 text-left">Endpunkt</th>
                      <th className="px-4 py-2 text-left">Beschreibung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="px-4 py-2 font-mono text-green-600">GET</td><td className="px-4 py-2">/api/crm/contacts</td><td className="px-4 py-2">Alle Kontakte (mit Suche)</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-blue-600">POST</td><td className="px-4 py-2">/api/crm/contacts</td><td className="px-4 py-2">Kontakt erstellen</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-yellow-600">PUT</td><td className="px-4 py-2">/api/crm/contacts/[id]</td><td className="px-4 py-2">Kontakt bearbeiten</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-red-600">DELETE</td><td className="px-4 py-2">/api/crm/contacts/[id]</td><td className="px-4 py-2">Kontakt löschen</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-green-600">GET</td><td className="px-4 py-2">/api/crm/deals</td><td className="px-4 py-2">Alle Deals (mit Filter)</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-blue-600">POST</td><td className="px-4 py-2">/api/crm/deals</td><td className="px-4 py-2">Deal erstellen</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-yellow-600">PUT</td><td className="px-4 py-2">/api/crm/deals/[id]</td><td className="px-4 py-2">Deal bearbeiten + Activity-Log</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-green-600">GET</td><td className="px-4 py-2">/api/crm/pipeline</td><td className="px-4 py-2">Pipeline-Phasen + Deal-Counts</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-green-600">GET</td><td className="px-4 py-2">/api/crm/stats</td><td className="px-4 py-2">Dashboard-Statistiken</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-green-600">GET</td><td className="px-4 py-2">/api/crm/keywords</td><td className="px-4 py-2">Keyword-Konfiguration</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-yellow-600">PUT</td><td className="px-4 py-2">/api/crm/keywords</td><td className="px-4 py-2">Keywords aktualisieren</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-blue-600">POST</td><td className="px-4 py-2">/api/crm/scan</td><td className="px-4 py-2">E-Mails scannen</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">E-Mail-Scan API</h3>
              <CodeBlock code={`# Manueller Scan (Session-Auth)
POST /api/crm/scan
Body: {}

# n8n-Webhook (API-Key-Auth)
POST /api/crm/scan
Header: X-N8N-API-KEY: <your-api-key>
Body: {
  "emails": [
    {
      "id": "email-123",
      "from": "kunde@firma.de",
      "subject": "Anfrage ITIL-Beratung",
      "body": "Wir suchen Unterstützung für Projektmanagement..."
    }
  ]
}

# Response
{
  "success": true,
  "scanned": 50,
  "matched": 3,
  "dealsCreated": 2,
  "contactsCreated": 2,
  "skipped": 1,
  "duration": "2.3s",
  "matchedKeywords": ["ITIL", "Projektmanagement"]
}`} />

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Standard-Keywords</h3>
              <CodeBlock code={`// Beim ersten Zugriff automatisch initialisiert
const defaultKeywords = [
  "Prozessmanagement",
  "Providermanagement",
  "IT-Service-Management",
  "ITSM",
  "ITSCM",
  "CMDB",
  "Change Management",
  "Release Management",
  "Testmanagement",
  "Training",
  "Qualitätssicherung",
  "SB-Banking",
  "ITIL",
  "Projektmanagement"
];`} />

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">n8n-Workflow Integration</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>In n8n einen Zeitplan-Trigger erstellen (z.B. alle 15 Minuten)</li>
                <li>HTTP Request Node mit POST zu <code className="bg-slate-100 px-1 rounded">/api/crm/scan</code></li>
                <li>Header: <code className="bg-slate-100 px-1 rounded">X-N8N-API-KEY</code> aus .env</li>
                <li>Optional: E-Mail-Liste im Body übergeben</li>
              </ol>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
                <p className="text-blue-800 font-medium">Dual-Mode Authentifizierung</p>
                <p className="text-blue-700 text-sm">
                  Der Scan-Endpoint unterstützt sowohl Session-Auth (Dashboard) als auch 
                  API-Key-Auth (n8n-Webhook) über den <code>X-N8N-API-KEY</code> Header.
                </p>
              </div>
            </section>

            {/* Kalender & CalDAV */}
            <section id="kalender" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-orange-600" />
                Kalender & CalDAV
              </h2>
              <p className="text-gray-600 mb-4">
                Das Kalender-Modul bietet vollständige CalDAV-Unterstützung für Apple iCloud, Nextcloud 
                und andere kompatible Server. Es ist tief mit dem CRM-Modul integriert.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Datenbankmodelle (Prisma)</h3>
              <CodeBlock code={`model CalendarAccount {
  id          String           @id @default(cuid())
  userId      String
  name        String
  provider    CalendarProvider @default(LOCAL)
  caldavUrl   String?
  username    String?
  password    String?          // Verschlüsselt mit CALDAV_ENCRYPTION_KEY
  color       String           @default("#3B82F6")
  isActive    Boolean          @default(true)
  isDefault   Boolean          @default(false)
  lastSync    DateTime?
  syncError   String?
}

model CalendarEvent {
  id              String        @id @default(cuid())
  accountId       String
  userId          String
  externalId      String?
  icsUid          String?       // ICS UID für Meeting-Einladungen
  title           String
  description     String?
  location        String?
  startDate       DateTime
  endDate         DateTime
  allDay          Boolean       @default(false)
  isRecurring     Boolean       @default(false)
  recurrenceRule  String?       // RFC 5545 RRULE
  recurrenceEnd   DateTime?
  status          EventStatus   @default(CONFIRMED)
  // CRM-Integration
  contactId       String?
  dealId          String?
  projectId       String?
  // Meeting-Einladungen
  organizer       String?
  attendeesJson   String?
  responseStatus  EventResponse?
}

enum CalendarProvider { LOCAL, NEXTCLOUD, GOOGLE, APPLE, CALDAV_GENERIC }
enum EventStatus { CONFIRMED, TENTATIVE, CANCELLED }
enum EventResponse { ACCEPTED, DECLINED, TENTATIVE, NEEDS_ACTION }`} />

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">API-Endpunkte</h3>
              <CodeBlock code={`# Kalenderkonten
GET  /api/calendar/accounts        # Alle Konten
POST /api/calendar/accounts        # Konto erstellen
PUT  /api/calendar/accounts        # Konto aktualisieren
DELETE /api/calendar/accounts      # Konto löschen

# Events
GET  /api/calendar/events          # Alle Events (mit Datumsfilter)
POST /api/calendar/events          # Event erstellen
PUT  /api/calendar/events          # Event aktualisieren
DELETE /api/calendar/events?id=xxx # Event löschen

# Synchronisation
POST /api/calendar/sync            # CalDAV-Sync auslösen
POST /api/calendar/import          # ICS-Datei importieren
GET  /api/calendar/export          # Als ICS exportieren
POST /api/calendar/respond         # Meeting-Einladung beantworten`} />

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Libraries</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><code className="bg-slate-100 px-1 rounded">lib/ics-parser.ts</code> – ICS/iCalendar Parsing und Generierung</li>
                <li><code className="bg-slate-100 px-1 rounded">lib/caldav.ts</code> – CalDAV-Client für PROPFIND, REPORT, PUT, DELETE</li>
              </ul>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
                <p className="text-yellow-800 font-medium">Apple iCloud Hinweis</p>
                <p className="text-yellow-700 text-sm">
                  Für Apple iCloud ist ein app-spezifisches Passwort erforderlich, das unter 
                  appleid.apple.com generiert werden kann. Die CalDAV-URL lautet: 
                  <code className="bg-yellow-100 px-1 rounded ml-1">https://caldav.icloud.com</code>
                </p>
              </div>
            </section>

            {/* E-Mail-Client */}
            <section id="email" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Inbox className="w-6 h-6 text-orange-600" />
                E-Mail-Client
              </h2>
              <p className="text-gray-600 mb-4">
                Der E-Mail-Client verwendet IMAP für den Empfang und SMTP für den Versand von E-Mails. 
                Ordnerverwaltung erfolgt über IMAP-Kommandos.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Datenbankmodelle (Prisma)</h3>
              <CodeBlock code={`model EmailAccount {
  id         String   @id @default(cuid())
  userId     String
  email      String
  name       String?
  imapHost   String
  imapPort   Int      @default(993)
  smtpHost   String
  smtpPort   Int      @default(587)
  username   String
  password   String   // Verschlüsselt
  useSsl     Boolean  @default(true)
  isDefault  Boolean  @default(false)
}

model EmailFolder {
  id         String   @id @default(cuid())
  accountId  String
  name       String
  path       String
  type       String?  // inbox, sent, drafts, trash, custom
  parentId   String?  // Für Unterordner
  isSystem   Boolean  @default(false)
}

model EmailMessage {
  id          String   @id @default(cuid())
  folderId    String
  messageId   String
  subject     String?
  fromAddress String?
  toAddress   String?
  date        DateTime?
  isRead      Boolean  @default(false)
  hasAttachment Boolean @default(false)
  bodyHtml    String?
  bodyText    String?
}`} />

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">API-Endpunkte</h3>
              <CodeBlock code={`# Konten
GET  /api/email/accounts           # Alle Konten
POST /api/email/accounts           # Konto erstellen

# Ordner
GET  /api/email/folders?accountId=xxx  # Ordner synchronisieren
POST /api/email/folders                # Ordner erstellen (IMAP CREATE)
PUT  /api/email/folders/[id]           # Ordner umbenennen (IMAP RENAME)
DELETE /api/email/folders/[id]         # Ordner löschen (IMAP DELETE)

# Nachrichten
GET  /api/email/messages?folderId=xxx  # E-Mails abrufen
GET  /api/email/messages/[id]          # Einzelne E-Mail
POST /api/email/messages               # E-Mail senden (SMTP)
PUT  /api/email/messages/[id]/move     # E-Mail verschieben
DELETE /api/email/messages/[id]        # E-Mail löschen

# Anhänge
GET  /api/email/attachments/[id]       # Anhang herunterladen`} />

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">IMAP-Ordner-Hierarchie</h3>
              <p className="text-gray-600 mb-2">
                Die Ordnerstruktur wird vollständig vom IMAP-Server synchronisiert:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>System-Ordner (INBOX, Sent, Drafts, Trash) sind geschützt</li>
                <li>Unterordner werden über den Pfad (z.B. <code>INBOX/Projekte/Kunde1</code>) erkannt</li>
                <li>Bei Umbenennung werden alle Unterordner-Pfade automatisch aktualisiert</li>
              </ul>
            </section>

            {/* Paperless */}
            <section id="paperless" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <FileText className="w-6 h-6 text-orange-600" />
                SMC-DMS Integration
              </h2>
              <p className="text-gray-600 mb-4">
                Die Integration mit SMC-DMS (Paperless-ngx) ermöglicht den Zugriff auf das Dokumentenmanagement-System.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Konfiguration</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Im SMC Dashboard unter „SMC-DMS" die Konfiguration öffnen</li>
                <li>Paperless-URL eingeben (z.B. https://dms.smc-office.eu)</li>
                <li>API-Token aus Paperless Admin holen (Einstellungen → Auth Tokens)</li>
                <li>Verbindung testen und speichern</li>
              </ol>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">API-Endpunkte</h3>
              <CodeBlock code={`GET  /api/paperless/config           # Konfiguration
POST /api/paperless/config           # Speichern + Test
GET  /api/paperless/documents        # Dokumente (mit Filtern)
GET  /api/paperless/documents/[id]   # Dokument-Details
GET  /api/paperless/documents/[id]/thumbnail  # Vorschau
GET  /api/paperless/documents/[id]/download   # Download
GET  /api/paperless/correspondents   # Korrespondenten
GET  /api/paperless/document-types   # Dokumenttypen
GET  /api/paperless/tags             # Tags`} />

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Filter-Parameter</h3>
              <CodeBlock code={`GET /api/paperless/documents?correspondent=1&document_type=2&search=rechnung&page=1&page_size=25&tags=1,2,3`} />
            </section>

            {/* SOC Dashboard */}
            <section id="soc-dashboard" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Webhook className="w-6 h-6 text-orange-600" />
                SOC Dashboard & n8n Integration
              </h2>
              <p className="text-gray-600 mb-4">
                Das Operation Control Portal (SOC) dient zur Überwachung aller SMC-Services.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Vordefinierte Services</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>SMC-DMS</li>
                <li>SMC-Mailserver</li>
                <li>SMC-Monitoring</li>
                <li>SMC-PDF-Work</li>
                <li>SMC-Backup</li>
                <li>SMC-Website</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">n8n Webhook einrichten</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>In n8n einen neuen Workflow erstellen</li>
                <li>HTTP Request Node hinzufügen</li>
                <li>URL: <code className="bg-slate-100 px-1 rounded">https://domain/api/soc/ingest</code></li>
                <li>Header setzen: <code className="bg-slate-100 px-1 rounded">X-N8N-API-KEY</code></li>
              </ol>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Event-Typen</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><strong>error</strong> – Kritischer Fehler</li>
                <li><strong>warning</strong> – Warnung</li>
                <li><strong>info</strong> – Information</li>
                <li><strong>success</strong> – Erfolg</li>
                <li><strong>heartbeat</strong> – Service aktiv</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Umgebungsvariable</h3>
              <CodeBlock code={`# In .env
N8N_API_KEY=your-secure-api-key-here`} />
            </section>

            {/* Backup */}
            <section id="backup" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <RefreshCw className="w-6 h-6 text-orange-600" />
                Backup & Recovery System
              </h2>
              <p className="text-gray-600 mb-4">
                Das integrierte Backup-System ermöglicht Self-Healing und Disaster Recovery.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Backup-API</h3>
              <CodeBlock code={`# Backup herunterladen
GET /api/admin/backup → JSON-Datei

# Backup wiederherstellen (Upsert)
POST /api/admin/backup
Body: { ...backup-json }`} />

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Datenintegrität-API</h3>
              <CodeBlock code={`# Integrität prüfen
GET /api/admin/integrity

# Probleme beheben
POST /api/admin/integrity
Body: { "fixType": "orphaned" | "paths" | "all" }`} />

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Master-Seed</h3>
              <CodeBlock code={`# Seed ausführen (Upsert - keine Datenlöschung)
yarn prisma db seed

# Seed enthält:
# - Kategorien (Training, Reference, Project)
# - SOC Services
# - Kompetenzen
# - Profil-Daten
# - Seiteninhalte
# - Standard-Ordner`} />

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
                <p className="text-blue-800 font-medium">Upsert-Prinzip</p>
                <p className="text-blue-700 text-sm">
                  Sowohl Seed als auch Backup-Restore verwenden Upsert-Operationen.
                  Bestehende Daten werden niemals gelöscht, nur aktualisiert oder ergänzt.
                </p>
              </div>
            </section>

            {/* Deployment */}
            <section id="deployment" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Cloud className="w-6 h-6 text-orange-600" />
                Deployment
              </h2>
              
              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Docker Deployment</h3>
              <CodeBlock code={`# Build
cd nextjs_space
docker-compose build

# Start
docker-compose up -d

# Logs anzeigen
docker-compose logs -f

# Neustart
docker-compose restart`} />

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Umgebungsvariablen (.env)</h3>
              <CodeBlock code={`DATABASE_URL="postgresql://user:pass@host:5432/db"
NEXTAUTH_SECRET="<generated-secret>"
NEXTAUTH_URL="https://smc-office.eu"
N8N_API_KEY="<your-n8n-api-key>"
UPLOAD_STORAGE="local"
UPLOAD_DIR="uploads"`} />

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Portainer</h3>
              <p className="text-gray-600">
                Die Container werden über Portainer verwaltet. Zugriff unter:
                <code className="bg-slate-100 px-1 rounded ml-1">https://portainer.smc-office.eu</code>
              </p>
            </section>

            {/* Wartung */}
            <section id="wartung" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Settings className="w-6 h-6 text-orange-600" />
                Wartung
              </h2>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">PostgreSQL-Backup (manuell)</h3>
              <CodeBlock code={`# Dump erstellen
pg_dump -h <host> -U <user> -d <db> > backup_$(date +%Y%m%d).sql

# Wiederherstellen
psql -h <host> -U <user> -d <db> < backup.sql`} />

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Updates durchführen</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Code-Änderungen committen</li>
                <li>Container stoppen: <code className="bg-slate-100 px-1 rounded">docker-compose down</code></li>
                <li>Neu builden: <code className="bg-slate-100 px-1 rounded">docker-compose build</code></li>
                <li>Migrationen: <code className="bg-slate-100 px-1 rounded">yarn prisma migrate deploy</code></li>
                <li>Container starten: <code className="bg-slate-100 px-1 rounded">docker-compose up -d</code></li>
              </ol>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Log-Dateien</h3>
              <CodeBlock code={`# Docker Logs
docker-compose logs --tail=100 web

# In Datei speichern
docker-compose logs > app.log 2>&1`} />

              <div className="bg-green-50 border-l-4 border-green-500 p-4 mt-6">
                <p className="text-green-800 font-medium">Datenpersistenz</p>
                <p className="text-green-700 text-sm">
                  Alle Inhalte werden in der PostgreSQL-Datenbank und im Docker-Volume für Uploads gespeichert.
                  Sie bleiben auch bei App-Updates erhalten.
                </p>
              </div>
            </section>

            {/* Footer */}
            <div className="border-t pt-8 mt-12">
              <p className="text-gray-500 text-sm">
                Stand: Februar 2026 | SMC-Office Website v4.1 | Technisches Handbuch
              </p>
            </div>
          </motion.article>
        </div>
      </div>
    </main>
  );
}
