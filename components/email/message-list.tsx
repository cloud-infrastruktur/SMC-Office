'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Paperclip,
  Mail,
  MailOpen,
  Trash2,
  Archive,
  Tag,
  ChevronDown,
  ChevronUp,
  GripVertical,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

export interface EmailMessage {
  uid: number;
  messageId: string | null;
  subject: string;
  fromAddress: string;
  fromName: string | null;
  toAddresses: string[];
  ccAddresses: string[];
  date: string | null;
  snippet: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  threadId?: string;
  inReplyTo?: string;
  size?: number;
}

export type SortField = 'date' | 'subject' | 'from' | 'size';
export type SortOrder = 'asc' | 'desc';
export type GroupBy = 'none' | 'date' | 'sender';

interface MessageListProps {
  messages: EmailMessage[];
  selectedMessage: EmailMessage | null;
  selectedMessages: Set<number>;
  sortField: SortField;
  sortOrder: SortOrder;
  groupBy: GroupBy;
  onSelectMessage: (message: EmailMessage) => void;
  onToggleSelect: (uid: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onToggleStar: (message: EmailMessage) => void;
  onToggleRead: (message: EmailMessage) => void;
  onDelete: (uids: number[]) => void;
  onArchive: (uids: number[]) => void;
  onSort: (field: SortField) => void;
  onGroupBy: (group: GroupBy) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, message: EmailMessage) => void;
  loading?: boolean;
}

// Datum-Gruppierung bestimmen
function getDateGroup(dateStr: string | null): string {
  if (!dateStr) return 'Unbekannt';
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Heute';
    if (isYesterday(date)) return 'Gestern';
    if (isThisWeek(date)) return 'Diese Woche';
    if (isThisMonth(date)) return 'Dieser Monat';
    return format(date, 'MMMM yyyy', { locale: de });
  } catch {
    return 'Unbekannt';
  }
}

// Absender-Gruppierung
function getSenderGroup(message: EmailMessage): string {
  return message.fromName || message.fromAddress.split('@')[0] || 'Unbekannt';
}

// Sortier-Header
function SortHeader({
  label,
  field,
  currentField,
  currentOrder,
  onSort,
  className = '',
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentOrder: SortOrder;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentField === field;
  return (
    <button
      className={`flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ${className}`}
      onClick={() => onSort(field)}
    >
      {label}
      {isActive && (
        currentOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      )}
    </button>
  );
}

// Gruppen-Header
function GroupHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
        {title}
      </span>
      <Badge variant="secondary" className="text-xs">
        {count}
      </Badge>
    </div>
  );
}

