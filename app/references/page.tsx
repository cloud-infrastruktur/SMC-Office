'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Building2, Calendar, Briefcase, ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';


interface Reference {
  id: string;
  client: string;
  period: string;
  role: string;
  focus: string;
  industry: string;
  projectId: string | null;
  project?: {
    id: string;
    title: string;
    projectNumber: string;
  };
}

const industryLabels: Record<string, string> = {
  banking: 'Banken & Finanzdienstleistungen',
  public: 'Öffentlicher Dienst',
  industry: 'Industrie & Chemie',
};

const industryIcons: Record<string, string> = {
  banking: '🏦',
  public: '🏛️',
  industry: '🏭',
};

export default function ReferencesPage() {
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const res = await fetch('/api/references');
        if (res.ok) {
          const data = await res.json();
          setReferences(data);
        }
      } catch (error) {
        console.error('Error fetching references:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReferences();
  }, []);

  const groupedReferences = references.reduce((acc, ref) => {
    if (!acc[ref.industry]) {
      acc[ref.industry] = [];
    }
    acc[ref.industry].push(ref);
    return acc;
  }, {} as Record<string, Reference[]>);

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Hero Section - Konsistent mit anderen Seiten */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="container-adaptive relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-fluid-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent pb-1">
              Referenz-Kunden
            </h1>
            <p className="text-fluid-xl text-gray-700 dark:text-gray-300 max-w-3xl 3xl:max-w-4xl 4xl:max-w-5xl mx-auto">
              Namhafte Kunden aus verschiedenen Branchen vertrauen auf unsere Expertise 
              in IT-Management Consulting.
            </p>
          </motion.div>
        </div>
      </section>

      {/* References by Industry */}
      <section className="section-padding-adaptive px-4 bg-gray-50 dark:bg-slate-900">
        <div className="container-adaptive">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(groupedReferences).map(([industry, refs], groupIndex) => (
                <motion.div
                  key={industry}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: groupIndex * 0.1 }}
                >
                  {/* Industry Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-3xl">{industryIcons[industry]}</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {industryLabels[industry] || industry}
                    </h2>
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-600 to-transparent rounded-full" />
                  </div>

                  {/* References Grid */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {refs.map((ref, index) => (
                      <motion.div
                        key={ref.id}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-100 dark:border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              <h3 className="font-bold text-gray-900 dark:text-white">{ref.client}</h3>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <Calendar className="w-4 h-4" />
                              <span>{ref.period}</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                              <Briefcase className="w-4 h-4" />
                              <span>{ref.role}</span>
                            </div>

                            <p className="text-sm text-gray-500 dark:text-gray-400">{ref.focus}</p>
                          </div>

                          {/* Link to Project */}
                          {ref.projectId && (
                            <Link href={`/projects/${ref.projectId}`}>
                              <Button size="sm" variant="outline" className="flex-shrink-0 dark:border-slate-600 dark:hover:bg-slate-700">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Link to Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <Link href="/projects">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                Alle Projekterfahrungen anzeigen
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
