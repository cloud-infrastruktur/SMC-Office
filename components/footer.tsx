"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Globe, Phone, ExternalLink } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface SocialLinks {
  xing?: string;
  linkedin?: string;
}

export function Footer() {
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    xing: 'https://www.xing.com/profile/Thomas_Schwarz146', // Fallback
    linkedin: '',
  });

  useEffect(() => {
    async function fetchSocialLinks() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          const xingEntry = data.find((d: { key: string }) => d.key === 'social_xing');
          const linkedinEntry = data.find((d: { key: string }) => d.key === 'social_linkedin');
          setSocialLinks({
            xing: xingEntry?.value || 'https://www.xing.com/profile/Thomas_Schwarz146',
            linkedin: linkedinEntry?.value || '',
          });
        }
      } catch (error) {
        console.error('Error fetching social links:', error);
      }
    }
    fetchSocialLinks();
  }, []);

  return (
    <>
      {/* Elegantes Motto - dezenter blauer Text */}
      <section className="py-8 bg-gradient-to-b from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 border-t border-gray-100 dark:border-slate-700">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-blue-600 dark:text-blue-400 text-lg md:text-xl font-medium italic tracking-wide">
              „Auf den Punkt gebracht"
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Fokussiert & Ganzheitlich — IT-Service Management bis Providermanagement
            </p>
          </motion.div>
        </div>
      </section>

      {/* Eigentlicher Footer */}
      <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="relative w-40 h-12 md:w-48 md:h-14 3xl:w-56 3xl:h-16 4xl:w-64 4xl:h-18">
              <Image
                src="/smc-logo-white.png"
                alt="Schwarz Management Consulting"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Ihr Partner für IT-Management Consulting mit über 30 Jahren Erfahrung in
              Prozessmanagement, Projektmanagement und IT-Service-Management.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  Über mich
                </Link>
              </li>
              <li>
                <Link
                  href="/competencies"
                  className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  Kompetenzen
                </Link>
              </li>
              <li>
                <Link
                  href="/projects"
                  className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  Projekte
                </Link>
              </li>
              <li>
                <Link
                  href="/references"
                  className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  Referenzen
                </Link>
              </li>
              <li>
                <Link
                  href="/search"
                  className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  Suchen
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Kontakt</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400 text-sm">
                  Oberer Rusterweg 7<br />
                  53639 Königswinter
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <a
                  href="tel:+492282997130"
                  className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  +49 (0) 228 29971130
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <a
                  href="mailto:ts@smc.nrw"
                  className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  ts@smc.nrw
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <a
                  href="https://smc.nrw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  smc.nrw
                </a>
              </li>
            </ul>
            
            {/* Social Links */}
            <div className="pt-4">
              <h4 className="text-sm font-semibold text-white mb-3">Social Media</h4>
              <div className="flex flex-wrap gap-2">
                {socialLinks.xing && (
                  <a
                    href={socialLinks.xing}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#006567] hover:bg-[#00797b] text-white text-sm rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.188 0c-.517 0-.741.325-.927.66 0 0-7.455 13.224-7.702 13.657.015.024 4.919 9.023 4.919 9.023.17.308.436.66.967.66h3.454c.211 0 .375-.078.463-.22.089-.151.089-.346-.009-.536l-4.879-8.916c-.004-.006-.004-.016 0-.022L22.139.756c.095-.191.097-.387.006-.535C22.056.078 21.894 0 21.686 0h-3.498zM3.648 4.74c-.211 0-.385.074-.473.216-.09.149-.078.339.02.531l2.34 4.05c.004.01.004.016 0 .021L1.86 16.051c-.099.188-.093.381 0 .529.085.142.239.234.45.234h3.461c.518 0 .766-.348.945-.667l3.734-6.609-2.378-4.155c-.172-.315-.434-.659-.962-.659H3.648v.016z"/>
                    </svg>
                    XING
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {socialLinks.linkedin && (
                  <a
                    href={socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0077B5] hover:bg-[#005885] text-white text-sm rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} Schwarz Management Consulting GmbH. Alle Rechte vorbehalten.
            </p>
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-xs">Design:</span>
              <ThemeSwitcher variant="inline" />
            </div>
          </div>
        </div>
      </div>
      </footer>
    </>
  );
}
