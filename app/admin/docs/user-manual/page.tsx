'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Home,
  User,
  Briefcase,
  Users,
  GraduationCap,
  Download,
  Mail,
  LogIn,
  Menu,
  X,
  Settings,
  Database,
  Shield,
  FolderOpen,
  FileText,
  Calendar,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const sections = [
  { id: 'einfuehrung', title: 'Einführung', icon: BookOpen },
  { id: 'navigation', title: 'Navigation', icon: Menu },
  { id: 'startseite', title: 'Startseite', icon: Home },
  { id: 'ueber-mich', title: 'Über mich', icon: User },
  { id: 'projekterfahrungen', title: 'Projekterfahrungen', icon: Briefcase },
  { id: 'referenzen', title: 'Referenzen', icon: Users },
  { id: 'trainings', title: 'Zertifikate & Trainings', icon: GraduationCap },
  { id: 'downloads', title: 'Download-Bereich', icon: Download },
  { id: 'kontakt', title: 'Kontakt', icon: Mail },
  { id: 'anmeldung', title: 'Anmeldung & Registrierung', icon: LogIn },
  { id: 'admin-bereich', title: 'SMC Dashboard', icon: Settings },
  { id: 'crm', title: 'SMC-CRM', icon: FolderOpen },
  { id: 'kalender', title: 'Kalender', icon: Calendar },
  { id: 'email', title: 'E-Mail-Client', icon: Inbox },
  { id: 'backup', title: 'Backup & Wiederherstellung', icon: Database },
];

