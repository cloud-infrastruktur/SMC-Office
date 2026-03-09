"use client";

import { motion } from "framer-motion";
import { ArrowRight, Target, Focus, Layers, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
  projects: number;
  references: number;
  years: number;
  certificates: number;
}

// Statische Berechnung um Hydration-Mismatch zu vermeiden
// Firmengründung: 1993, Projekterfahrung (Adam Opel AG Start): 1997
const YEARS_COMPANY = new Date().getFullYear() - 1993;
const YEARS_PROJECT_EXPERIENCE = new Date().getFullYear() - 1997;

const focusKeywords = [
  { label: "IT-Service Management", href: "/competencies#it-service-management" },
  { label: "Prozessmanagement", href: "/competencies#prozessmanagement" },
  { label: "Providermanagement", href: "/competencies#providermanagement" },
  { label: "Projektmanagement", href: "/competencies#projektmanagement" },
];

export function HeroSection() {
  // Verwende YEARS_PROJECT_EXPERIENCE als Initialwert um Hydration-Mismatch zu vermeiden
  const [stats, setStats] = useState<Stats>({
    projects: 19,
    references: 13,
    years: YEARS_PROJECT_EXPERIENCE,
    certificates: 22,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [projectsRes, referencesRes, trainingsRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/references'),
          fetch('/api/trainings'),
        ]);
        
        const projects = projectsRes.ok ? await projectsRes.json() : [];
        const references = referencesRes.ok ? await referencesRes.json() : [];
        const trainings = trainingsRes.ok ? await trainingsRes.json() : [];
        
        // Zähle einzigartige Kunden (nicht Projekte) für Referenz-Kunden
        const uniqueClients = new Set(
          references.map((r: { displayClient?: string; client?: string }) => r.displayClient || r.client)
        ).size;
        
        setStats({
          projects: projects.length,
          references: uniqueClients,
          years: YEARS_PROJECT_EXPERIENCE,
          certificates: trainings.length || 22,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    }
    fetchStats();
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-8 md:py-0">
      <div className="container-adaptive relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 3xl:gap-16 4xl:gap-20 5xl:gap-24 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-4 md:space-y-6 text-center lg:text-left"
          >
            <h1 className="text-mobile-hero md:text-5xl lg:text-6xl 3xl:text-7xl 4xl:text-8xl font-bold text-gray-900 dark:text-white leading-tight">
              IT-Management
              <span className="block bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent pb-1">
                Consulting
              </span>
            </h1>
            
            {/* Kernaussage Tagline */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="border-l-4 border-blue-600 dark:border-blue-400 pl-3 md:pl-4 py-2 mx-auto lg:mx-0 max-w-md lg:max-w-none"
            >
              <p className="text-mobile-tagline md:text-xl lg:text-2xl 3xl:text-3xl font-semibold text-gray-800 dark:text-gray-100 italic text-left">
                „Mit klarem Fokus gemeinsam Ziele erreichen"
              </p>
            </motion.div>
            
            <p className="text-mobile-body md:text-lg lg:text-fluid-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Über {stats.years} Jahre Erfahrung in IT-Service-Management, Prozessoptimierung
              und Projektmanagement für Banken, öffentlichen Dienst und Industrie.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 justify-center lg:justify-start">
              <Link href="/contact">
                <Button size="lg" className="group bg-blue-600 hover:bg-blue-700 w-full sm:w-auto touch-target">
                  Kontakt aufnehmen
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/projects">
                <Button size="lg" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 w-full sm:w-auto touch-target">
                  Projekte ansehen
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Right Content - Animated Stats with Links */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 3xl:gap-8 4xl:gap-10 5xl:gap-12"
          >
            <LinkStatCard 
              label="IT Management Consulting" 
              href="/about" 
              delay={0.3}
              showYears={true}
              years={stats.years}
            />
            <LinkStatCard 
              number={`${stats.projects}`} 
              suffix="Projekte"
              label="Projekterfahrungen" 
              href="/projects" 
              delay={0.4} 
            />
            <LinkStatCard 
              number={`${stats.references}`} 
              suffix="Kunden"
              label="Referenz-Kunden" 
              href="/references" 
              delay={0.5} 
            />
            {/* Zertifikate & Trainings Kachel */}
            <CertificatesCard certificates={stats.certificates} delay={0.6} />
          </motion.div>
        </div>
      </div>

      {/* Decorative Elements - Hidden on small screens for performance */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-blue-200 rounded-full opacity-20 blur-3xl hidden md:block" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-200 rounded-full opacity-20 blur-3xl hidden md:block" />
    </section>
  );
}

function LinkStatCard({ 
  number, 
  label, 
  href, 
  delay, 
  showYears, 
  years,
  suffix
}: { 
  number?: string; 
  label: string; 
  href: string; 
  delay: number;
  showYears?: boolean;
  years?: number;
  suffix?: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 sm:p-5 md:p-6 3xl:p-8 4xl:p-10 5xl:p-12 rounded-xl md:rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 cursor-pointer group h-full touch-target"
      >
        {showYears && years ? (
          <div className="text-2xl sm:text-3xl md:text-4xl 3xl:text-5xl 4xl:text-6xl 5xl:text-7xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 dark:from-blue-400 dark:to-blue-400 bg-clip-text text-transparent pb-1">
            {years}+ Jahre
          </div>
        ) : number ? (
          <div className="text-2xl sm:text-3xl md:text-4xl 3xl:text-5xl 4xl:text-6xl 5xl:text-7xl font-bold pb-1">
            <span className="bg-gradient-to-r from-blue-600 to-blue-600 dark:from-blue-400 dark:to-blue-400 bg-clip-text text-transparent">{number}</span>
            {suffix && (
              <span className="text-lg sm:text-xl md:text-2xl 3xl:text-3xl 4xl:text-4xl 5xl:text-5xl ml-2 bg-gradient-to-r from-blue-600 to-blue-600 dark:from-blue-400 dark:to-blue-400 bg-clip-text text-transparent font-semibold">{suffix}</span>
            )}
          </div>
        ) : null}
        <div className="text-gray-600 dark:text-gray-300 mt-1 md:mt-2 text-xs sm:text-sm 3xl:text-base 4xl:text-lg 5xl:text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{label}</div>
        <div className="text-xs 3xl:text-sm 4xl:text-base text-blue-500 dark:text-blue-400 mt-1 md:mt-2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
          Mehr erfahren →
        </div>
      </motion.div>
    </Link>
  );
}

function FocusCard({ keywords, delay }: { keywords: { label: string; href: string }[]; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white/80 backdrop-blur-sm p-6 3xl:p-8 4xl:p-10 5xl:p-12 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 h-full"
    >
      <Target className="w-8 h-8 3xl:w-10 3xl:h-10 4xl:w-12 4xl:h-12 text-blue-600 mb-2" />
      <div className="text-sm 3xl:text-base 4xl:text-lg 5xl:text-xl text-gray-600 mb-2">Fokus</div>
      <div className="flex flex-wrap gap-1">
        {keywords.map((keyword, index) => (
          <Link
            key={index}
            href={keyword.href}
            className="text-xs 3xl:text-sm 4xl:text-base text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            {keyword.label}{index < keywords.length - 1 && <span className="text-gray-400 mx-1">|</span>}
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

// Zertifikate & Trainings Kachel
function CertificatesCard({ certificates, delay }: { certificates: number; delay: number }) {
  return (
    <Link href="/trainings">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 sm:p-5 md:p-6 3xl:p-8 4xl:p-10 5xl:p-12 rounded-xl md:rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 h-full cursor-pointer group touch-target"
      >
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="text-2xl sm:text-3xl md:text-4xl 3xl:text-5xl 4xl:text-6xl 5xl:text-7xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 dark:from-blue-400 dark:to-blue-400 bg-clip-text text-transparent pb-1">
          {certificates}+
        </div>
        <div className="text-gray-600 dark:text-gray-300 mt-1 md:mt-2 text-xs sm:text-sm 3xl:text-base 4xl:text-lg 5xl:text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          Zertifikate & Trainings
        </div>
        <div className="text-xs 3xl:text-sm 4xl:text-base text-blue-500 dark:text-blue-400 mt-1 md:mt-2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
          Mehr erfahren →
        </div>
      </motion.div>
    </Link>
  );
}

// Philosophie-Karte: Fokussiert & Ganzheitlich (für About-Seite exportiert)
export function PhilosophyCard({ delay }: { delay: number }) {
  const philosophyItems = [
    { fokus: "IT-Service Mgmt", ganzheitlich: "Prozess → Mensch" },
    { fokus: "Prozessmgmt", ganzheitlich: "Strategie → Umsetzung" },
    { fokus: "Providermgmt", ganzheitlich: "Analyse → Optimierung" },
  ];

  return (
    <Link href="/about">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-700 backdrop-blur-sm p-4 sm:p-5 md:p-6 3xl:p-8 4xl:p-10 5xl:p-12 rounded-xl md:rounded-2xl shadow-lg border border-blue-200 dark:border-slate-600 hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 h-full cursor-pointer group touch-target"
      >
        {/* Mobile: Kompakte Ansicht */}
        <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
          <Focus className="w-4 h-4 sm:w-5 sm:h-5 3xl:w-6 3xl:h-6 text-blue-600 dark:text-blue-400" />
          <span className="text-xs sm:text-sm 3xl:text-base font-semibold text-blue-700 dark:text-blue-400">Fokussiert</span>
          <span className="text-gray-400 dark:text-gray-500 text-xs">→</span>
          <Layers className="w-4 h-4 sm:w-5 sm:h-5 3xl:w-6 3xl:h-6 text-blue-600 dark:text-blue-400" />
          <span className="text-xs sm:text-sm 3xl:text-base font-semibold text-blue-700 dark:text-blue-400">Ganzheitlich</span>
        </div>
        
        <div className="text-xs 3xl:text-sm text-gray-600 dark:text-gray-400 mb-2 italic hidden sm:block">
          „Auf den Punkt gebracht"
        </div>
        
        <div className="space-y-0.5 sm:space-y-1">
          {philosophyItems.map((item, index) => (
            <div key={index} className="flex items-center text-xs 3xl:text-sm">
              <span className="text-blue-600 dark:text-blue-400 font-medium truncate flex-1">{item.fokus}</span>
              <span className="text-gray-400 dark:text-gray-500 mx-0.5 sm:mx-1 text-xs">→</span>
              <span className="text-gray-500 dark:text-gray-400 truncate flex-1 text-right text-xs sm:text-xs">{item.ganzheitlich}</span>
            </div>
          ))}
        </div>
        
        <div className="text-xs 3xl:text-sm text-blue-500 dark:text-blue-400 mt-2 sm:mt-3 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
          Mehr erfahren →
        </div>
      </motion.div>
    </Link>
  );
}
