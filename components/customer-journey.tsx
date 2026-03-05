"use client";

import { motion } from "framer-motion";
import { FileText, MessageSquare, Users, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Projektanfrage",
    description: "Sie senden uns Ihre Projektanforderungen und Herausforderungen.",
  },
  {
    icon: MessageSquare,
    title: "Interview",
    description: "Gemeinsames Gespräch zur Klärung der Details und Anforderungen.",
  },
  {
    icon: Users,
    title: "Vorstellung",
    description: "Präsentation der Lösungsansätze und des Projekt-Teams.",
  },
  {
    icon: CheckCircle,
    title: "Beauftragung",
    description: "Projektstart und erfolgreiche Umsetzung Ihrer Ziele.",
  },
];

export function CustomerJourney() {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent pb-1">
            Ihr Weg zum Projekterfolg
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Von der ersten Anfrage bis zur erfolgreichen Projektumsetzung begleiten wir Sie Schritt für Schritt.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8 relative">
          {/* Connection Line */}
          <div className="hidden md:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-300 via-blue-400 to-blue-300 dark:from-blue-600 dark:via-blue-500 dark:to-blue-600" />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-slate-700">
                <div className="mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto relative z-10 shadow-lg">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 -right-4 w-8 h-8 text-blue-400 dark:text-blue-500">
                  <svg
                    className="w-full h-full"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