export default function UserManualPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('einfuehrung');
  const [showToc, setShowToc] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

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
          className="bg-blue-600 hover:bg-blue-700 rounded-full w-12 h-12 shadow-lg"
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
                      ? 'bg-blue-100 text-blue-700'
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
          <Link href="/admin/docs" className="inline-flex items-center text-slate-500 hover:text-blue-600 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zur Dokumentation
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">Benutzerhandbuch</h1>
          <p className="text-gray-600 mt-2">SMC-Office Website – Vollständige Benutzeranleitung</p>
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
                        ? 'bg-blue-100 text-blue-700 font-medium'
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
            className="flex-1 bg-white rounded-xl shadow-lg p-8 prose prose-slate max-w-none"
          >
            {/* Einführung */}
            <section id="einfuehrung" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-blue-600" />
                Einführung
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Willkommen bei der SMC-Office Website von Schwarz Management Consulting. Diese Plattform präsentiert 
                das umfangreiche Portfolio an Projekterfahrungen, Referenzen und Qualifikationen von Thomas Schwarz 
                als erfahrener IT-Berater und Projektmanager.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
                <p className="text-blue-800 font-medium">Wichtiger Hinweis</p>
                <p className="text-blue-700 text-sm">
                  Für den Zugang zum Download-Bereich ist eine Registrierung erforderlich. 
                  Die Freischaltung erfolgt nach manueller Prüfung durch den Administrator.
                </p>
              </div>
            </section>

            {/* Navigation */}
            <section id="navigation" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Menu className="w-6 h-6 text-blue-600" />
                Navigation
              </h2>
              <p className="text-gray-600 mb-4">
                Die Hauptnavigation befindet sich im Header der Website und enthält folgende Menüpunkte:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Startseite</strong> – Übersicht und Kernkompetenzen</li>
                <li><strong>Über mich</strong> – Profil und Qualifikationen</li>
                <li><strong>Projekterfahrungen</strong> – Detaillierte Projekthistorie</li>
                <li><strong>Referenzen</strong> – Kundenreferenzen nach Branchen</li>
                <li><strong>Zertifikate & Trainings</strong> – Weiterbildungen</li>
                <li><strong>Downloads</strong> – Geschützter Bereich für Dokumente</li>
                <li><strong>Kontakt</strong> – Kontaktformular</li>
              </ul>
              <p className="text-gray-600 mt-4">
                Auf mobilen Geräten wird die Navigation als Hamburger-Menü angezeigt.
              </p>
            </section>

            {/* Startseite */}
            <section id="startseite" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Home className="w-6 h-6 text-blue-600" />
                Startseite
              </h2>
              <p className="text-gray-600 mb-4">
                Die Startseite bietet einen Überblick über das Leistungsportfolio:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Hero-Bereich</strong> – Kurze Vorstellung mit Projektanzahl</li>
                <li><strong>Kernkompetenzen</strong> – Grafische Darstellung der Hauptqualifikationen</li>
                <li><strong>Customer Journey</strong> – Typischer Projektablauf</li>
                <li><strong>Aktuelle Projekte</strong> – Ausgewählte Referenzprojekte</li>
              </ul>
            </section>

            {/* Über mich */}
            <section id="ueber-mich" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <User className="w-6 h-6 text-blue-600" />
                Über mich
              </h2>
              <p className="text-gray-600 mb-4">
                Die „Über mich"-Seite enthält detaillierte Informationen zum beruflichen Werdegang:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Persönliches Profil und Expertise</li>
                <li>Berufserfahrung mit Zeitangaben</li>
                <li>Ausbildung und Qualifikationen</li>
                <li>Highlights der wichtigsten Zertifizierungen</li>
              </ul>
            </section>

            {/* Projekterfahrungen */}
            <section id="projekterfahrungen" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Briefcase className="w-6 h-6 text-blue-600" />
                Projekterfahrungen
              </h2>
              <p className="text-gray-600 mb-4">
                Alle durchgeführten Projekte werden chronologisch (neueste zuerst) dargestellt. 
                Jedes Projekt enthält:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Kunde</strong> – Name des Auftraggebers</li>
                <li><strong>Zeitraum</strong> – Start- und Enddatum</li>
                <li><strong>Rolle</strong> – Ausgeübte Funktion im Projekt</li>
                <li><strong>Zielsetzung</strong> – Projektziele</li>
                <li><strong>Highlights</strong> – Besondere Erfolge</li>
                <li><strong>Technologien</strong> – Eingesetzte Tools und Methoden</li>
                <li><strong>Kategorie</strong> – Thematische Einordnung (optional)</li>
              </ul>
              <p className="text-gray-600 mt-4">
                Klicken Sie auf ein Projekt, um die vollständigen Details anzuzeigen.
              </p>
            </section>

            {/* Referenzen */}
            <section id="referenzen" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600" />
                Referenzen
              </h2>
              <p className="text-gray-600 mb-4">
                Die Referenzen sind nach Branchen gruppiert:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Banken & Finanzdienstleistungen</strong></li>
                <li><strong>Öffentlicher Dienst</strong></li>
                <li><strong>Industrie</strong></li>
              </ul>
              <p className="text-gray-600 mt-4">
                Jede Referenz zeigt den Kunden, den Betreuungszeitraum und den Schwerpunkt der Zusammenarbeit. 
                Verknüpfte Projekte können direkt aufgerufen werden.
              </p>
            </section>

            {/* Trainings */}
            <section id="trainings" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <GraduationCap className="w-6 h-6 text-blue-600" />
                Zertifikate & Trainings
              </h2>
              <p className="text-gray-600 mb-4">
                Alle Weiterbildungen und Zertifizierungen sind nach Kategorien sortiert:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>IT-Service Management (ITIL)</li>
                <li>Management & Führung</li>
                <li>Prozessmanagement</li>
                <li>Projektmanagement (PRINCE2)</li>
                <li>Kommunikation</li>
                <li>Agile Methoden (Scrum)</li>
                <li>Sprachen</li>
              </ul>
            </section>

            {/* Downloads */}
            <section id="downloads" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Download className="w-6 h-6 text-blue-600" />
                Download-Bereich
              </h2>
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 my-4">
                <p className="text-amber-800 font-medium">Zugriff nur nach Freischaltung</p>
                <p className="text-amber-700 text-sm">
                  Der Download-Bereich ist nur für registrierte und freigeschaltete Benutzer zugänglich.
                </p>
              </div>
              <p className="text-gray-600 mb-4">
                Im Download-Bereich finden Sie:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Profil</strong> – Beraterprofil als PDF</li>
                <li><strong>Referenzen</strong> – Referenzschreiben</li>
                <li><strong>Trainings</strong> – Zertifikate und Nachweise</li>
                <li><strong>Zertifikate</strong> – Weitere Zertifikate</li>
              </ul>
              <p className="text-gray-600 mt-4">
                Die Dateien sind nach Kategorien organisiert (Tabs) und können einzeln heruntergeladen werden.
              </p>
            </section>

            {/* Kontakt */}
            <section id="kontakt" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Mail className="w-6 h-6 text-blue-600" />
                Kontakt
              </h2>
              <p className="text-gray-600 mb-4">
                Über das Kontaktformular können Sie direkt Anfragen stellen. Bitte füllen Sie folgende Felder aus:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Name</strong> (Pflichtfeld)</li>
                <li><strong>E-Mail</strong> (Pflichtfeld)</li>
                <li><strong>Telefon</strong> (optional)</li>
                <li><strong>Betreff</strong></li>
                <li><strong>Nachricht</strong> (Pflichtfeld)</li>
              </ul>
              <p className="text-gray-600 mt-4">
                Nach dem Absenden erhalten Sie eine Bestätigung. Die Antwort erfolgt zeitnah per E-Mail.
              </p>
            </section>

            {/* Anmeldung */}
            <section id="anmeldung" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <LogIn className="w-6 h-6 text-blue-600" />
                Anmeldung & Registrierung
              </h2>
              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Registrierung</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Klicken Sie auf „Registrieren" im Header</li>
                <li>Geben Sie Ihren Namen, E-Mail und ein Passwort ein</li>
                <li>Bestätigen Sie das Passwort</li>
                <li>Nach der Registrierung warten Sie auf die Freischaltung durch den Administrator</li>
              </ol>
              
              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Anmeldung</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Klicken Sie auf „Login" im Header</li>
                <li>Geben Sie Ihre E-Mail und Ihr Passwort ein</li>
                <li>Bei erfolgreicher Anmeldung werden Sie zum Download-Bereich weitergeleitet</li>
              </ol>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Passwort vergessen</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Klicken Sie auf „Passwort vergessen?" auf der Login-Seite</li>
                <li>Geben Sie Ihre E-Mail-Adresse ein</li>
                <li>Sie erhalten einen Link zum Zurücksetzen des Passworts</li>
                <li>Setzen Sie ein neues Passwort</li>
              </ol>
            </section>

            {/* SMC Dashboard */}
            <section id="admin-bereich" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-600" />
                SMC Dashboard
              </h2>
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 my-4">
                <p className="text-purple-800 font-medium">Nur für Administratoren</p>
                <p className="text-purple-700 text-sm">
                  Der SMC Dashboard ist nur für Benutzer mit Admin- oder Manager-Rolle zugänglich.
                </p>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Content-Management</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Projekte</strong> – Projekterfahrungen bearbeiten, hinzufügen, löschen</li>
                <li><strong>Referenzen</strong> – Kundenreferenzen verwalten</li>
                <li><strong>Trainings</strong> – Zertifikate und Weiterbildungen pflegen</li>
                <li><strong>Kompetenzen</strong> – Kernkompetenzen bearbeiten</li>
                <li><strong>Kategorien</strong> – Kategorien für Projekte, Referenzen und Trainings</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Dateiverwaltung</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Downloads</strong> – Dateien für den geschützten Bereich hochladen</li>
                <li><strong>Dateimanager</strong> – Ordnerstruktur für interne Dokumente</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">System-Module</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>SOC Dashboard</strong> – Überwachung aller SMC-Services</li>
                <li><strong>SMC-DMS</strong> – DMS-Integration</li>
                <li><strong>Backup & Recovery</strong> – Datensicherung und Wiederherstellung</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Einstellungen</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Profil & Über mich</strong> – Profilinformationen bearbeiten</li>
                <li><strong>Seiteninhalte</strong> – Hero-Bereich und Footer anpassen</li>
                <li><strong>SMTP</strong> – E-Mail-Server Konfiguration</li>
                <li><strong>Dokumentation</strong> – Diese Dokumentation</li>
              </ul>
            </section>

            {/* SMC-CRM */}
            <section id="crm" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <FolderOpen className="w-6 h-6 text-blue-600" />
                SMC-CRM
              </h2>
              <p className="text-gray-600 mb-4">
                Das Customer Relationship Management (CRM) Modul ist ein zentrales Werkzeug zur 
                Verwaltung von Projektanfragen, Leads und Geschäftsmöglichkeiten. Es integriert 
                automatische E-Mail-Analyse und ein Kanban-Board basierend auf Pipedrive-Konzepten.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Kanban-Board</h3>
              <p className="text-gray-600 mb-2">
                Das Kanban-Board visualisiert alle Deals in 6 Phasen:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li><strong>Projektanfrage</strong> – Neue Anfragen (automatisch aus E-Mail-Scan)</li>
                <li><strong>In Abstimmung</strong> – Klärung mit der Beratung</li>
                <li><strong>Profil vorgestellt</strong> – Profil beim Endkunden präsentiert</li>
                <li><strong>Interview</strong> – Kundengespräch terminiert</li>
                <li><strong>Auftrag liegt vor</strong> – Bestätigter Auftrag</li>
                <li><strong>Vertragsabstimmung</strong> – Vertragliche Finalisierung</li>
              </ol>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Deals verwalten</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Klicken Sie auf eine Deal-Karte, um Details anzuzeigen</li>
                <li>Ziehen Sie Karten zwischen Phasen (Drag & Drop)</li>
                <li>Klicken Sie auf „+ Deal", um einen neuen Deal manuell zu erstellen</li>
                <li>Jeder Deal zeigt: Titel, Kontakt, Wert, Wahrscheinlichkeit, Keywords</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Kontakte</h3>
              <p className="text-gray-600 mb-2">
                Im Tab „Kontakte" verwalten Sie Lead-Stammdaten:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Vorname/Nachname</strong> – Kontaktname</li>
                <li><strong>E-Mail</strong> – Eindeutige E-Mail-Adresse</li>
                <li><strong>Telefon/Mobil</strong> – Telefonnummern</li>
                <li><strong>Firma</strong> – Unternehmen des Kontakts</li>
                <li><strong>Position</strong> – Jobtitel</li>
                <li><strong>LinkedIn/XING</strong> – Profil-URLs</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Keyword-Konfiguration</h3>
              <p className="text-gray-600 mb-2">
                Im Tab „Keywords" konfigurieren Sie die automatische E-Mail-Erkennung:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Keywords</strong> – Suchbegriffe (z.B. „ITIL", „Projektmanagement")</li>
                <li><strong>Blacklist</strong> – E-Mail-Adressen/Domains die ignoriert werden</li>
                <li><strong>Betreff durchsuchen</strong> – Aktiviert Keyword-Suche im Betreff</li>
                <li><strong>Inhalt durchsuchen</strong> – Aktiviert Keyword-Suche im E-Mail-Text</li>
              </ul>
              <p className="text-gray-600 mt-2">
                Klicken Sie auf „+ Keyword", um neue Suchbegriffe hinzuzufügen, 
                oder auf das × neben einem Keyword, um es zu entfernen.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">E-Mail-Scan</h3>
              <div className="bg-green-50 border-l-4 border-green-500 p-4 my-4">
                <p className="text-green-800 font-medium">Automatische Lead-Generierung</p>
                <p className="text-green-700 text-sm">
                  Die „Mails scannen"-Funktion durchsucht Ihr Postfach nach relevanten Anfragen 
                  und erstellt automatisch Kontakte und Deals.
                </p>
              </div>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Klicken Sie auf „Mails scannen" für einen manuellen Scan</li>
                <li>Der automatische Scan kann über n8n-Workflow eingerichtet werden</li>
                <li>Nach dem Scan erscheint eine Zusammenfassung der gefundenen Matches</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Statistiken</h3>
              <p className="text-gray-600 mb-2">
                Die Statistik-Leiste am oberen Rand zeigt:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Offene Deals</strong> – Noch nicht gewonnene Deals</li>
                <li><strong>Gewonnen</strong> – Erfolgreich abgeschlossene Deals</li>
                <li><strong>Win-Rate</strong> – Prozentsatz gewonnener Deals</li>
                <li><strong>Pipeline-Wert</strong> – Gesamtwert aller offenen Deals</li>
                <li><strong>Kontakte</strong> – Anzahl der Kontakte</li>
                <li><strong>Auto-Matches</strong> – Durch Keyword-Scan gefundene Deals</li>
              </ul>
            </section>

            {/* Kalender */}
            <section id="kalender" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-blue-600" />
                Kalender
              </h2>
              <p className="text-gray-600 mb-4">
                Der integrierte Kalender bietet vollständige CalDAV-Unterstützung und nahtlose 
                Integration mit Apple iCloud, Nextcloud und anderen CalDAV-kompatiblen Diensten.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Ansichten</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Tagesansicht</strong> – Detaillierte Übersicht eines Tages mit Zeitslots</li>
                <li><strong>Wochenansicht</strong> – 7-Tage-Übersicht mit allen Terminen</li>
                <li><strong>Monatsansicht</strong> – Kalenderblatt mit Monatsüberblick</li>
                <li><strong>Agenda</strong> – Listenansicht aller kommenden Termine</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Termine erstellen</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Klicken Sie auf einen Tag oder eine Zeit im Kalender</li>
                <li>Geben Sie Titel, Beschreibung und Ort ein</li>
                <li>Wählen Sie Start- und Endzeit</li>
                <li>Optional: Verknüpfen Sie mit CRM-Kontakten oder Deals</li>
                <li>Aktivieren Sie Wiederholungen für regelmäßige Termine</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">CalDAV-Konten</h3>
              <p className="text-gray-600 mb-2">
                Im Kalender-Einstellungsbereich können Sie externe Kalenderkonten verbinden:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Apple iCloud</strong> – Nutzen Sie Ihr App-spezifisches Passwort</li>
                <li><strong>Nextcloud</strong> – Verbinden Sie mit Ihrer Nextcloud-Instanz</li>
                <li><strong>Generisch CalDAV</strong> – Jeder CalDAV-kompatible Server</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">CRM-Integration</h3>
              <p className="text-gray-600 mb-2">
                Der Kalender ist vollständig mit dem SMC-CRM verbunden:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Termine werden automatisch mit CRM-Kontakten verknüpft (per E-Mail-Adresse)</li>
                <li>Deal-Follow-ups erscheinen als Kalendereinträge</li>
                <li>Projekt-Deadlines werden automatisch angezeigt</li>
              </ul>
            </section>

            {/* E-Mail-Client */}
            <section id="email" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Inbox className="w-6 h-6 text-blue-600" />
                E-Mail-Client
              </h2>
              <p className="text-gray-600 mb-4">
                Der integrierte E-Mail-Client ermöglicht die Verwaltung Ihrer geschäftlichen 
                E-Mails direkt im SMC Dashboard mit voller IMAP/SMTP-Unterstützung.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Posteingang</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Vollständige E-Mail-Ansicht mit HTML-Rendering</li>
                <li>Anhänge anzeigen und herunterladen</li>
                <li>Antworten und Weiterleiten von E-Mails</li>
                <li>Ordnerstruktur (Inbox, Gesendet, Entwürfe, Papierkorb)</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Ordnerverwaltung</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Neue Ordner</strong> – Rechtsklick → „Neuer Ordner"</li>
                <li><strong>Umbenennen</strong> – Rechtsklick → „Umbenennen"</li>
                <li><strong>Löschen</strong> – Rechtsklick → „Löschen"</li>
                <li><strong>Verschieben</strong> – E-Mails per Drag & Drop in Ordner verschieben</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Meeting-Einladungen</h3>
              <p className="text-gray-600 mb-2">
                ICS-Anhänge werden automatisch erkannt:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Meeting-Details werden angezeigt (Titel, Zeit, Ort, Teilnehmer)</li>
                <li>Ein-Klick-Annahme oder Ablehnung</li>
                <li>Automatische Übernahme in den Kalender</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">E-Mail-Konten einrichten</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Navigieren Sie zu Einstellungen → E-Mail-Konten</li>
                <li>Fügen Sie IMAP-Server, Port und Zugangsdaten hinzu</li>
                <li>Konfigurieren Sie SMTP für den Versand</li>
                <li>Aktivieren Sie SSL/TLS für sichere Verbindungen</li>
              </ul>
            </section>

            {/* Backup */}
            <section id="backup" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Database className="w-6 h-6 text-blue-600" />
                Backup & Wiederherstellung
              </h2>
              <p className="text-gray-600 mb-4">
                Das Backup-Modul ermöglicht die Sicherung und Wiederherstellung aller Website-Inhalte.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Backup erstellen</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Öffnen Sie Admin → Backup & Recovery</li>
                <li>Klicken Sie auf „Backup herunterladen"</li>
                <li>Eine JSON-Datei mit allen Inhalten wird heruntergeladen</li>
                <li>Speichern Sie diese Datei sicher ab</li>
              </ol>
              <div className="bg-green-50 border-l-4 border-green-500 p-4 my-4">
                <p className="text-green-800 font-medium">Sicherheitshinweis</p>
                <p className="text-green-700 text-sm">
                  Passwörter und API-Tokens werden aus Sicherheitsgründen NICHT exportiert.
                </p>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Backup wiederherstellen</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Öffnen Sie Admin → Backup & Recovery</li>
                <li>Klicken Sie auf „Backup-Datei auswählen"</li>
                <li>Wählen Sie eine zuvor erstellte JSON-Datei</li>
                <li>Die Daten werden automatisch wiederhergestellt</li>
              </ol>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
                <p className="text-blue-800 font-medium">Upsert-Modus</p>
                <p className="text-blue-700 text-sm">
                  Die Wiederherstellung verwendet Upsert – bestehende Daten werden NICHT gelöscht, 
                  sondern aktualisiert oder hinzugefügt.
                </p>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Datenintegrität prüfen</h3>
              <p className="text-gray-600 mb-2">
                Das System prüft automatisch die Datenintegrität:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Verwaiste Datensätze</strong> – Einträge mit ungültigen Kategorie-Verknüpfungen</li>
                <li><strong>Absolute Pfade</strong> – Entwicklungsumgebungs-Altlasten in Dateipfaden</li>
              </ul>
              <p className="text-gray-600 mt-4">
                Bei gefundenen Problemen erscheint eine Warnung mit der Option „Reparieren".
              </p>
            </section>

            {/* Footer */}
            <div className="border-t pt-8 mt-12">
              <p className="text-gray-500 text-sm">
                Stand: Februar 2026 | SMC-Office Website v4.1
              </p>
            </div>
          </motion.article>
        </div>
      </div>
    </main>
  );
}
