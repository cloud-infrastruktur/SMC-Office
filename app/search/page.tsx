"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  Loader2,
  FileText,
  Award,
  FolderKanban,
  Building,
  GraduationCap,
  ArrowRight,
  SearchX,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchResult {
  type: 'competency' | 'project' | 'reference' | 'training' | 'page';
  title: string;
  description: string;
  href: string;
  category?: string;
}

// Statische Seiten für die Suche
const STATIC_PAGES: SearchResult[] = [
  { type: 'page', title: 'Startseite', description: 'Willkommen bei SMC - IT-Management Consulting', href: '/' },
  { type: 'page', title: 'Über mich', description: 'Profil und Hintergrund des IT-Management Consultants', href: '/about' },
  { type: 'page', title: 'Kontakt', description: 'Kontaktformular und Kontaktdaten', href: '/contact' },
  { type: 'page', title: 'Kompetenzen', description: 'IT-Service Management, Projektmanagement und mehr', href: '/competencies' },
  { type: 'page', title: 'Projekterfahrungen', description: 'Übersicht der durchgeführten Projekte', href: '/projects' },
  { type: 'page', title: 'Referenz-Kunden', description: 'Kunden nach Branchen sortiert', href: '/references' },
  { type: 'page', title: 'Zertifikate & Trainings', description: 'Ausbildungen und Zertifizierungen', href: '/trainings' },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (query.trim()) {
      performSearch(query);
    } else {
      setResults([]);
      setSearched(false);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    setSearched(true);

    try {
      // Lokale Suche in statischen Seiten
      const normalizedQuery = searchQuery.toLowerCase().trim();
      const pageResults = STATIC_PAGES.filter(page =>
        page.title.toLowerCase().includes(normalizedQuery) ||
        page.description.toLowerCase().includes(normalizedQuery)
      );

      // API-Suche für dynamische Inhalte
      const [competenciesRes, projectsRes, referencesRes, trainingsRes] = await Promise.all([
        fetch('/api/competencies').then(r => r.json()).catch(() => []),
        fetch('/api/projects').then(r => r.json()).catch(() => []),
        fetch('/api/references').then(r => r.json()).catch(() => []),
        fetch('/api/trainings').then(r => r.json()).catch(() => []),
      ]);

      const dynamicResults: SearchResult[] = [];

      // Kompetenzen durchsuchen
      (Array.isArray(competenciesRes) ? competenciesRes : []).forEach((item: any) => {
        if (
          item.title?.toLowerCase().includes(normalizedQuery) ||
          item.description?.toLowerCase().includes(normalizedQuery)
        ) {
          dynamicResults.push({
            type: 'competency',
            title: item.title,
            description: item.description?.substring(0, 150) + '...',
            href: '/competencies',
            category: item.category,
          });
        }
      });

      // Projekte durchsuchen
      (Array.isArray(projectsRes) ? projectsRes : []).forEach((item: any) => {
        if (
          item.title?.toLowerCase().includes(normalizedQuery) ||
          item.client?.toLowerCase().includes(normalizedQuery) ||
          item.objective?.toLowerCase().includes(normalizedQuery)
        ) {
          dynamicResults.push({
            type: 'project',
            title: item.title,
            description: `${item.client} - ${item.objective?.substring(0, 100)}...`,
            href: '/projects',
            category: item.period,
          });
        }
      });

      // Referenzen durchsuchen
      (Array.isArray(referencesRes) ? referencesRes : []).forEach((item: any) => {
        if (item.name?.toLowerCase().includes(normalizedQuery)) {
          dynamicResults.push({
            type: 'reference',
            title: item.name,
            description: `Branche: ${item.industry}`,
            href: '/references',
            category: item.industry,
          });
        }
      });

      // Trainings durchsuchen
      (Array.isArray(trainingsRes) ? trainingsRes : []).forEach((item: any) => {
        if (
          item.title?.toLowerCase().includes(normalizedQuery) ||
          item.provider?.toLowerCase().includes(normalizedQuery)
        ) {
          dynamicResults.push({
            type: 'training',
            title: item.title,
            description: `${item.provider} - ${item.date}`,
            href: '/trainings',
            category: item.category,
          });
        }
      });

      setResults([...pageResults, ...dynamicResults]);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'competency':
        return <Award className="w-5 h-5 text-blue-500" />;
      case 'project':
        return <FolderKanban className="w-5 h-5 text-green-500" />;
      case 'reference':
        return <Building className="w-5 h-5 text-purple-500" />;
      case 'training':
        return <GraduationCap className="w-5 h-5 text-amber-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'competency':
        return 'Kompetenz';
      case 'project':
        return 'Projekt';
      case 'reference':
        return 'Referenz';
      case 'training':
        return 'Training';
      default:
        return 'Seite';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 pt-28 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 mb-6">
            <Search className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Suchergebnisse
          </h1>
          {query && (
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Ergebnisse für: <span className="font-semibold text-blue-600 dark:text-blue-400">"{query}"</span>
            </p>
          )}
        </motion.div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Suche läuft...</p>
          </div>
        ) : searched && results.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <SearchX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Keine Ergebnisse gefunden
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Versuchen Sie es mit anderen Suchbegriffen.
            </p>
            <Link href="/">
              <Button variant="outline">Zur Startseite</Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {results.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {results.length} Ergebnis{results.length !== 1 ? 'se' : ''} gefunden
              </p>
            )}
            {results.map((result, index) => (
              <motion.div
                key={`${result.type}-${result.title}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={result.href}>
                  <div className="group p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded">
                            {getTypeLabel(result.type)}
                          </span>
                          {result.category && (
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {result.category}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {result.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {result.description}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty state when no query */}
        {!query && !searched && (
          <div className="text-center py-16">
            <p className="text-gray-600 dark:text-gray-400">
              Geben Sie einen Suchbegriff in das Suchfeld ein.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 pt-28 pb-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
