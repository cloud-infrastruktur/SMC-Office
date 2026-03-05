'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Calendar, Building2, ArrowRight, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';


interface Project {
  id: string;
  projectNumber: string;
  title: string;
  client: string;
  period: string;
  role: string;
  objective: string;
  highlights: string[];
  technologies: string[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

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
              Projekterfahrungen
            </h1>
            <p className="text-fluid-xl text-gray-700 dark:text-gray-300 max-w-3xl 3xl:max-w-4xl 4xl:max-w-5xl mx-auto">
              Über 30 Jahre Erfahrung in IT-Management Consulting mit Fokus auf ITSM, 
              Providermanagement und Qualitätssicherung bei namhaften Kunden.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="section-padding-adaptive px-4 bg-gray-50 dark:bg-slate-900">
        <div className="container-adaptive">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid gap-6">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/projects/${project.id}`}>
                    <div className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-700">
                      <div className="p-6 md:p-8">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          {/* Project Number Badge */}
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                              {project.projectNumber}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {project.title}
                            </h2>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                              <div className="flex items-center gap-1">
                                <Building2 className="w-4 h-4 text-blue-500" />
                                <span>{project.client}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-blue-500" />
                                <span>{project.period}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                              <Briefcase className="w-4 h-4 text-blue-500" />
                              <span className="line-clamp-1">{project.role}</span>
                            </div>

                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                              {project.objective}
                            </p>

                            {/* Technologies */}
                            <div className="flex flex-wrap gap-2">
                              {project.technologies.slice(0, 5).map((tech, i) => (
                                <Badge key={i} variant="secondary" className="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs">
                                  {tech}
                                </Badge>
                              ))}
                              {project.technologies.length > 5 && (
                                <Badge variant="secondary" className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs">
                                  +{project.technologies.length - 5}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Arrow */}
                          <div className="flex-shrink-0 hidden md:flex items-center">
                            <ArrowRight className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-2 transition-all" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {/* Link to References */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <Link href="/references">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                Alle Referenzen anzeigen
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
