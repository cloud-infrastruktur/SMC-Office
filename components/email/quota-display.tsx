'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface QuotaDisplayProps {
  accountId: string;
  className?: string;
}

interface QuotaInfo {
  used: number;
  total: number;
  percentage: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function QuotaDisplay({ accountId, className = '' }: QuotaDisplayProps) {
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);

  const fetchQuota = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/email/quota?accountId=${accountId}`);
      const data = await res.json();
      if (data.success) {
        setQuota(data.quota);
        setSupported(data.supported);
      }
    } catch (error) {
      console.error('Quota-Abfrage fehlgeschlagen:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
  }, [accountId]);

  if (!supported) {
    return null;
  }

  const isWarning = quota && quota.percentage > 80;
  const isCritical = quota && quota.percentage > 95;

  return (
    <div className={`p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <HardDrive className={`w-4 h-4 ${
            isCritical ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-gray-500'
          }`} />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Speicherplatz</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={fetchQuota}
          disabled={loading}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {quota ? (
        <>
          <Progress 
            value={quota.percentage} 
            className={`h-2 ${
              isCritical ? '[&>div]:bg-red-500' : 
              isWarning ? '[&>div]:bg-yellow-500' : 
              '[&>div]:bg-blue-500'
            }`}
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatBytes(quota.used)} von {formatBytes(quota.total)}
            </span>
            <span className={`text-xs font-medium ${
              isCritical ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-gray-600 dark:text-gray-300'
            }`}>
              {quota.percentage}%
            </span>
          </div>
          {isCritical && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1 mt-2 text-xs text-red-600 dark:text-red-400"
            >
              <AlertTriangle className="w-3 h-3" />
              Speicherplatz fast voll!
            </motion.div>
          )}
        </>
      ) : (
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
      )}
    </div>
  );
}

export default QuotaDisplay;
