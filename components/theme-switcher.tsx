'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemeSwitcherProps {
  variant?: 'floating' | 'inline' | 'compact';
  className?: string;
}

export function ThemeSwitcher({ variant = 'floating', className = '' }: ThemeSwitcherProps) {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const currentTheme = theme === 'system' ? systemTheme : theme;

  const themes = [
    { id: 'light', label: 'Hell', icon: Sun, color: 'text-amber-500' },
    { id: 'dark', label: 'Dunkel', icon: Moon, color: 'text-indigo-400' },
    { id: 'system', label: 'System', icon: Monitor, color: 'text-slate-500' },
  ];

  const currentThemeData = themes.find(t => t.id === theme) || themes[2];
  const CurrentIcon = currentThemeData.icon;

  // Kompakte Inline-Variante für Header/Footer
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {themes.map((t) => {
          const Icon = t.icon;
          const isActive = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`p-2 rounded-lg transition-all ${
                isActive 
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title={t.label}
              aria-label={`Theme: ${t.label}`}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    );
  }

  // Inline-Variante (für Footer)
  if (variant === 'inline') {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-sm text-slate-300 hover:text-white"
          aria-label="Theme umschalten"
        >
          <CurrentIcon className={`w-4 h-4 ${currentThemeData.color}`} />
          <span>{currentThemeData.label}</span>
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 mb-2 py-1 bg-slate-800 rounded-lg shadow-xl border border-slate-700 min-w-[120px] z-50"
              >
                {themes.map((t) => {
                  const Icon = t.icon;
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTheme(t.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        isActive 
                          ? 'bg-blue-600/20 text-blue-400' 
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${t.color}`} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Floating-Variante (ursprüngliches Design)
  return (
    <div className={`fixed top-24 right-4 z-50 md:top-28 lg:top-32 ${className}`}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-lg backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Theme umschalten"
      >
        <CurrentIcon className={`w-5 h-5 ${currentThemeData.color}`} />
        <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 bg-blue-500" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 min-w-[140px] z-50"
            >
              <div className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Theme
              </div>
              {themes.map((t) => {
                const Icon = t.icon;
                const isActive = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                      isActive 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${t.color}`} />
                    <span>{t.label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="theme-check"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500"
                      />
                    )}
                  </button>
                );
              })}
              <div className="mt-2 pt-2 px-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aktuell: {currentTheme === 'dark' ? 'Dunkel' : 'Hell'}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
