'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Shield, Building2, FileText, Download, Calendar, Briefcase,
  Lock, AlertTriangle, ArrowLeft, ExternalLink, Users, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { canViewCustomerReferences } from '@/lib/types';

interface Reference {
  id: string;
  client: string;
  displayClient?: string;
  period: string;
  role: string;
  focus: string;
  industry: string;
  pdfFileName?: string;
  pdfStoragePath?: string;
  clientRef?: {
    name: string;
    anonymizedName: string;
    industry: string;
  };
}

export default function CustomerReferencesPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);

  const userRole = (session?.user as { role?: string })?.role;
  const hasAccess = canViewCustomerReferences(userRole);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/customer-references');
    } else if (status === 'authenticated') {
      if (!hasAccess) {
        // Kein Zugriff - zeige Access Denied
        setLoading(false);
      } else {
        fetchReferences();
      }
    }
  }, [status, hasAccess, router]);

  const fetchReferences = async () => {
    try {
      const res = await fetch('/api/references');
      if (res.ok) {
        const data = await res.json();
        setReferences(data);
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gruppiere nach Branche
  const groupedByIndustry = references.reduce((acc, ref) => {
    const industry = ref.clientRef?.industry || ref.industry || 'Sonstige';
    if (!acc[industry]) acc[industry] = [];
    acc[industry].push(ref);
    return acc;
  }, {} as Record<string, Reference[]>);

  // PDF Download Handler
  const handleDownloadPdf = async (id: string, fileName: string) => {
    try {
      const res = await fetch(`/api/customer-references/${id}/download`);
      
      if (!res.ok) {
        throw new Error('Download fehlgeschlagen');
      }

      const contentType = res.headers.get('Content-Type');
      
      if (contentType?.includes('application/json')) {
        // S3 URL - Open in new tab or redirect
        const data = await res.json();
        if (data.url) {
          const a = document.createElement('a');
          a.href = data.url;
          a.download = data.fileName || fileName;
          a.click();
        }
      } else {
        // Direct file download (local storage)
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download Fehler:', error);
      alert('Fehler beim Herunterladen der Datei');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Access Denied für nicht berechtigte Benutzer
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Lock className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Zugriff verweigert
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Dieser Bereich ist nur für Benutzer mit der Rolle <strong>"Kunden-Referenz"</strong>, 
            <strong>"Manager"</strong> oder <strong>"Administrator"</strong> zugänglich.
          </p>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-300 text-left">
                Wenn Sie Zugang zu diesem Bereich benötigen, kontaktieren Sie bitte den Administrator.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <ArrowLeft className="w-4 h-4" /> Zurück
              </Button>
            </Link>
            <Link href="/contact" className="flex-1">
              <Button className="w-full gap-2 bg-purple-600 hover:bg-purple-700">
                Kontakt
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10" />
        <div className="container-adaptive relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-6">
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Exklusiver Bereich
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Kunden-Referenzen
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Detaillierte Informationen zu unseren Kundenbeziehungen und Projektreferenzen.
              Dieser Bereich enthält vertrauliche Informationen und ist nur für berechtigte Benutzer zugänglich.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container-adaptive">
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
          >
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-6 h-6 text-purple-600" />
                <span className="text-sm text-slate-500 dark:text-slate-400">Kunden</span>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {references.length}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-6 h-6 text-blue-600" />
                <span className="text-sm text-slate-500 dark:text-slate-400">Branchen</span>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {Object.keys(groupedByIndustry).length}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-6 h-6 text-amber-600" />
                <span className="text-sm text-slate-500 dark:text-slate-400">Jahre Erfahrung</span>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">30+</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-6 h-6 text-green-600" />
                <span className="text-sm text-slate-500 dark:text-slate-400">Dokumente</span>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {references.filter(r => r.pdfStoragePath).length}
              </p>
            </div>
          </motion.div>

          {/* References by Industry */}
          <div className="space-y-8">
            {Object.entries(groupedByIndustry).map(([industry, industryRefs], idx) => (
              <motion.div
                key={industry}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden"
              >
                <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-6 h-6 text-white" />
                      <h2 className="text-xl font-bold text-white">{industry}</h2>
                    </div>
                    <Badge className="bg-white/20 text-white border-white/30">
                      {industryRefs.length} Referenzen
                    </Badge>
                  </div>
                </div>
                <div className="divide-y dark:divide-slate-700">
                  {industryRefs.map((ref) => (
                    <div key={ref.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            {ref.clientRef?.name || ref.displayClient || ref.client}
                          </h3>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400 mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {ref.period}
                            </div>
                            <div className="flex items-center gap-1">
                              <Briefcase className="w-4 h-4" />
                              {ref.role}
                            </div>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300">{ref.focus}</p>
                        </div>
                        <div className="flex gap-2">
                          {ref.pdfStoragePath && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-2"
                              onClick={() => handleDownloadPdf(ref.id, ref.pdfFileName || 'referenz.pdf')}
                            >
                              <Download className="w-4 h-4" />
                              Referenzschreiben
                            </Button>
                          )}
                          <Link href={`/projects?client=${encodeURIComponent(ref.client)}`}>
                            <Button variant="outline" size="sm" className="gap-2">
                              <ExternalLink className="w-4 h-4" />
                              Projekte
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <Link href="/references">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Zurück zu Referenz-Kunden
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
