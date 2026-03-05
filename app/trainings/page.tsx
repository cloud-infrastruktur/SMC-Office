"use client";

import { motion } from "framer-motion";
import { Award, Users, Briefcase, Code, Globe, MessageCircle, Star, ExternalLink, Settings, Workflow, FolderKanban, Zap, MoreHorizontal, FileText, Eye, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";


interface Training {
  id: string;
  title: string;
  provider: string | null;
  year: string | null;
  category: string;
  categoryId: string | null;
  description: string | null;
  link: string | null;
  pdfFileName: string | null;
  pdfStoragePath: string | null;
  sortOrder: number;
  isHighlight: boolean;
  attachments?: FileAttachment[];
}

interface FileAttachment {
  id: string;
  file: {
    id: string;
    fileName: string;
    displayName: string | null;
    mimeType: string;
    cloudStoragePath: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
}

const iconMap: Record<string, any> = {
  Settings: Settings,
  Briefcase: Briefcase,
  Workflow: Workflow,
  FolderKanban: FolderKanban,
  MessageCircle: MessageCircle,
  Zap: Zap,
  Globe: Globe,
  MoreHorizontal: MoreHorizontal,
  Award: Award,
  Users: Users,
  Code: Code,
};

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [trainingsRes, categoriesRes] = await Promise.all([
          fetch('/api/trainings'),
          fetch('/api/admin/categories?type=training'),
        ]);
        if (trainingsRes.ok) {
          setTrainings(await trainingsRes.json());
        }
        if (categoriesRes.ok) {
          setCategories(await categoriesRes.json());
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const highlights = trainings.filter(t => t.isHighlight);

  // Trainings nach Kategorien gruppieren
  function getTrainingsByCategory(categoryName: string): Training[] {
    return trainings.filter((t) => t.category === categoryName || 
      categories.find(c => c.id === t.categoryId)?.name === categoryName);
  }

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
              Zertifikate & Trainings
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {trainings.length} professionelle Zertifikate und Trainings in den Bereichen IT-Service Management, 
              Projektmanagement, Agile und mehr.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Trainings by Category */}
      <section className="py-20 px-4 bg-white dark:bg-slate-900">
        <div className="container mx-auto max-w-7xl space-y-12">
          {categories.map((category, categoryIndex) => {
            const categoryTrainings = getTrainingsByCategory(category.name);

            if (categoryTrainings.length === 0) return null;

            const Icon = iconMap[category.icon || "Award"] || Award;

            return (
              <div key={category.id} id={category.slug} className="scroll-mt-24">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex items-center gap-3 mb-6"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{category.name}</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                    {categoryTrainings.length}
                  </span>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryTrainings.map((training, index) => (
                    <TrainingCard
                      key={training.id}
                      training={training}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Fallback für Trainings ohne Kategorie-Zuordnung */}
          {trainings.filter(t => !categories.find(c => c.name === t.category)).length > 0 && (
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-3 mb-6"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Weitere Zertifikate</h2>
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trainings
                  .filter(t => !categories.find(c => c.name === t.category))
                  .map((training, index) => (
                    <TrainingCard key={training.id} training={training} index={index} />
                  ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Key Certifications Highlight */}
      {highlights.length > 0 && (
        <section className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-slate-800 dark:to-slate-900">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Kern-Zertifikate</h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {highlights.map((training) => (
                <CertBadge key={training.id} title={training.title} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function TrainingCard({
  training,
  index,
}: {
  training: Training;
  index: number;
}) {
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const hasPdf = training.pdfStoragePath || (training.attachments && training.attachments.length > 0);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.05 }}
        className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border ${training.isHighlight ? 'border-yellow-400 ring-2 ring-yellow-200 dark:ring-yellow-900' : 'border-gray-100 dark:border-slate-700'}`}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-normal flex-1">{training.title}</h3>
          <div className="flex items-center gap-2">
            {hasPdf && (
              <span title="Zertifikat vorhanden">
                <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
              </span>
            )}
            {training.isHighlight && <Star className="w-5 h-5 text-yellow-500 flex-shrink-0" />}
          </div>
        </div>
        {training.provider && (
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
            {training.link ? (
              <a href={training.link} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                {training.provider} <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              training.provider
            )}
          </p>
        )}
        {training.year && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{training.year}</p>}
        {training.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">{training.description}</p>
        )}
        
        {/* PDF-Anhang Anzeige */}
        {hasPdf && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                onClick={() => setShowPdfPreview(true)}
              >
                <Eye className="w-3 h-3 mr-1" />
                Zertifikat anzeigen
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* PDF Preview Modal */}
      {showPdfPreview && hasPdf && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPdfPreview(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-semibold dark:text-white">{training.title}</h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowPdfPreview(false)} className="dark:text-gray-300 dark:hover:bg-slate-700">
                  Schließen
                </Button>
              </div>
            </div>
            <div className="flex-1 p-4 bg-gray-100 dark:bg-slate-900 flex items-center justify-center">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <FileText className="w-16 h-16 mx-auto mb-4 text-red-400" />
                <p className="font-medium dark:text-white">Zertifikat: {training.pdfFileName || training.title}</p>
                <p className="text-sm mt-2">PDF-Vorschau wird geladen...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CertBadge({ title }: { title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg flex items-center justify-center text-center"
    >
      <div>
        <Award className="w-8 h-8 text-white mx-auto mb-2" />
        <p className="text-white font-semibold text-sm">{title}</p>
      </div>
    </motion.div>
  );
}
