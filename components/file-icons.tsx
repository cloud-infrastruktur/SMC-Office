"use client";

import React from 'react';

interface FileIconProps {
  fileName: string;
  mimeType?: string;
  size?: number;
  className?: string;
}

export function FileIcon({ fileName, mimeType, size = 40, className = '' }: FileIconProps) {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const type = mimeType?.toLowerCase() || '';
  
  // PDF
  if (extension === 'pdf' || type.includes('pdf')) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
        <rect x="6" y="2" width="36" height="44" rx="3" fill="#DC2626" />
        <path d="M12 2v8a2 2 0 01-2 2H2" fill="none" stroke="#B91C1C" strokeWidth="2" />
        <rect x="10" y="20" width="28" height="16" rx="2" fill="white" />
        <text x="24" y="32" textAnchor="middle" fill="#DC2626" fontSize="10" fontWeight="bold">PDF</text>
      </svg>
    );
  }
  
  // Word Documents
  if (['doc', 'docx', 'odt'].includes(extension) || type.includes('word') || type.includes('document')) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
        <rect x="6" y="2" width="36" height="44" rx="3" fill="#2563EB" />
        <path d="M12 2v8a2 2 0 01-2 2H2" fill="none" stroke="#1D4ED8" strokeWidth="2" />
        <rect x="10" y="16" width="28" height="22" rx="2" fill="white" />
        <text x="24" y="23" textAnchor="middle" fill="#2563EB" fontSize="8" fontWeight="bold">W</text>
        <line x1="14" y1="28" x2="34" y2="28" stroke="#93C5FD" strokeWidth="2" />
        <line x1="14" y1="32" x2="30" y2="32" stroke="#93C5FD" strokeWidth="2" />
      </svg>
    );
  }
  
  // Excel/Spreadsheets
  if (['xls', 'xlsx', 'csv', 'ods'].includes(extension) || type.includes('excel') || type.includes('spreadsheet')) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
        <rect x="6" y="2" width="36" height="44" rx="3" fill="#16A34A" />
        <path d="M12 2v8a2 2 0 01-2 2H2" fill="none" stroke="#15803D" strokeWidth="2" />
        <rect x="10" y="16" width="28" height="22" rx="2" fill="white" />
        <text x="24" y="23" textAnchor="middle" fill="#16A34A" fontSize="8" fontWeight="bold">X</text>
        <rect x="14" y="27" width="8" height="4" fill="#BBF7D0" stroke="#16A34A" strokeWidth="0.5" />
        <rect x="22" y="27" width="8" height="4" fill="#BBF7D0" stroke="#16A34A" strokeWidth="0.5" />
        <rect x="14" y="31" width="8" height="4" fill="#BBF7D0" stroke="#16A34A" strokeWidth="0.5" />
        <rect x="22" y="31" width="8" height="4" fill="#BBF7D0" stroke="#16A34A" strokeWidth="0.5" />
      </svg>
    );
  }
  
  // PowerPoint/Presentations
  if (['ppt', 'pptx', 'odp'].includes(extension) || type.includes('powerpoint') || type.includes('presentation')) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
        <rect x="6" y="2" width="36" height="44" rx="3" fill="#EA580C" />
        <path d="M12 2v8a2 2 0 01-2 2H2" fill="none" stroke="#C2410C" strokeWidth="2" />
        <rect x="10" y="16" width="28" height="22" rx="2" fill="white" />
        <text x="24" y="31" textAnchor="middle" fill="#EA580C" fontSize="12" fontWeight="bold">P</text>
      </svg>
    );
  }
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension) || type.includes('image')) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
        <rect x="6" y="2" width="36" height="44" rx="3" fill="#7C3AED" />
        <rect x="10" y="8" width="28" height="32" rx="2" fill="white" />
        <circle cx="18" cy="16" r="4" fill="#FCD34D" />
        <path d="M10 32l8-8 4 4 8-10 8 10v4a2 2 0 01-2 2H12a2 2 0 01-2-2v-2z" fill="#86EFAC" />
      </svg>
    );
  }
  
  // Text files
  if (['txt', 'rtf', 'md'].includes(extension) || type.includes('text')) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
        <rect x="6" y="2" width="36" height="44" rx="3" fill="#6B7280" />
        <rect x="10" y="8" width="28" height="32" rx="2" fill="white" />
        <line x1="14" y1="14" x2="34" y2="14" stroke="#D1D5DB" strokeWidth="2" />
        <line x1="14" y1="20" x2="30" y2="20" stroke="#D1D5DB" strokeWidth="2" />
        <line x1="14" y1="26" x2="32" y2="26" stroke="#D1D5DB" strokeWidth="2" />
        <line x1="14" y1="32" x2="26" y2="32" stroke="#D1D5DB" strokeWidth="2" />
      </svg>
    );
  }
  
  // ZIP/Archive
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension) || type.includes('zip') || type.includes('archive')) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
        <rect x="6" y="2" width="36" height="44" rx="3" fill="#F59E0B" />
        <rect x="20" y="6" width="8" height="36" fill="#FBBF24" />
        <rect x="21" y="8" width="6" height="3" fill="#78350F" />
        <rect x="21" y="13" width="6" height="3" fill="#78350F" />
        <rect x="21" y="18" width="6" height="3" fill="#78350F" />
        <rect x="21" y="23" width="6" height="3" fill="#78350F" />
        <rect x="19" y="28" width="10" height="12" rx="1" fill="#78350F" />
        <circle cx="24" cy="34" r="2" fill="#FBBF24" />
      </svg>
    );
  }
  
  // Default file icon
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
      <rect x="6" y="2" width="36" height="44" rx="3" fill="#94A3B8" />
      <path d="M32 2v10a2 2 0 002 2h8" fill="white" />
      <path d="M32 2l10 10" stroke="#64748B" strokeWidth="2" fill="none" />
      <rect x="12" y="20" width="24" height="2" rx="1" fill="white" opacity="0.5" />
      <rect x="12" y="26" width="20" height="2" rx="1" fill="white" opacity="0.5" />
      <rect x="12" y="32" width="16" height="2" rx="1" fill="white" opacity="0.5" />
    </svg>
  );
}

// File type badge colors
export function getFileTypeColor(fileName: string, mimeType?: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const type = mimeType?.toLowerCase() || '';
  
  if (extension === 'pdf' || type.includes('pdf')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (['doc', 'docx', 'odt'].includes(extension) || type.includes('word')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(extension) || type.includes('excel')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (['ppt', 'pptx', 'odp'].includes(extension) || type.includes('powerpoint')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension) || type.includes('image')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
}

// Format file extension for display
export function getFileExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toUpperCase() || 'FILE';
  return ext.length > 5 ? ext.slice(0, 5) : ext;
}

// Format file size
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return 'Unbekannt';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Check if file is previewable
export function isPreviewable(fileName: string, mimeType?: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const type = mimeType?.toLowerCase() || '';
  
  // PDFs are previewable
  if (extension === 'pdf' || type.includes('pdf')) return true;
  
  // Images are previewable
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension) || type.includes('image')) return true;
  
  return false;
}
