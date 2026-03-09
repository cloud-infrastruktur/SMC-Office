"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  User,
  Calendar,
  Mail,
  Search,
  Download,
  LayoutDashboard,
  LogOut,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Menu,
  X,
  Minus,
  Plus,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  onClick?: () => void;
}

export function Sidebar() {
  const { data: session } = useSession() || {};
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const userRole = (session?.user as any)?.role?.toLowerCase();
  const isAdmin = userRole === "admin";
  const isAuthenticated = !!session;

  useEffect(() => {
    setMounted(true);
    // Load font size from localStorage
    const savedFontSize = localStorage.getItem("smc-font-size");
    if (savedFontSize) {
      const size = parseInt(savedFontSize);
      setFontSize(size);
      document.documentElement.style.fontSize = `${size}%`;
    }
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
    setIsSearchExpanded(false);
  }, [pathname]);

  // Focus search input when expanded
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.min(Math.max(fontSize + delta, 80), 130);
    setFontSize(newSize);
    document.documentElement.style.fontSize = `${newSize}%`;
    localStorage.setItem("smc-font-size", newSize.toString());
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsSearchExpanded(false);
    }
  };

  const navItems: NavItem[] = [
    { href: "/", label: "Unternehmen", icon: <Building2 className="w-5 h-5" /> },
    { href: "/about", label: "Über mich", icon: <User className="w-5 h-5" /> },
    { href: "/availability", label: "Verfügbarkeit", icon: <Calendar className="w-5 h-5" /> },
    { href: "/contact", label: "Kontakt", icon: <Mail className="w-5 h-5" /> },
    { href: "/downloads", label: "Downloads", icon: <Download className="w-5 h-5" />, requiresAuth: true },
    { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, requiresAdmin: true },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (item.requiresAdmin && !isAdmin) return false;
    if (item.requiresAuth && !isAuthenticated) return false;
    return true;
  });

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const SidebarContent = ({ forceExpanded = false }: { forceExpanded?: boolean }) => {
    const showLabels = forceExpanded || !isCollapsed;
    return (
    <div className="flex flex-col h-full">
      {/* Search Section */}
      <div className="px-2 pt-4 pb-2">
        {!showLabels ? (
          <button
            onClick={() => {
              setIsCollapsed(false);
              setIsSearchExpanded(true);
            }}
            className="flex items-center justify-center w-full p-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-700/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 group"
          >
            <Search className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
          </button>
        ) : (
          <form onSubmit={handleSearch} className="relative">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-0 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </form>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-2 space-y-1">
        {filteredNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl transition-all duration-200 group relative",
              isActive(item.href)
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-700/50 hover:text-blue-600 dark:hover:text-blue-400"
            )}
          >
            {/* Hover Akzent-Linie links */}
            <span className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-200",
              isActive(item.href)
                ? "h-6 bg-white/50"
                : "h-0 bg-blue-500 group-hover:h-6"
            )} />
            <span className={cn(
              "flex-shrink-0 transition-transform duration-200",
              !isActive(item.href) && "group-hover:scale-110"
            )}>
              {item.icon}
            </span>
            <AnimatePresence>
              {showLabels && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-200/50 dark:border-slate-700/50 pt-4 pb-4 space-y-2">
        {/* Font Size Controls */}
        <div className={cn(
          "flex items-center gap-2 px-3 mx-2",
          !showLabels ? "justify-center" : "justify-between"
        )}>
          {showLabels && (
            <span className="text-xs text-gray-500 dark:text-gray-400">Schriftgröße</span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleFontSizeChange(-5)}
              className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title="Kleiner"
            >
              <Minus className="w-4 h-4" />
            </button>
            {showLabels && (
              <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-center">
                {fontSize}%
              </span>
            )}
            <button
              onClick={() => handleFontSizeChange(5)}
              className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title="Größer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl transition-all duration-200 w-[calc(100%-16px)] group",
            "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-700/50 hover:text-blue-600 dark:hover:text-blue-400"
          )}
        >
          {mounted && (
            <>
              <span className="transition-transform duration-200 group-hover:scale-110">
                {resolvedTheme === "dark" ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-blue-600" />
                )}
              </span>
              <AnimatePresence>
                {showLabels && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    {resolvedTheme === "dark" ? "Hell" : "Dunkel"}
                  </motion.span>
                )}
              </AnimatePresence>
            </>
          )}
        </button>

        {/* Auth Button */}
        {isAuthenticated ? (
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl transition-all duration-200 w-[calc(100%-16px)] group",
              "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            )}
          >
            <span className="transition-transform duration-200 group-hover:scale-110">
              <LogOut className="w-5 h-5" />
            </span>
            <AnimatePresence>
              {showLabels && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  Abmelden
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ) : (
          <Link
            href="/login"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl transition-all duration-200 group",
              "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            )}
          >
            <span className="transition-transform duration-200 group-hover:scale-110">
              <LogIn className="w-5 h-5" />
            </span>
            <AnimatePresence>
              {showLabels && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  Anmelden
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        )}
      </div>
    </div>
  );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-slate-700/50 shadow-lg lg:hidden"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-64 z-50 lg:hidden"
          >
            <div className="h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-slate-700/50 shadow-2xl pt-16">
              <SidebarContent forceExpanded={true} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 64 : 220 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="hidden lg:flex fixed top-0 left-0 h-full z-40 flex-col"
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
      >
        {/* Glassmorphism Background */}
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-slate-700/50 shadow-xl" />
        
        {/* Content */}
        <div className="relative h-full pt-20">
          <SidebarContent />
        </div>

        {/* Collapse Indicator */}
        <div className="absolute top-1/2 -right-3 transform -translate-y-1/2">
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            className="p-1 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-md cursor-pointer"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
}
