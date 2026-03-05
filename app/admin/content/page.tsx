"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Save, ArrowLeft, Home, FileText, User, Briefcase, Building2, 
  Award, Pencil, ExternalLink, Eye, ChevronRight, Database,
  Users, Settings, FolderOpen
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface PageContent {
  id: string;
  page: string;
  section: string;
  content: string;
  sortOrder: number;
}

interface ContentStats {
  projects: number;
  references: number;
  trainings: number;
  competencies: number;
  clients: number;
}

// Content-Bereiche Definition
const contentAreas = [
  { 
    id: "profile", 
    title: "Profil & Über mich", 
    description: "Persönliche Daten, Berufserfahrung, Motto",
    icon: User,
    href: "/admin/profile",
    color: "from-blue-500 to-blue-600"
  },
  { 
    id: "competencies", 
    title: "Kompetenzen", 
    description: "Kernkompetenzen und Fähigkeiten",
    icon: Award,
    href: "/admin/competencies",
    color: "from-purple-500 to-purple-600"
  },
  { 
    id: "projects", 
    title: "Projekterfahrungen", 
    description: "Projekthistorie und Referenzprojekte",
    icon: Briefcase,
    href: "/admin/projects",
    color: "from-green-500 to-green-600"
  },
  { 
    id: "references", 
    title: "Referenz-Kunden", 
    description: "Kundenreferenzen nach Branchen",
    icon: Building2,
    href: "/admin/references",
    color: "from-orange-500 to-orange-600"
  },
  { 
    id: "trainings", 
    title: "Zertifikate & Trainings", 
    description: "Ausbildungen und Zertifizierungen",
    icon: Award,
    href: "/admin/trainings",
    color: "from-red-500 to-red-600"
  },
  { 
    id: "clients", 
    title: "Kunden-Referenzen", 
    description: "Kundenfeedback und Testimonials",
    icon: Users,
    href: "/admin/clients",
    color: "from-teal-500 to-teal-600"
  },
];

