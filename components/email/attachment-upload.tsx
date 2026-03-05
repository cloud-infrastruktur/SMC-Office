'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paperclip,
  X,
  FileText,
  Image,
  FileArchive,
  File,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export interface AttachmentFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  error?: string;
  preview?: string;
}

interface AttachmentUploadProps {
  attachments: AttachmentFile[];
  onAdd: (files: AttachmentFile[]) => void;
  onRemove: (id: string) => void;
  maxSize?: number; // in MB
  maxFiles?: number;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image;
  if (type.includes('pdf') || type.includes('document')) return FileText;
  if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return FileArchive;
  return File;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function AttachmentUpload({
  attachments,
  onAdd,
  onRemove,
  maxSize = 25,
  maxFiles = 10,
  disabled = false,
}: AttachmentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const maxSizeBytes = maxSize * 1024 * 1024;

    const newAttachments: AttachmentFile[] = [];

    for (const file of fileArray) {
      if (attachments.length + newAttachments.length >= maxFiles) {
        break;
      }

      const attachment: AttachmentFile = {
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 100,
      };

      if (file.size > maxSizeBytes) {
        attachment.error = `Datei zu groß (max. ${maxSize} MB)`;
      }

      // Vorschau für Bilder
      if (file.type.startsWith('image/') && !attachment.error) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachment.preview = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }

      newAttachments.push(attachment);
    }

    if (newAttachments.length > 0) {
      onAdd(newAttachments);
    }
  }, [attachments.length, maxFiles, maxSize, onAdd]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [disabled, processFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const totalSize = attachments.reduce((sum, a) => sum + a.size, 0);

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Dateien hierher ziehen oder <span className="text-blue-500">klicken</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Max. {maxSize} MB pro Datei, {maxFiles} Dateien insgesamt
        </p>
      </div>

      {/* Attachments List */}
      <AnimatePresence mode="popLayout">
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {attachments.map((attachment) => {
              const Icon = getFileIcon(attachment.type);
              const hasError = !!attachment.error;

              return (
                <motion.div
                  key={attachment.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`
                    flex items-center gap-3 p-2 rounded-lg border
                    ${hasError 
                      ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20' 
                      : 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800'
                    }
                  `}
                >
                  {/* Preview / Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                    {attachment.preview ? (
                      <img src={attachment.preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Icon className={`w-5 h-5 ${hasError ? 'text-red-500' : 'text-gray-500'}`} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{attachment.name}</span>
                      {hasError && <AlertCircle className="w-4 h-4 text-red-500" />}
                    </div>
                    {hasError ? (
                      <span className="text-xs text-red-500">{attachment.error}</span>
                    ) : (
                      <span className="text-xs text-gray-500">{formatFileSize(attachment.size)}</span>
                    )}
                    {attachment.progress < 100 && (
                      <Progress value={attachment.progress} className="h-1 mt-1" />
                    )}
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(attachment.id);
                    }}
                    className="flex-shrink-0 h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              );
            })}

            {/* Total Size */}
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>{attachments.length} Datei(en)</span>
              <span>Gesamt: {formatFileSize(totalSize)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AttachmentUpload;
