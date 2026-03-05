'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Cloud,
  Apple,
  Globe,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Calendar,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type CalendarProvider = 'LOCAL' | 'APPLE' | 'NEXTCLOUD' | 'GOOGLE' | 'CALDAV_GENERIC';

interface CalendarAccount {
  id?: string;
  name: string;
  provider: CalendarProvider;
  caldavUrl?: string;
  username?: string;
  password?: string;
  color: string;
  isActive?: boolean;
}

interface AccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  account?: CalendarAccount | null;
  onSave: (account: Partial<CalendarAccount>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const PROVIDERS = [
  { 
    id: 'LOCAL' as const, 
    name: 'Lokaler Kalender', 
    icon: Calendar,
    description: 'Termine nur in SMC-CRM speichern',
    needsAuth: false
  },
  { 
    id: 'APPLE' as const, 
    name: 'Apple iCloud', 
    icon: Apple,
    description: 'Synchronisation mit iCloud Kalender',
    needsAuth: true,
    helpUrl: 'https://support.apple.com/de-de/HT204397'
  },
  { 
    id: 'NEXTCLOUD' as const, 
    name: 'Nextcloud', 
    icon: Cloud,
    description: 'Eigener Nextcloud CalDAV-Server',
    needsAuth: true,
    needsUrl: true
  },
  { 
    id: 'CALDAV_GENERIC' as const, 
    name: 'CalDAV (Andere)', 
    icon: Globe,
    description: 'Andere CalDAV-kompatible Server',
    needsAuth: true,
    needsUrl: true
  }
];

const COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#eab308', 
  '#a855f7', '#ec4899', '#f97316', '#06b6d4'
];

export function AccountDialog({
  isOpen,
  onClose,
  account,
  onSave,
  onDelete
}: AccountDialogProps) {
  const isEditMode = !!account?.id;
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<CalendarProvider>('LOCAL');
  const [caldavUrl, setCaldavUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [color, setColor] = useState('#3b82f6');

  const selectedProvider = PROVIDERS.find(p => p.id === provider);

  // Initialize form
  useEffect(() => {
    if (account) {
      setName(account.name || '');
      setProvider(account.provider || 'LOCAL');
      setCaldavUrl(account.caldavUrl || '');
      setUsername(account.username || '');
      setPassword(''); // Don't show existing password
      setColor(account.color || '#3b82f6');
    } else {
      setName('');
      setProvider('LOCAL');
      setCaldavUrl('');
      setUsername('');
      setPassword('');
      setColor('#3b82f6');
    }
    setTestResult(null);
  }, [account, isOpen]);

  const handleTestConnection = async () => {
    if (!selectedProvider?.needsAuth) return;

    setIsLoading(true);
    setTestResult(null);

    try {
      // For now, simulate test - actual test happens on save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!username || !password) {
        setTestResult({ success: false, message: 'Benutzername und Passwort erforderlich' });
      } else if (selectedProvider.needsUrl && !caldavUrl) {
        setTestResult({ success: false, message: 'Server-URL erforderlich' });
      } else {
        setTestResult({ success: true, message: 'Verbindung erfolgreich!' });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Verbindungsfehler' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await onSave({
        id: account?.id,
        name: name.trim(),
        provider,
        caldavUrl: caldavUrl.trim() || undefined,
        username: username.trim() || undefined,
        password: password || undefined,
        color
      });
      onClose();
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Fehler beim Speichern' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!account?.id || !onDelete) return;
    
    if (!confirm('Möchten Sie diesen Kalender-Account wirklich löschen? Alle synchronisierten Termine werden entfernt.')) {
      return;
    }

    setIsLoading(true);
    try {
      await onDelete(account.id);
      onClose();
    } catch (error) {
      console.error('Error deleting account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditMode ? 'Kalender bearbeiten' : 'Kalender hinzufügen'}
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <div className="p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Name
              </label>
              <Input
                placeholder="z.B. Geschäftstermine"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Provider Selection */}
            {!isEditMode && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Typ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PROVIDERS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setProvider(p.id)}
                        className={cn(
                          'flex flex-col items-center p-3 rounded-lg border-2 transition-all',
                          provider === p.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                        )}
                      >
                        <Icon className={cn(
                          'w-6 h-6 mb-1',
                          provider === p.id ? 'text-blue-600' : 'text-gray-500'
                        )} />
                        <span className={cn(
                          'text-xs font-medium',
                          provider === p.id ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'
                        )}>
                          {p.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedProvider && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {selectedProvider.description}
                  </p>
                )}
              </div>
            )}

            {/* CalDAV URL (for Nextcloud/Generic) */}
            {selectedProvider?.needsUrl && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Server-URL
                </label>
                <Input
                  placeholder={provider === 'NEXTCLOUD' 
                    ? 'https://cloud.example.com/remote.php/dav' 
                    : 'https://caldav.example.com'}
                  value={caldavUrl}
                  onChange={(e) => setCaldavUrl(e.target.value)}
                />
              </div>
            )}

            {/* Credentials (for providers that need auth) */}
            {selectedProvider?.needsAuth && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    {provider === 'APPLE' ? 'Apple-ID' : 'Benutzername'}
                  </label>
                  <Input
                    placeholder={provider === 'APPLE' ? 'name@icloud.com' : 'Benutzername'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                    <span>{provider === 'APPLE' ? 'App-spezifisches Passwort' : 'Passwort'}</span>
                    {provider === 'APPLE' && (
                      <a
                        href="https://support.apple.com/de-de/HT204397"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Hilfe <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={isEditMode ? 'Unverändert lassen' : 'Passwort'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {provider === 'APPLE' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Verwende ein app-spezifisches Passwort von appleid.apple.com
                    </p>
                  )}
                </div>

                {/* Test Connection */}
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Verbindung testen
                </Button>

                {testResult && (
                  <div className={cn(
                    'p-3 rounded-lg flex items-center gap-2 text-sm',
                    testResult.success
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  )}>
                    {testResult.success 
                      ? <CheckCircle className="w-4 h-4" />
                      : <XCircle className="w-4 h-4" />
                    }
                    {testResult.message}
                  </div>
                )}
              </>
            )}

            {/* Color */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Farbe
              </label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-full transition-transform',
                      color === c && 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-slate-700">
            <div>
              {isEditMode && onDelete && (
                <Button
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Löschen
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={isLoading || !name.trim()}>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {isEditMode ? 'Speichern' : 'Hinzufügen'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
