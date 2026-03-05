"use client";

import { HeroSection } from "@/components/hero-section";
import { CustomerJourney } from "@/components/customer-journey";
import { CompetencyCard } from "@/components/competency-card";
import { CanvasBackground } from "@/components/canvas-background";
import {
  Settings,
  Users,
  CheckCircle,
  FolderKanban,
  TrendingUp,
  TestTube,
  Briefcase,
  Rocket,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const coreCompetencies = [
  {
    icon: Settings,
    title: "Prozessmanagement",
    description: "Analyse und Optimierung von IT-Betriebsprozessen auf Basis von ITIL und Best Practices.",
  },
  {
    icon: Users,
    title: "Providermanagement",
    description: "Aufbau und Implementierung von Providermanagement mit Governance-Steuerung.",
  },
  {
    icon: CheckCircle,
    title: "Qualitätsmanagement",
    description: "Herstellerunabhängige Leitfäden und Vorgehensmodelle auf Basis von ITIL.",
  },
  {
    icon: FolderKanban,
    title: "Programm- & Projektmanagement",
    description: "Management komplexer Projekte und Projektportfolios im IT-Umfeld.",
  },
  {
    icon: TrendingUp,
    title: "Senior Business Analyst",
    description: "Analyse der IT-Prozesslandschaft und Entwicklung von Optimierungsstrategien.",
  },
  {
    icon: TestTube,
    title: "Senior Test- & Releasemanagement",
    description: "MaRisk-konforme Testregelprozesse und bankenübergreifende Teststrategien.",
  },
  {
    icon: Briefcase,
    title: "Senior Management Consulting",
    description: "Beratung auf Top-Management-Niveau mit Fokus auf IT-Projektgeschäft.",
  },
];

export default function HomePage() {
  return (
    <main>
      {/* Canvas Background nur auf der Homepage */}
      <CanvasBackground />
      <HeroSection />

      {/* Core Competencies Section */}
      <section className="py-20 px-4 bg-white dark:bg-slate-900">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent pb-1">
              Unsere Kernkompetenzen
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Mit über 30 Jahren Erfahrung bieten wir umfassende Lösungen in allen Bereichen
              des IT-Management Consultings.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreCompetencies.map((comp, index) => (
              <CompetencyCard
                key={index}
                icon={comp.icon}
                title={comp.title}
                description={comp.description}
                index={index}
              />
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/competencies">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 group">
                Alle Kompetenzen ansehen
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <CustomerJourney />

      {/* CTA Section - Glassmorphism Design */}
      <section className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 relative overflow-hidden">
        {/* Subtile Glow-Effekte */}
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 bg-blue-500/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto max-w-4xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative backdrop-blur-xl bg-white/30 dark:bg-slate-800/40 border border-white/40 dark:border-white/10 rounded-3xl p-10 md:p-14 shadow-2xl"
          >
            {/* Inner glow border */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/10 via-transparent to-blue-400/5 pointer-events-none" />
            
            {/* Decorative corner elements */}
            <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-blue-500/30 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-blue-500/30 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-blue-500/30 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-blue-500/30 rounded-br-lg" />
            
            <div className="relative text-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0.8 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex mb-6"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/80 to-blue-600/80 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Rocket className="w-8 h-8 text-white" />
                  </div>
                  <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-blue-500 dark:text-blue-400 animate-pulse" />
                </div>
              </motion.div>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 dark:from-white dark:via-blue-200 dark:to-white bg-clip-text text-transparent">
                Starten Sie Ihr nächstes Projekt mit uns
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                Lassen Sie uns gemeinsam Ihre IT-Herausforderungen lösen und Ihre Ziele erreichen.
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/contact">
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30">
                    Jetzt Kontakt aufnehmen
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/projects">
                  <Button size="lg" variant="outline" className="border-blue-500/50 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                    Unsere Projekte
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Bottom decorative line */}
            <div className="absolute bottom-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          </motion.div>
        </div>
      </section>
    </main>
  );
}
