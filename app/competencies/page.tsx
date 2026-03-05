"use client";

import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { useEffect, useState } from "react";


interface Competency {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  sortOrder: number;
}

export default function CompetenciesPage() {
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompetencies() {
      try {
        const res = await fetch('/api/competencies');
        if (res.ok) {
          setCompetencies(await res.json());
        }
      } catch (error) {
        console.error('Error fetching competencies:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCompetencies();
  }, []);

  const coreCompetencies = competencies.filter(c => c.category === 'core');
  const specializations = competencies.filter(c => c.category === 'specialization');

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-blue-600 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent pb-1">
              Kompetenzen
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Über 30 Jahre Erfahrung in IT-Beratung und Management mit Fokus auf
              nachhaltige Lösungen und messbare Ergebnisse.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Core Competencies */}
      {coreCompetencies.length > 0 && (
        <section className="py-20 px-4 bg-white dark:bg-slate-900">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white pb-1">Kernkompetenzen</h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {coreCompetencies.map((competency, index) => (
                <CompetencyCard key={competency.id} competency={competency} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Specializations */}
      {specializations.length > 0 && (
        <section className="py-20 px-4 bg-gray-50 dark:bg-slate-800">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Spezialisierungen</h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {specializations.map((spec, index) => (
                <motion.div
                  key={spec.id}
                  id={spec.slug}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white dark:bg-slate-700 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow scroll-mt-24 border border-gray-100 dark:border-slate-600"
                >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{spec.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{spec.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {competencies.length === 0 && (
        <section className="py-20 px-4 dark:bg-slate-900">
          <div className="text-center text-gray-500 dark:text-gray-400">Keine Kompetenzen vorhanden</div>
        </section>
      )}
    </main>
  );
}

function CompetencyCard({ competency, index }: { competency: Competency; index: number }) {
  // Dynamic icon lookup
  const IconComponent = (LucideIcons as any)[competency.icon] || LucideIcons.Target;

  return (
    <motion.div
      id={competency.slug}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 scroll-mt-24 border border-gray-100 dark:border-slate-700"
    >
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
        <IconComponent className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{competency.title}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{competency.description}</p>
    </motion.div>
  );
}
