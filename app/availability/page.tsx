"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Euro, CheckCircle, Building2, Globe } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";


const availabilityData = [
  {
    icon: Calendar,
    title: "Verfügbarkeit",
    value: "Projektbezogen",
    description: "Flexible Einsatzplanung nach Projektanforderungen"
  },
  {
    icon: Clock,
    title: "Vor-Ort-Einsatz",
    value: "100%",
    description: "Vollständige Präsenz beim Kunden möglich"
  },
  {
    icon: MapPin,
    title: "Einsatzort",
    value: "D / A / CH",
    description: "Deutschlandweit, Österreich und Schweiz"
  },
  {
    icon: Euro,
    title: "Tagessatz",
    value: "Nach Vereinbarung",
    description: "Projektbezogene Konditionen"
  }
];

const highlights = [
  "Sofortige Verfügbarkeit für dringende Projekte",
  "Langfristige Projektbegleitungen möglich",
  "Remote-Arbeit als Ergänzung",
  "Flexible Arbeitszeitmodelle",
  "Erfahrung in internationalen Projekten",
  "Mehrsprachig (Deutsch, Englisch)"
];

export default function AvailabilityPage() {
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
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent pb-1">
              Verfügbarkeit
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Projektbezogene Verfügbarkeit für Ihre IT-Management und Consulting-Anforderungen
            </p>
          </motion.div>
        </div>
      </section>

      {/* Availability Grid */}
      <section className="py-16 px-4 bg-white dark:bg-slate-900">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {availabilityData.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-600 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <item.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {item.value}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Details Section */}
      <section className="py-16 px-4 bg-slate-50 dark:bg-slate-800">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left - Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
                Einsatzbereitschaft
              </h2>
              <div className="space-y-4">
                {highlights.map((highlight, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{highlight}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right - Map Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white dark:bg-slate-700 rounded-xl p-8 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <Globe className="w-8 h-8 text-blue-600" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Einsatzgebiet</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-slate-600 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Deutschland</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Alle Bundesländer</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-slate-600 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Österreich</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Wien, Salzburg, Graz u.a.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-slate-600 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Schweiz</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Zürich, Basel, Bern u.a.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Interesse an einer Zusammenarbeit?
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              Kontaktieren Sie mich für eine unverbindliche Projektanfrage
            </p>
            <Link href="/contact">
              <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50">
                Kontakt aufnehmen
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
