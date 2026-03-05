"use client";

import { motion } from "framer-motion";
import { Target, Sparkles } from "lucide-react";

interface PageMottoProps {
  variant?: "default" | "compact" | "minimal" | "glassmorphism";
  className?: string;
}

export function PageMotto({ variant = "default", className = "" }: PageMottoProps) {
  if (variant === "minimal") {
    return (
      <div className={`flex items-center gap-2 text-blue-600 dark:text-blue-400 ${className}`}>
        <Target className="w-4 h-4" />
        <span className="text-sm font-medium tracking-wide">Auf den Punkt gebracht</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={`flex items-center justify-center gap-3 py-3 ${className}`}
      >
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-blue-500 dark:to-blue-400" />
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Target className="w-5 h-5" />
          <span className="text-base font-semibold tracking-wide">Auf den Punkt gebracht</span>
        </div>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-blue-500 dark:to-blue-400" />
      </motion.div>
    );
  }

  // Glassmorphism variant - hochmodernes Design
  if (variant === "glassmorphism") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`relative overflow-hidden ${className}`}
      >
        {/* Glassmorphism Container */}
        <div className="relative backdrop-blur-xl bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Glow Effects */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-20 bg-blue-500/10 rounded-full blur-2xl" />
          
          {/* Inner Glow Border */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-blue-500/10 pointer-events-none" />
          
          {/* Content */}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
            {/* Icon Container */}
            <motion.div
              initial={{ scale: 0.8 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="relative"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500/80 to-blue-600/80 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Target className="w-8 h-8 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-blue-400 animate-pulse" />
            </motion.div>
            
            {/* Text Content */}
            <div>
              <motion.h3
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent mb-2"
              >
                Auf den Punkt gebracht
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-blue-200/90 font-medium tracking-wide"
              >
                Fokussiert & Ganzheitlich — IT-Service Management bis Providermanagement
              </motion.p>
            </div>
          </div>
          
          {/* Decorative Lines */}
          <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
        </div>
      </motion.div>
    );
  }

  // Default variant - prominent banner
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className={`relative overflow-hidden ${className}`}
    >
      <div className="bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-transparent dark:from-blue-500/20 dark:via-blue-600/10 dark:to-transparent border-l-4 border-blue-500 px-6 py-4 rounded-r-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white tracking-wide">
              Auf den Punkt gebracht
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Fokussiert & Ganzheitlich
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
