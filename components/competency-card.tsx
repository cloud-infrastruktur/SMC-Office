"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface CompetencyCardProps {
  id?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

export function CompetencyCard({ id, icon: Icon, title, description, index }: CompetencyCardProps) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-slate-700 cursor-pointer scroll-mt-24"
    >
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}
