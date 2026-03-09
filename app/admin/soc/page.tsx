'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Server,
  Activity,
  CheckCircle2,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasAdminAccess } from '@/lib/types';
import Link from 'next/link';

export default function SOCDashboardPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !hasAdminAccess((session.user as { role?: string })?.role)) {
      router.push('/login');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const services = [
    {
      name: 'SMC Website',
      status: 'online',
      uptime: '99.9%',
      lastCheck: 'Gerade eben',
    },
    {
      name: 'SMC-DMS (Paperless)',
      status: 'online',
      uptime: '99.8%',
      lastCheck: 'Vor 2 Min',
    },
    {
      name: 'E-Mail Service',
      status: 'online',
      uptime: '99.9%',
      lastCheck: 'Vor 1 Min',
    },
    {
      name: 'SevDesk Integration',
      status: 'pending',
      uptime: '-',
      lastCheck: 'Nicht konfiguriert',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 py-8">
      <div className="container-adaptive px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <LayoutDashboard className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              Operation Control Portal
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              SMC Services überwachen und steuern
            </p>
          </div>
        </div>

        {/* Service Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {services.map((service, index) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl border bg-white dark:bg-slate-800 shadow-sm ${
                service.status === 'online'
                  ? 'border-green-200 dark:border-green-500/30'
                  : service.status === 'pending'
                  ? 'border-yellow-200 dark:border-yellow-500/30'
                  : 'border-red-200 dark:border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                {service.status === 'online' ? (
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-500/20">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                ) : service.status === 'pending' ? (
                  <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-500/20">
                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20">
                    <Activity className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {service.status === 'online'
                      ? `Uptime: ${service.uptime}`
                      : service.lastCheck}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
              <Server className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Systemübersicht</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Das Operation Control Portal zeigt den Status aller SMC-Services an.
            Detaillierte Monitoring-Funktionen und Alarme werden in zukünftigen Versionen implementiert.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
