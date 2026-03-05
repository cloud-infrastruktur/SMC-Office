'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  FolderOpen,
  Inbox,
  Send,
  FileText,
  Trash2,
  Archive,
  Star,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Plus,
  Pencil,
  FolderPlus,
  CheckCheck,
  Eraser,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Types
export interface EmailFolder {
  id: string;
  name: string;
  path: string;
  type: string;
  unreadCount: number;
  totalCount: number;
  children?: EmailFolder[];
}

interface FolderTreeProps {
  folders: EmailFolder[];
  selectedFolder: EmailFolder | null;
  expandedFolders: Set<string>;
  onSelectFolder: (folder: EmailFolder) => void;
  onToggleExpand: (folderId: string) => void;
  onCreateFolder: (parentPath?: string) => void;
  onRenameFolder: (folder: EmailFolder) => void;
  onDeleteFolder: (folder: EmailFolder) => void;
  onMarkAllRead: (folder: EmailFolder) => void;
  onEmptyFolder: (folder: EmailFolder) => void;
  onDragStart?: (e: React.DragEvent, folder: EmailFolder) => void;
  onDragOver?: (e: React.DragEvent, folder: EmailFolder) => void;
  onDrop?: (e: React.DragEvent, folder: EmailFolder) => void;
}

// Folder Icon Mapping
const folderIcons: Record<string, any> = {
  inbox: Inbox,
  sent: Send,
  drafts: FileText,
  trash: Trash2,
  archive: Archive,
  starred: Star,
  spam: AlertCircle,
  custom: Folder,
};

// System-Ordner die nicht gelöscht/umbenannt werden können
const protectedTypes = ['inbox', 'sent', 'drafts', 'trash', 'spam'];

// Ordner die geleert werden können
const emptyableTypes = ['trash', 'spam'];

// Hierarchische Struktur aufbauen
export function buildFolderHierarchy(folders: EmailFolder[]): EmailFolder[] {
  const tree: EmailFolder[] = [];
  const folderMap = new Map<string, EmailFolder>();

  // Sortieren nach Typ und Pfad
  const sortedFolders = [...folders].sort((a, b) => {
    const typeOrder: Record<string, number> = {
      inbox: 1, drafts: 2, sent: 3, starred: 4, archive: 5, spam: 6, trash: 7, custom: 10
    };
    const aOrder = typeOrder[a.type] || 10;
    const bOrder = typeOrder[b.type] || 10;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.path.localeCompare(b.path);
  });

  // Alle Ordner als Nodes erstellen
  sortedFolders.forEach(folder => {
    folderMap.set(folder.path, { ...folder, children: [] });
  });

  // Hierarchie aufbauen
  sortedFolders.forEach(folder => {
    const node = folderMap.get(folder.path)!;
    const lastSlash = folder.path.lastIndexOf('/');
    const parentPath = lastSlash > 0 ? folder.path.substring(0, lastSlash) : '';
    
    if (parentPath && folderMap.has(parentPath)) {
      folderMap.get(parentPath)!.children!.push(node);
    } else {
      tree.push(node);
    }
  });

  return tree;
}

// Einzelner Ordner-Knoten
function FolderNode({
  folder,
  level,
  selectedFolder,
  expandedFolders,
  onSelectFolder,
  onToggleExpand,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMarkAllRead,
  onEmptyFolder,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverFolder,
}: FolderTreeProps & { folder: EmailFolder; level: number; dragOverFolder?: string }) {
  const Icon = folderIcons[folder.type] || Folder;
  const isSelected = selectedFolder?.id === folder.id;
  const isExpanded = expandedFolders.has(folder.id);
  const hasChildren = folder.children && folder.children.length > 0;
  const isProtected = protectedTypes.includes(folder.type);
  const canEmpty = emptyableTypes.includes(folder.type);
  const isDragOver = dragOverFolder === folder.id;

  return (
    <div className="select-none">
      <div
        className={`
          group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer
          transition-all duration-150
          ${isSelected 
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' 
            : 'hover:bg-gray-100 dark:hover:bg-slate-700/50 text-gray-700 dark:text-gray-300'
          }
          ${isDragOver ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''}
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelectFolder(folder)}
        draggable={!isProtected}
        onDragStart={(e) => onDragStart?.(e, folder)}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver?.(e, folder);
        }}
        onDrop={(e) => onDrop?.(e, folder)}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(folder.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Folder Icon */}
        {isExpanded && hasChildren ? (
          <FolderOpen className="w-4 h-4 flex-shrink-0" />
        ) : (
          <Icon className="w-4 h-4 flex-shrink-0" />
        )}

        {/* Folder Name */}
        <span className="flex-1 text-sm truncate">{folder.name}</span>

        {/* Unread Count */}
        {folder.unreadCount > 0 && (
          <span className="text-xs font-medium bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
            {folder.unreadCount}
          </span>
        )}

        {/* Context Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onCreateFolder(folder.path)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Neuer Unterordner
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!isProtected && (
              <>
                <DropdownMenuItem onClick={() => onRenameFolder(folder)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Umbenennen
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDeleteFolder(folder)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => onMarkAllRead(folder)}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Alle als gelesen
            </DropdownMenuItem>
            {canEmpty && (
              <DropdownMenuItem 
                onClick={() => onEmptyFolder(folder)}
                className="text-red-600 dark:text-red-400"
              >
                <Eraser className="w-4 h-4 mr-2" />
                Ordner leeren
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {folder.children!.map((child) => (
              <FolderNode
                key={child.id}
                folder={child}
                level={level + 1}
                folders={[]} // Not needed for children
                selectedFolder={selectedFolder}
                expandedFolders={expandedFolders}
                onSelectFolder={onSelectFolder}
                onToggleExpand={onToggleExpand}
                onCreateFolder={onCreateFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
                onMarkAllRead={onMarkAllRead}
                onEmptyFolder={onEmptyFolder}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                dragOverFolder={dragOverFolder}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Haupt-Komponente
export function FolderTree(props: FolderTreeProps) {
  const [dragOverFolder, setDragOverFolder] = useState<string | undefined>();
  const hierarchy = buildFolderHierarchy(props.folders);

  const handleDragOver = (e: React.DragEvent, folder: EmailFolder) => {
    e.preventDefault();
    setDragOverFolder(folder.id);
    props.onDragOver?.(e, folder);
  };

  const handleDrop = (e: React.DragEvent, folder: EmailFolder) => {
    setDragOverFolder(undefined);
    props.onDrop?.(e, folder);
  };

  const handleDragEnd = () => {
    setDragOverFolder(undefined);
  };

  return (
    <div 
      className="space-y-0.5"
      onDragEnd={handleDragEnd}
      onDragLeave={() => setDragOverFolder(undefined)}
    >
      {/* Neuer Ordner Button */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2"
        onClick={() => props.onCreateFolder()}
      >
        <Plus className="w-4 h-4 mr-2" />
        Neuer Ordner
      </Button>

      {/* Folder Hierarchy */}
      {hierarchy.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          level={0}
          {...props}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          dragOverFolder={dragOverFolder}
        />
      ))}
    </div>
  );
}

export default FolderTree;