export default function ContentAdmin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string>("overview");
  const [contents, setContents] = useState<PageContent[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<ContentStats>({ projects: 0, references: 0, trainings: 0, competencies: 0, clients: 0 });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const userRole = (session?.user as any)?.role;
      if (!["admin", "ADMIN"].includes(userRole)) {
        router.push("/");
      }
    }
  }, [session, status, router]);

  useEffect(() => {
    fetchContents();
    fetchStats();
  }, [selectedPage]);

  const fetchStats = async () => {
    try {
      const [projectsRes, referencesRes, trainingsRes, competenciesRes, clientsRes] = await Promise.all([
        fetch("/api/projects").then(r => r.ok ? r.json() : []),
        fetch("/api/references").then(r => r.ok ? r.json() : []),
        fetch("/api/trainings").then(r => r.ok ? r.json() : []),
        fetch("/api/competencies").then(r => r.ok ? r.json() : []),
        fetch("/api/admin/clients").then(r => r.ok ? r.json() : []),
      ]);
      setStats({
        projects: Array.isArray(projectsRes) ? projectsRes.length : 0,
        references: Array.isArray(referencesRes) ? referencesRes.length : 0,
        trainings: Array.isArray(trainingsRes) ? trainingsRes.length : 0,
        competencies: Array.isArray(competenciesRes) ? competenciesRes.length : 0,
        clients: Array.isArray(clientsRes) ? clientsRes.length : 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchContents = async () => {
    if (selectedPage === "overview") {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/admin/pages?page=${selectedPage}`);
      const data = await response.json();
      setContents(data.contents || []);
      
      // Formular mit vorhandenen Daten füllen
      const initialData: Record<string, string> = {};
      (data.contents || []).forEach((content: PageContent) => {
        initialData[content.section] = content.content;
      });
      setFormData(initialData);
    } catch (error) {
      console.error("Error fetching contents:", error);
      toast({ title: "Fehler", description: "Inhalte konnten nicht geladen werden", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (section: string) => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: selectedPage,
          section,
          content: formData[section] || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Speichern");
      }

      toast({ title: "Erfolg", description: "Inhalt gespeichert" });
      fetchContents();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const homeFields = [
    { section: "hero_title", label: "Hero Titel", type: "text" },
    { section: "hero_subtitle", label: "Hero Untertitel", type: "textarea" },
    { section: "about_title", label: "Über mich - Titel", type: "text" },
    { section: "about_text", label: "Über mich - Text", type: "textarea" },
    { section: "competencies_title", label: "Kompetenzen - Titel", type: "text" },
    { section: "competencies_subtitle", label: "Kompetenzen - Untertitel", type: "textarea" },
  ];

  const footerFields = [
    { section: "company_name", label: "Firmenname", type: "text" },
    { section: "company_description", label: "Firmenbeschreibung", type: "textarea" },
    { section: "address_line1", label: "Adresse Zeile 1", type: "text" },
    { section: "address_line2", label: "Adresse Zeile 2", type: "text" },
    { section: "email", label: "E-Mail", type: "text" },
    { section: "website", label: "Website", type: "text" },
  ];

  const fields = selectedPage === "home" ? homeFields : footerFields;

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lädt...</p>
        </div>
      </div>
    );
  }

  const getStatForArea = (id: string): number => {
    switch (id) {
      case "projects": return stats.projects;
      case "references": return stats.references;
      case "trainings": return stats.trainings;
      case "competencies": return stats.competencies;
      case "clients": return stats.clients;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zum Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent pb-1">
            Content Management
          </h1>
          <p className="text-gray-600 mt-2">Verwalten Sie alle Inhalte der Website zentral</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedPage === "overview" ? "default" : "outline"}
              onClick={() => setSelectedPage("overview")}
            >
              <Database className="w-4 h-4 mr-2" />
              Übersicht
            </Button>
            <Button
              variant={selectedPage === "home" ? "default" : "outline"}
              onClick={() => setSelectedPage("home")}
            >
              <Home className="w-4 h-4 mr-2" />
              Home-Texte
            </Button>
            <Button
              variant={selectedPage === "footer" ? "default" : "outline"}
              onClick={() => setSelectedPage("footer")}
            >
              <FileText className="w-4 h-4 mr-2" />
              Footer-Texte
            </Button>
          </div>
        </div>

        {/* Overview Tab */}
        {selectedPage === "overview" && (
          <div className="space-y-8">
            {/* Content Areas Grid */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-600" />
                Inhaltsbereiche
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentAreas.map((area, index) => {
                  const Icon = area.icon;
                  const count = getStatForArea(area.id);
                  return (
                    <motion.div
                      key={area.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link href={area.href}>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
                          <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-lg bg-gradient-to-br ${area.color}`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            {count > 0 && (
                              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {count} Einträge
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {area.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">{area.description}</p>
                          <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                            Bearbeiten
                            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                Schnellzugriff
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/admin/profile">
                  <Button variant="outline" className="w-full justify-start">
                    <User className="w-4 h-4 mr-2" />
                    Profil bearbeiten
                  </Button>
                </Link>
                <Link href="/admin/filemanager">
                  <Button variant="outline" className="w-full justify-start">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Dateien verwalten
                  </Button>
                </Link>
                <Link href="/admin/downloads">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    Downloads konfigurieren
                  </Button>
                </Link>
                <Link href="/" target="_blank">
                  <Button variant="outline" className="w-full justify-start">
                    <Eye className="w-4 h-4 mr-2" />
                    Website ansehen
                  </Button>
                </Link>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ So funktioniert das Content Management</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Klicken Sie auf einen <strong>Inhaltsbereich</strong> um die jeweiligen Einträge zu bearbeiten</li>
                <li>• Unter <strong>Home-Texte</strong> und <strong>Footer-Texte</strong> können Sie allgemeine Webseitentexte anpassen</li>
                <li>• Alle Änderungen werden sofort auf der Website sichtbar</li>
              </ul>
            </div>
          </div>
        )}

        {/* Home/Footer Content Fields */}
        {selectedPage !== "overview" && (
          <>
            <div className="space-y-6">
              {fields.map((field) => (
                <div key={field.section} className="bg-white rounded-lg shadow-sm p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                  </label>
                  {field.type === "textarea" ? (
                    <Textarea
                      value={formData[field.section] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.section]: e.target.value })
                      }
                      rows={4}
                      placeholder={`${field.label} eingeben...`}
                    />
                  ) : (
                    <Input
                      value={formData[field.section] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.section]: e.target.value })
                      }
                      placeholder={`${field.label} eingeben...`}
                    />
                  )}
                  <div className="mt-3">
                    <Button
                      onClick={() => handleSave(field.section)}
                      disabled={saving}
                      size="sm"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? "Speichere..." : "Speichern"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Info Box */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Hinweis</h3>
              <p className="text-sm text-blue-800">
                Änderungen werden sofort auf der Website sichtbar. Bitte speichern Sie jedes Feld einzeln.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
