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
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8">
      <div className="container-adaptive px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <LayoutDashboard className="h-8 w-8 text-indigo-400" />
              Operation Control Portal
            </h1>
            <p className="text-slate-400 mt-1">
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
              className={`p-4 rounded-xl border ${
                service.status === 'online'
                  ? 'bg-green-500/10 border-green-500/30'
                  : service.status === 'pending'
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                {service.status === 'online' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                ) : service.status === 'pending' ? (
                  <Clock className="h-6 w-6 text-yellow-400" />
                ) : (
                  <Activity className="h-6 w-6 text-red-400" />
                )}
                <div>
                  <p className="font-medium text-white">{service.name}</p>
                  <p className="text-sm text-slate-400">
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
          className="p-6 rounded-xl bg-slate-800/50 border border-slate-700"
        >
          <div className="flex items-center gap-3 mb-4">
            <Server className="h-6 w-6 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">Systemübersicht</h3>
          </div>
          <p className="text-slate-400">
            Das Operation Control Portal zeigt den Status aller SMC-Services an.
            Detaillierte Monitoring-Funktionen und Alarme werden in zukünftigen Versionen implementiert.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
