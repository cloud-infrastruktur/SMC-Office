"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FileText,
  Users,
  Briefcase,
  GraduationCap,
  Target,
  User,
  Download,
  Settings,
  ArrowRight,
  LayoutDashboard,
  Home,
  Mail,
  Server,
  Database,
  AlertTriangle,
  Building,
  Building2,
  ExternalLink,
  Shield,
  Calculator,
  Kanban,
  StickyNote,
  FolderKanban,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasAdminAccess } from "@/lib/types";

interface Stats {
  projects: number;
  references: number;
  trainings: number;
  competencies: number;
  downloads: number;
}

interface IntegrityStatus {
  healthy: boolean;
  orphanedCount: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    projects: 0,
    references: 0,
    trainings: 0,
    competencies: 0,
    downloads: 0,
  });
  const [integrity, setIntegrity] = useState<IntegrityStatus | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const role = (session?.user as { role?: string })?.role;
      if (!hasAdminAccess(role)) {
        router.push("/");
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [projectsRes, referencesRes, trainingsRes, competenciesRes, downloadsRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/references'),
          fetch('/api/trainings'),
          fetch('/api/competencies'),
          fetch('/api/downloads'),
        ]);
        
        const projects = projectsRes.ok ? await projectsRes.json() : [];
        const references = referencesRes.ok ? await referencesRes.json() : [];
        const trainings = trainingsRes.ok ? await trainingsRes.json() : [];
        const competencies = competenciesRes.ok ? await competenciesRes.json() : [];
        const downloadsData = downloadsRes.ok ? await downloadsRes.json() : { files: [] };
        const downloads = downloadsData.files || downloadsData || [];
        
        setStats({
          projects: projects.length || 0,
          references: references.length || 0,
          trainings: trainings.length || 0,
          competencies: competencies.length || 0,
          downloads: downloads.length || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    }
    
    async function checkIntegrity() {
      try {
        const res = await fetch('/api/admin/integrity');
        if (res.ok) {
          const data = await res.json();
          setIntegrity({
            healthy: data.healthy,
            orphanedCount: data.stats?.orphanedCount || 0,
          });
        }
      } catch (error) {
        console.error('Error checking integrity:', error);
      }
    }
    
    if (status === "authenticated") {
      fetchStats();
      checkIntegrity();
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const userRole = (session?.user as { role?: string })?.role;
  if (!session || !hasAdminAccess(userRole)) {
    return null;
  }

  // Öffnet eine Seite in einem neuen Tab
  const openInNewTab = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const adminModules = [
    {
      title: "Projekterfahrungen",
      description: "Alle Projekte bearbeiten, hinzufügen oder löschen",
      href: "/admin/projects",
      icon: Briefcase,
      count: stats.projects,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Referenzen",
      description: "Kundenreferenzen verwalten und mit Projekten verknüpfen",
      href: "/admin/references",
      icon: Users,
      count: stats.references,
      color: "from-green-500 to-green-600",
    },
    {
      title: "Zertifikate & Trainings",
      description: "Weiterbildungen und Zertifizierungen pflegen",
      href: "/admin/trainings",
      icon: GraduationCap,
      count: stats.trainings,
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Kompetenzen",
      description: "Kernkompetenzen und Spezialisierungen bearbeiten",
      href: "/admin/competencies",
      icon: Target,
      count: stats.competencies,
      color: "from-orange-500 to-orange-600",
    },
    {
      title: "Profil & Über mich",
      description: "Persönliche Daten und Firmeninformationen aktualisieren",
      href: "/admin/profile",
      icon: User,
      count: null,
      color: "from-pink-500 to-pink-600",
    },
    {
      title: "Downloads",
      description: "Dateien für den Download-Bereich verwalten",
      href: "/admin/downloads",
      icon: Download,
      count: stats.downloads,
      color: "from-cyan-500 to-cyan-600",
    },
  ];

  const systemModules = [
    {
      title: "SMC-CRM",
      description: "Kanban-Board, Deals, Kontakte & automatische E-Mail-Leads",
      href: "/admin/crm",
      icon: Kanban,
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Projekte",
      description: "CRM-Projekte verwalten, Module freigeben, Teams zuweisen",
      href: "/admin/crm?tab=projects",
      icon: FolderKanban,
      color: "from-violet-500 to-violet-600",
    },
    {
      title: "Notizen & ToDos",
      description: "Aufgaben, Backlog und Notizen mit CRM-Verknüpfung",
      href: "/admin/notes",
      icon: StickyNote,
      color: "from-amber-500 to-amber-600",
    },
    {
      title: "Kalender",
      description: "Termine verwalten, CalDAV-Integration (bald verfügbar)",
      href: "/admin/calendar",
      icon: Calendar,
      color: "from-rose-500 to-rose-600",
    },
    {
      title: "Operation Control Portal",
      description: "SMC Services überwachen und steuern (SOC Dashboard)",
      href: "/admin/soc",
      icon: LayoutDashboard,
      color: "from-indigo-500 to-indigo-600",
    },
    {
      title: "E-Mail Client",
      description: "Adaptive E-Mail-Verwaltung mit IMAP/SMTP-Unterstützung",
      href: "/admin/email",
      icon: Mail,
      color: "from-blue-500 to-cyan-600",
    },
    {
      title: "SMC-DMS",
      description: "Dokumentenmanagement-System mit Korrespondenten-Filter",
      href: "/admin/paperless",
      icon: FileText,
      color: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Buchhaltung",
      description: "SevDesk Sync - Dokumente für Steuervorbereitung exportieren",
      href: "/admin/accounting",
      icon: Calculator,
      color: "from-green-500 to-green-600",
    },
    {
      title: "Dateimanager",
      description: "Zentrale Dateiverwaltung mit PDF-Vorschau",
      href: "/admin/filemanager",
      icon: Home,
      color: "from-teal-500 to-teal-600",
    },
  ];

  const rbacModules = [
    {
      title: "Benutzerverwaltung",
      description: "Benutzer anlegen, bearbeiten und Rollen zuweisen (RBAC)",
      href: "/admin/users",
      icon: Users,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Organisationen",
      description: "Kunden-Organisationen verwalten, Benutzer & Kontakte zuordnen",
      href: "/admin/organizations",
      icon: Building2,
      color: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Kunden-Anonymisierung",
      description: "Kundenname ↔ Anonymisierter Begriff Matrix verwalten",
      href: "/admin/clients",
      icon: Building,
      color: "from-purple-500 to-purple-600",
    },
  ];

  const settingsModules = [
    {
      title: "SMTP-Konfiguration",
      description: "E-Mail-Server für Kontaktformular und Passwort-Reset",
      href: "/admin/smtp",
      icon: Server,
      color: "from-red-500 to-red-600",
    },
    {
      title: "Kategorien",
      description: "Kategorien für Projekte, Referenzen und Trainings verwalten",
      href: "/admin/categories",
      icon: Home,
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Seiteninhalte",
      description: "Home-Seite und Footer bearbeiten",
      href: "/admin/content",
      icon: Mail,
      color: "from-green-500 to-green-600",
    },
    {
      title: "Dokumentation",
      description: "Benutzer- und technisches Handbuch",
      href: "/admin/docs",
      icon: FileText,
      color: "from-indigo-500 to-indigo-600",
    },
    {
      title: "Backup & Recovery",
      description: "Datensicherung, Wiederherstellung und Integritätsprüfung",
      href: "/admin/backup",
      icon: Database,
      color: "from-amber-500 to-amber-600",
    },
  ];

  // Öffentliche Seiten für Vorschau
  const publicPages = [
    { name: "Home", href: "/" },
    { name: "Über mich", href: "/about" },
    { name: "Kompetenzen", href: "/competencies" },
    { name: "Projekterfahrungen", href: "/projects" },
    { name: "Referenz-Kunden", href: "/references" },
    { name: "Trainings", href: "/trainings" },
    { name: "Kontakt", href: "/contact" },
  ];

  return (
    <main className="min-h-screen section-compact bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container-adaptive">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">SMC Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Willkommen, {session.user?.name || 'Administrator'}</p>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mt-4">
            <div className="flex items-start gap-2">
              <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-300 text-sm">Inhalte dauerhaft verwalten</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Alle Änderungen werden in der Datenbank gespeichert und bleiben auch bei zukünftigen Updates erhalten.
                </p>
              </div>
            </div>
          </div>
          
          {/* Integrity Warning */}
          {integrity && !integrity.healthy && (
            <Link href="/admin/backup">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4 cursor-pointer hover:bg-amber-100 transition-colors">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">{integrity.orphanedCount} verwaiste Datensätze gefunden</p>
                    <p className="text-sm text-amber-700">
                      Klicken Sie hier, um die Datenintegrität zu prüfen und zu reparieren.
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </motion.div>

        {/* Admin Modules Grid */}
        <div className="grid-auto-fit">
          {adminModules.map((module, index) => (
            <motion.div
              key={module.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <Link href={module.href}>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer h-full border border-gray-100 dark:border-slate-700">
                  <div className={`h-1.5 bg-gradient-to-r ${module.color}`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${module.color}`}>
                        <module.icon className="w-5 h-5 text-white" />
                      </div>
                      {module.count !== null && (
                        <span className="text-xl font-bold text-gray-900 dark:text-white">{module.count}</span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-xs mb-3 line-clamp-2">{module.description}</p>
                    <div className="flex items-center text-blue-600 dark:text-blue-400 text-xs font-medium">
                      Verwalten
                      <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* RBAC Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Rollen & Berechtigungen (RBAC)
          </h2>
          <div className="grid-auto-fit">
            {rbacModules.map((module, index) => (
              <motion.div
                key={module.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 + index * 0.05 }}
              >
                <Link href={module.href}>
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer h-full border border-purple-100 dark:border-purple-800">
                    <div className={`h-1.5 bg-gradient-to-r ${module.color}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${module.color}`}>
                          <module.icon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {module.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-xs mb-3 line-clamp-2">{module.description}</p>
                      <div className="flex items-center text-purple-600 dark:text-purple-400 text-xs font-medium">
                        Verwalten
                        <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* System Section - Öffnet in neuem Fenster */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5" />
            System & Überwachung
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              (neues Fenster)
            </span>
          </h2>
          <div className="grid-auto-fit">
            {systemModules.map((module, index) => (
              <motion.div
                key={module.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 + index * 0.05 }}
              >
                <div
                  onClick={() => openInNewTab(module.href)}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer h-full border border-indigo-100 dark:border-indigo-800"
                >
                  <div className={`h-1.5 bg-gradient-to-r ${module.color}`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${module.color}`}>
                        <module.icon className="w-5 h-5 text-white" />
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-xs mb-3 line-clamp-2">{module.description}</p>
                    <div className="flex items-center text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                      Öffnen
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Settings Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Einstellungen
          </h2>
          <div className="grid-auto-fit">
            {settingsModules.map((module, index) => (
              <motion.div
                key={module.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55 + index * 0.05 }}
              >
                <Link href={module.href}>
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer h-full border border-gray-100 dark:border-slate-700">
                    <div className={`h-1.5 bg-gradient-to-r ${module.color}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${module.color}`}>
                          <module.icon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {module.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-xs mb-3 line-clamp-2">{module.description}</p>
                      <div className="flex items-center text-blue-600 dark:text-blue-400 text-xs font-medium">
                        Konfigurieren
                        <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Preview Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Seiten-Vorschau
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-slate-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              Öffnen Sie die öffentlichen Seiten in einem neuen Browser-Tab:
            </p>
            <div className="flex flex-wrap gap-2">
              {publicPages.map((page) => (
                <Button
                  key={page.href}
                  variant="outline"
                  size="sm"
                  onClick={() => openInNewTab(page.href)}
                  className="gap-1.5 text-xs h-8"
                >
                  <ExternalLink className="w-3 h-3" />
                  {page.name}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