// Einzelne Nachricht
function MessageRow({
  message,
  isSelected,
  isChecked,
  onSelect,
  onToggleCheck,
  onToggleStar,
  onDragStart,
}: {
  message: EmailMessage;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
  onToggleStar: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`
        group flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700/50
        cursor-pointer transition-colors
        ${isSelected 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500' 
          : 'hover:bg-gray-50 dark:hover:bg-slate-800/50 border-l-2 border-l-transparent'
        }
        ${!message.isRead ? 'bg-white dark:bg-slate-800' : ''}
      `}
      onClick={onSelect}
      draggable
      onDragStart={onDragStart}
    >
      {/* Drag Handle */}
      <div className="opacity-0 group-hover:opacity-50 cursor-grab">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {/* Checkbox */}
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isChecked}
          onCheckedChange={onToggleCheck}
          className="data-[state=checked]:bg-blue-500"
        />
      </div>

      {/* Star */}
      <button
        className="flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar();
        }}
      >
        <Star
          className={`w-4 h-4 transition-colors ${
            message.isStarred
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'
          }`}
        />
      </button>

      {/* Read/Unread Indicator */}
      <div className="flex-shrink-0">
        {message.isRead ? (
          <MailOpen className="w-4 h-4 text-gray-400" />
        ) : (
          <Mail className="w-4 h-4 text-blue-500" />
        )}
      </div>

      {/* Sender */}
      <div className="w-48 flex-shrink-0 truncate">
        <span className={`text-sm ${!message.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
          {message.fromName || message.fromAddress}
        </span>
      </div>

      {/* Subject & Snippet */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm truncate ${!message.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
            {message.subject || '(Kein Betreff)'}
          </span>
          {message.hasAttachments && (
            <Paperclip className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
          {message.snippet}
        </p>
      </div>

      {/* Date */}
      <div className="flex-shrink-0 text-right">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {message.date ? format(parseISO(message.date), 'dd.MM.yy HH:mm', { locale: de }) : ''}
        </span>
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  selectedMessage,
  selectedMessages,
  sortField,
  sortOrder,
  groupBy,
  onSelectMessage,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onToggleStar,
  onToggleRead,
  onDelete,
  onArchive,
  onSort,
  onGroupBy,
  onDragStart,
  loading,
}: MessageListProps) {
  // Sortierte Nachrichten
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = (a.date || '').localeCompare(b.date || '');
          break;
        case 'subject':
          cmp = (a.subject || '').localeCompare(b.subject || '');
          break;
        case 'from':
          cmp = (a.fromName || a.fromAddress).localeCompare(b.fromName || b.fromAddress);
          break;
        case 'size':
          cmp = (a.size || 0) - (b.size || 0);
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [messages, sortField, sortOrder]);

  // Gruppierte Nachrichten
  const groupedMessages = useMemo(() => {
    if (groupBy === 'none') {
      return [{ title: '', messages: sortedMessages }];
    }

    const groups = new Map<string, EmailMessage[]>();
    sortedMessages.forEach((msg) => {
      const key = groupBy === 'date' ? getDateGroup(msg.date) : getSenderGroup(msg);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(msg);
    });

    return Array.from(groups.entries()).map(([title, messages]) => ({
      title,
      messages,
    }));
  }, [sortedMessages, groupBy]);

  const allSelected = selectedMessages.size === messages.length && messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header mit Sortierung */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => allSelected ? onDeselectAll() : onSelectAll()}
          />
          {selectedMessages.size > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selectedMessages.size} ausgewählt
            </span>
          )}
        </div>

        <div className="flex-1 flex items-center gap-4">
          <SortHeader label="Datum" field="date" currentField={sortField} currentOrder={sortOrder} onSort={onSort} />
          <SortHeader label="Absender" field="from" currentField={sortField} currentOrder={sortOrder} onSort={onSort} />
          <SortHeader label="Betreff" field="subject" currentField={sortField} currentOrder={sortOrder} onSort={onSort} />
          <SortHeader label="Größe" field="size" currentField={sortField} currentOrder={sortOrder} onSort={onSort} />
        </div>

        {/* Gruppierung */}
        <select
          value={groupBy}
          onChange={(e) => onGroupBy(e.target.value as GroupBy)}
          className="text-xs bg-transparent border border-gray-200 dark:border-slate-600 rounded px-2 py-1"
        >
          <option value="none">Keine Gruppierung</option>
          <option value="date">Nach Datum</option>
          <option value="sender">Nach Absender</option>
        </select>
      </div>

      {/* Nachrichten-Liste */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {groupedMessages.map((group, groupIndex) => (
            <div key={group.title || groupIndex}>
              {group.title && (
                <GroupHeader title={group.title} count={group.messages.length} />
              )}
              {group.messages.map((message) => (
                <MessageRow
                  key={message.uid}
                  message={message}
                  isSelected={selectedMessage?.uid === message.uid}
                  isChecked={selectedMessages.has(message.uid)}
                  onSelect={() => onSelectMessage(message)}
                  onToggleCheck={() => onToggleSelect(message.uid)}
                  onToggleStar={() => onToggleStar(message)}
                  onDragStart={(e) => onDragStart(e, message)}
                />
              ))}
            </div>
          ))}
        </AnimatePresence>

        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <Mail className="w-12 h-12 mb-2" />
            <p>Keine Nachrichten</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageList;
