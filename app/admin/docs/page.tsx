'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Wrench,
  Users,
  Server,
  FileText,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DocsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (role !== 'admin' && role !== 'ADMIN' && role !== 'MANAGER' && role !== 'manager') {
        router.push('/');
      }
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const docs = [
    {
      title: 'Benutzerhandbuch',
      description: 'Einführung in die Nutzung der SMC-Office Plattform für alle Benutzer',
      href: '/admin/docs/user-manual',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      sections: ['Navigation', 'Projekte & Referenzen', 'Downloads', 'Kontakt'],
    },
    {
      title: 'Technisches Handbuch',
      description: 'Technische Dokumentation für Administratoren und Entwickler',
      href: '/admin/docs/technical-manual',
      icon: Wrench,
      color: 'from-orange-500 to-orange-600',
      sections: ['Architektur', 'API-Endpunkte', 'Datenbank', 'Deployment'],
    },
  ];

  const quickLinks = [
    { title: 'SOC Dashboard', href: '/admin/soc', icon: Server },
    { title: 'SMC-DMS', href: '/admin/paperless', icon: FileText },
    { title: 'SMTP-Konfiguration', href: '/admin/smtp', icon: Shield },
  ];

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Link href="/admin" className="inline-flex items-center text-slate-500 hover:text-blue-600 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zum Dashboard
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Dokumentation</h1>
              <p className="text-gray-600">Handbücher und technische Anleitungen</p>
            </div>
          </div>
        </motion.div>

        {/* Documentation Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {docs.map((doc, index) => (
            <motion.div
              key={doc.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={doc.href}>
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group h-full">
                  <div className={`h-2 bg-gradient-to-r ${doc.color}`} />
                  <div className="p-6">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${doc.color} inline-block mb-4`}>
                      <doc.icon className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {doc.title}
                    </h2>
                    <p className="text-gray-600 mb-4">{doc.description}</p>
                    <div className="space-y-1">
                      {doc.sections.map((section) => (
                        <div key={section} className="text-sm text-gray-500 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                          {section}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-100 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Schnellzugriff</h3>
          <div className="flex flex-wrap gap-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button variant="outline" className="bg-white hover:bg-blue-50">
                  <link.icon className="w-4 h-4 mr-2" />
                  {link.title}
                  <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
                </Button>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
