"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useClickAway } from "react-use";
import {
  Menu,
  X,
  Award,
  FolderKanban,
  Building,
  Users,
  GraduationCap,
  User,
  LogIn,
  Search,
  Sun,
  Moon,
  Monitor,
  Minus,
  Plus,
  Type,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  requiresAuth?: boolean;
  requiredRoles?: string[];
}

// Font Size Hook
function useFontSize() {
  const [fontSize, setFontSize] = useState(100);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('smc-font-size');
    if (stored) {
      const size = parseInt(stored, 10);
      setFontSize(size);
      document.documentElement.style.fontSize = `${size}%`;
    }
  }, []);
  
  const updateFontSize = useCallback((newSize: number) => {
    const clampedSize = Math.min(Math.max(newSize, 80), 130);
    setFontSize(clampedSize);
    document.documentElement.style.fontSize = `${clampedSize}%`;
    localStorage.setItem('smc-font-size', String(clampedSize));
  }, []);
  
  return { fontSize, updateFontSize, mounted };
}

export function Header() {
  const { data: session, status } = useSession() || {};
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, theme, setTheme, systemTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const { fontSize, updateFontSize, mounted: fontMounted } = useFontSize();

  // Click-Away Handler für Mobile-Menü
  useClickAway(headerRef, () => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  });

  const userRole = (session?.user as any)?.role?.toLowerCase();
  const userName = session?.user?.name || (session?.user?.email?.split("@")[0]);
  
  // Berechtigungen
  const isAuthenticated = !!session;
  const canSeeCustomerReferences = isAuthenticated && 
    ["consultant", "customer_ref", "manager", "admin"].includes(userRole);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Content-Navigation (fachliche Inhalte)
  const contentNavigation: NavItem[] = [
    { href: "/competencies", label: "Kompetenzen", icon: <Award className="w-4 h-4" /> },
    { href: "/projects", label: "Projekterfahrungen", icon: <FolderKanban className="w-4 h-4" /> },
    { href: "/references", label: "Referenz-Kunden", icon: <Building className="w-4 h-4" /> },
    { href: "/customer-references", label: "Kunden-Referenzen", icon: <Users className="w-4 h-4" />, requiredRoles: ["consultant", "customer_ref", "manager", "admin"] },
    { href: "/trainings", label: "Zertifikate & Trainings", icon: <GraduationCap className="w-4 h-4" /> },
  ];

  const filteredNavigation = contentNavigation.filter((item) => {
    if (item.requiredRoles) {
      return isAuthenticated && item.requiredRoles.includes(userRole);
    }
    return true;
  });

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Suche Handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  // Theme Icons und Labels
  const themeOptions = [
    { id: 'light', label: 'Hell', icon: Sun, color: 'text-amber-500' },
    { id: 'dark', label: 'Dunkel', icon: Moon, color: 'text-indigo-400' },
    { id: 'system', label: 'System', icon: Monitor, color: 'text-slate-500 dark:text-slate-400' },
  ];

  return (
    <header
      ref={headerRef}
      className={cn(
        "fixed top-0 right-0 z-30 transition-all duration-300",
        "lg:left-16", // Platz für collapsed Sidebar
        "left-0", // Mobile: volle Breite
        isScrolled
          ? "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg border-b border-gray-200/50 dark:border-slate-700/50"
          : "bg-transparent"
      )}
    >
      <div className="max-w-[2000px] mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20 lg:h-24 gap-1 sm:gap-2">
          {/* Logo - Größe angepasst wie im Footer */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <div className="relative w-32 h-10 sm:w-36 sm:h-11 lg:w-40 lg:h-12 xl:w-48 xl:h-14 3xl:w-56 3xl:h-16 4xl:w-64 4xl:h-18">
              {mounted && (
                <Image
                  src={resolvedTheme === "dark" ? "/smc-logo-white.png" : "/smc-logo.png"}
                  alt="SMC Logo"
                  fill
                  className="object-contain object-left"
                  priority
                />
              )}
            </div>
          </Link>

          {/* Desktop Navigation - kompakt */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 flex-shrink min-w-0">
            {filteredNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1 px-2 xl:px-3 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm font-medium transition-all duration-200 whitespace-nowrap",
                  isActive(item.href)
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-700/50 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-[1.02]"
                )}
              >
                {item.icon}
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Toolbar: Suche, Schriftgröße, Theme, Auth */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2 flex-shrink-0">
            {/* Suche */}
            <div className="relative">
              <AnimatePresence>
                {isSearchOpen ? (
                  <motion.form
                    initial={{ width: 40, opacity: 0 }}
                    animate={{ width: 200, opacity: 1 }}
                    exit={{ width: 40, opacity: 0 }}
                    onSubmit={handleSearch}
                    className="flex items-center"
                  >
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Suchen..."
                      className="w-full h-8 px-3 pr-8 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setIsSearchOpen(false)}
                      className="absolute right-1 p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.form>
                ) : (
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    title="Suche"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                )}
              </AnimatePresence>
            </div>

            {/* Schriftgröße */}
            <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-lg bg-gray-100 dark:bg-slate-800">
              <button
                onClick={() => updateFontSize(fontSize - 10)}
                disabled={fontSize <= 80}
                className="p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Schrift verkleinern"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 min-w-[2rem] text-center text-xs font-medium text-gray-600 dark:text-gray-400">
                <Type className="w-3.5 h-3.5 inline-block" />
              </span>
              <button
                onClick={() => updateFontSize(fontSize + 10)}
                disabled={fontSize >= 130}
                className="p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Schrift vergrößern"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Theme Switcher - Hell/Dunkel/System */}
            {mounted && (
              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-lg bg-gray-100 dark:bg-slate-800">
                {themeOptions.map((t) => {
                  const Icon = t.icon;
                  const isActiveTheme = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "p-1.5 rounded transition-all",
                        isActiveTheme
                          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                          : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                      )}
                      title={t.label}
                      aria-label={`Theme: ${t.label}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Auth Section */}
            {isAuthenticated ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300 max-w-[80px] truncate">
                  {userName}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-8 px-2">
                    <LogIn className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Anmelden</span>
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs h-8 px-2 lg:px-3">
                    <span className="hidden lg:inline">Registrieren</span>
                    <span className="lg:hidden">Reg.</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: kompakte Toolbar + Menü-Button */}
          <div className="flex md:hidden items-center gap-1">
            {/* Mobile Suche */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Mobile Theme Toggle (schneller Wechsel) */}
            {mounted && (
              <button
                onClick={() => {
                  const themeOrder = ['light', 'dark', 'system'];
                  const currentIndex = themeOrder.indexOf(theme || 'system');
                  const nextIndex = (currentIndex + 1) % themeOrder.length;
                  setTheme(themeOrder[nextIndex]);
                }}
                className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                title={`Aktuell: ${theme === 'light' ? 'Hell' : theme === 'dark' ? 'Dunkel' : 'System'}`}
              >
                {theme === 'light' && <Sun className="w-5 h-5 text-amber-500" />}
                {theme === 'dark' && <Moon className="w-5 h-5 text-indigo-400" />}
                {theme === 'system' && <Monitor className="w-5 h-5" />}
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Suche Expanded */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden"
            >
              <form onSubmit={handleSearch} className="pb-3">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Auf der Website suchen..."
                    className="w-full h-10 px-4 pr-10 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 dark:text-blue-400"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-slate-700/50"
          >
            <div className="px-4 py-4 space-y-3">
              {/* Schriftgröße Mobile */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Schriftgröße
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateFontSize(fontSize - 10)}
                    disabled={fontSize <= 80}
                    className="p-2 rounded-lg bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 disabled:opacity-40"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    {fontSize}%
                  </span>
                  <button
                    onClick={() => updateFontSize(fontSize + 10)}
                    disabled={fontSize >= 130}
                    className="p-2 rounded-lg bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Theme Auswahl Mobile */}
              {mounted && (
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Design</p>
                  <div className="flex gap-2">
                    {themeOptions.map((t) => {
                      const Icon = t.icon;
                      const isActiveTheme = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                            isActiveTheme
                              ? "bg-blue-600 text-white"
                              : "bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="hidden sm:inline">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Content Navigation */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 mb-2">
                  Fachliche Inhalte
                </p>
                {filteredNavigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                      isActive(item.href)
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-700/50 hover:text-blue-600 dark:hover:text-blue-400 hover:pl-4"
                    )}
                  >
                    <span className={cn(
                      "transition-transform duration-200",
                      !isActive(item.href) && "group-hover:scale-110"
                    )}>
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>

              {/* Auth Section Mobile */}
              <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                {isAuthenticated ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {userName}
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Link href="/login" className="flex-1">
                      <Button variant="outline" className="w-full">
                        Anmelden
                      </Button>
                    </Link>
                    <Link href="/signup" className="flex-1">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        Registrieren
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
