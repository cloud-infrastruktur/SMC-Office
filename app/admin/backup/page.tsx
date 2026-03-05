'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Database,
  Download,
  Upload,
  Shield,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileJson,
  Activity,
  Loader2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface IntegrityResult {
  healthy: boolean;
  orphanedRecords: Array<{
    id: string;
    title: string;
    type: string;
    invalidCategoryId: string | null;
  }>;
  absolutePathRecords: Array<{
    id: string;
    fileName: string;
    type: string;
    absolutePath: string;
  }>;
  stats: {
    totalProjects: number;
    totalTrainings: number;
    totalReferences: number;
    totalCategories: number;
    totalDownloadFiles: number;
    orphanedCount: number;
    absolutePathCount: number;
    uncategorized: {
      projects: number;
      trainings: number;
      references: number;
    };
  };
  checkedAt: string;
}

export default function BackupPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [integrity, setIntegrity] = useState<IntegrityResult | null>(null);

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !isAdmin) {
      router.push('/admin');
    }
  }, [status, isAdmin, router]);

  // Integritätsprüfung
  const checkIntegrity = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/admin/integrity');
      const data = await res.json();
      if (res.ok) {
        setIntegrity(data);
      } else {
        toast({ title: 'Fehler', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Prüfung fehlgeschlagen', variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) {
      checkIntegrity();
    }
  }, [isAdmin, checkIntegrity]);

  // Backup herunterladen
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/admin/backup');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Download fehlgeschlagen');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smc-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Erfolg', description: 'Backup heruntergeladen' });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Download fehlgeschlagen',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  // Backup wiederherstellen
  const handleRestore = async (file: File) => {
    setUploading(true);
    try {
      const content = await file.text();
      const backup = JSON.parse(content);

      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup),
      });

      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Erfolg', description: data.message });
        checkIntegrity();
      } else {
        toast({ title: 'Fehler', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Wiederherstellung fehlgeschlagen',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Verwaiste Datensätze reparieren
  const handleFix = async (fixType: 'orphaned' | 'paths' | 'all' = 'all') => {
    const messages = {
      orphaned: 'Sollen alle verwaisten Datensätze repariert werden? Die Kategorie-Zuordnung wird entfernt.',
      paths: 'Sollen alle absoluten Pfade normalisiert werden? Die Pfade werden auf relative Dateinamen umgestellt.',
      all: 'Sollen alle Probleme (verwaiste Datensätze + absolute Pfade) repariert werden?',
    };

    if (!confirm(messages[fixType])) {
      return;
    }

    setFixing(true);
    try {
      const res = await fetch('/api/admin/integrity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixType }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Erfolg', description: data.message });
        checkIntegrity();
      } else {
        toast({ title: 'Fehler', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Reparatur fehlgeschlagen', variant: 'destructive' });
    } finally {
      setFixing(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <main className="min-h-screen py-12 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/admin" className="inline-flex items-center text-gray-500 hover:text-blue-600 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zum Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Backup & Wiederherstellung</h1>
              <p className="text-gray-600">Datensicherung und Datenintegrität</p>
            </div>
          </div>
        </motion.div>

        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-xl p-4 mb-8 ${
            integrity?.healthy
              ? 'bg-green-50 border border-green-200'
              : (integrity?.orphanedRecords?.length || integrity?.absolutePathRecords?.length)
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {integrity?.healthy ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (integrity?.orphanedRecords?.length || integrity?.absolutePathRecords?.length) ? (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            ) : (
              <Info className="w-6 h-6 text-blue-600" />
            )}
            <div>
              <p className={`font-medium ${
                integrity?.healthy ? 'text-green-800' : (integrity?.orphanedRecords?.length || integrity?.absolutePathRecords?.length) ? 'text-amber-800' : 'text-blue-800'
              }`}>
                {integrity?.healthy
                  ? 'Datenbank ist konsistent'
                  : integrity
                  ? `${(integrity.orphanedRecords?.length || 0) + (integrity.absolutePathRecords?.length || 0)} Probleme gefunden`
                  : 'Prüfung läuft...'}
              </p>
              {integrity && !integrity.healthy && (
                <p className="text-sm text-amber-700">
                  {integrity.orphanedRecords?.length ? `${integrity.orphanedRecords.length} verwaiste Datensätze` : ''}
                  {integrity.orphanedRecords?.length && integrity.absolutePathRecords?.length ? ', ' : ''}
                  {integrity.absolutePathRecords?.length ? `${integrity.absolutePathRecords.length} absolute Pfade` : ''}
                </p>
              )}
              {integrity?.checkedAt && (
                <p className="text-sm opacity-75">
                  Letzte Prüfung: {new Date(integrity.checkedAt).toLocaleString('de-DE')}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Backup Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Download className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Backup erstellen</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Erstellt einen vollständigen Export aller Inhalte als JSON-Datei.
              Sensible Daten (Passwörter, API-Tokens) werden NICHT exportiert.
            </p>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileJson className="w-4 h-4 mr-2" />
              )}
              Backup herunterladen
            </Button>
          </motion.div>

          {/* Restore Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Upload className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Backup wiederherstellen</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Stellt Kategorien, Seiteninhalte und Konfigurationen aus einem Backup wieder her.
              Bestehende Daten werden NICHT gelöscht.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleRestore(e.target.files[0])}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Backup-Datei auswählen
            </Button>
          </motion.div>
        </div>

        {/* Integrity Check Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg p-6 mt-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Datenintegrität</h2>
            </div>
            <Button
              onClick={checkIntegrity}
              disabled={checking}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
              Erneut prüfen
            </Button>
          </div>

          {integrity && (
            <>
              {/* Statistiken */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{integrity.stats.totalProjects}</p>
                  <p className="text-sm text-gray-600">Projekte</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{integrity.stats.totalReferences}</p>
                  <p className="text-sm text-gray-600">Referenzen</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{integrity.stats.totalTrainings}</p>
                  <p className="text-sm text-gray-600">Trainings</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{integrity.stats.totalCategories}</p>
                  <p className="text-sm text-gray-600">Kategorien</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{integrity.stats.totalDownloadFiles || 0}</p>
                  <p className="text-sm text-gray-600">Dateien</p>
                </div>
              </div>

              {/* Verwaiste Datensätze */}
              {integrity.orphanedRecords.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-amber-800 mb-2">
                        {integrity.orphanedRecords.length} verwaiste Datensätze
                      </h3>
                      <ul className="text-sm text-amber-700 space-y-1">
                        {integrity.orphanedRecords.slice(0, 5).map((record) => (
                          <li key={record.id}>
                            <span className="font-medium">{record.type}:</span> {record.title}
                          </li>
                        ))}
                        {integrity.orphanedRecords.length > 5 && (
                          <li className="italic">... und {integrity.orphanedRecords.length - 5} weitere</li>
                        )}
                      </ul>
                    </div>
                    <Button
                      onClick={() => handleFix('orphaned')}
                      disabled={fixing}
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reparieren'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Absolute Pfade (Entwicklungsumgebungs-Altlasten) */}
              {integrity.absolutePathRecords && integrity.absolutePathRecords.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-red-800 mb-2">
                        {integrity.absolutePathRecords.length} absolute Pfade (Altlasten)
                      </h3>
                      <p className="text-sm text-red-700 mb-2">
                        Diese Dateipfade stammen aus der Entwicklungsumgebung und müssen normalisiert werden.
                      </p>
                      <ul className="text-sm text-red-700 space-y-1 font-mono">
                        {integrity.absolutePathRecords.slice(0, 3).map((record) => (
                          <li key={record.id} className="truncate max-w-md">
                            {record.fileName}: <span className="text-red-500">{record.absolutePath}</span>
                          </li>
                        ))}
                        {integrity.absolutePathRecords.length > 3 && (
                          <li className="italic">... und {integrity.absolutePathRecords.length - 3} weitere</li>
                        )}
                      </ul>
                    </div>
                    <Button
                      onClick={() => handleFix('paths')}
                      disabled={fixing}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pfade normalisieren'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Nicht kategorisierte Warnung */}
              {(integrity.stats.uncategorized.projects > 0 ||
                integrity.stats.uncategorized.trainings > 0 ||
                integrity.stats.uncategorized.references > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Nicht kategorisierte Einträge</h3>
                  <p className="text-sm text-blue-700">
                    {integrity.stats.uncategorized.projects > 0 && `${integrity.stats.uncategorized.projects} Projekte, `}
                    {integrity.stats.uncategorized.trainings > 0 && `${integrity.stats.uncategorized.trainings} Trainings, `}
                    {integrity.stats.uncategorized.references > 0 && `${integrity.stats.uncategorized.references} Referenzen`}
                    {' '}haben keine Kategorie-Zuordnung. Dies ist normal und kein Fehler.
                  </p>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-100 rounded-xl p-6 mt-6"
        >
          <h3 className="font-semibold text-gray-900 mb-3">Hinweise zur Datensicherung</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Backups enthalten alle Inhalte (Projekte, Referenzen, Trainings, Kategorien, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Passwörter und API-Tokens werden NICHT exportiert (Sicherheit)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Wiederherstellung verwendet Upsert - bestehende Daten werden nicht gelöscht</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Dateipfade werden automatisch auf Umgebungsunabhängigkeit geprüft</span>
            </li>
            <li className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>
                Für Schema-Änderungen: <code className="bg-white px-1 rounded">npx prisma migrate deploy</code> verwenden
              </span>
            </li>
          </ul>
        </motion.div>
      </div>
    </main>
  );
}
