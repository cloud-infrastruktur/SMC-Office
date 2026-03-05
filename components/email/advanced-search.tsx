'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Paperclip,
  User,
  Mail,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export interface SearchFilters {
  query: string;
  from: string;
  to: string;
  subject: string;
  hasAttachment: boolean;
  isUnread: boolean;
  isStarred: boolean;
  dateFrom: string;
  dateTo: string;
  folder: string;
}

interface AdvancedSearchProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  onClear: () => void;
  folders: { id: string; name: string; path: string }[];
}

const defaultFilters: SearchFilters = {
  query: '',
  from: '',
  to: '',
  subject: '',
  hasAttachment: false,
  isUnread: false,
  isStarred: false,
  dateFrom: '',
  dateTo: '',
  folder: '',
};

export function AdvancedSearch({
  filters,
  onFiltersChange,
  onSearch,
  onClear,
  folders,
}: AdvancedSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'query') return false;
    if (typeof value === 'boolean') return value;
    return value !== '';
  }).length;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm">
      {/* Haupt-Suchfeld */}
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="E-Mails durchsuchen..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 pr-4"
          />
        </div>

        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="flex-shrink-0">
            {activeFilterCount} Filter
          </Badge>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-shrink-0"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 mr-1" />
          ) : (
            <ChevronDown className="w-4 h-4 mr-1" />
          )}
          Filter
        </Button>

        <Button onClick={onSearch} size="sm" className="flex-shrink-0">
          Suchen
        </Button>
      </div>

      {/* Erweiterte Filter */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-gray-100 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {/* Von */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-sm">
                    <User className="w-3.5 h-3.5" />
                    Von
                  </Label>
                  <Input
                    type="text"
                    placeholder="Absender..."
                    value={filters.from}
                    onChange={(e) => updateFilter('from', e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                </div>

                {/* An */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-sm">
                    <Mail className="w-3.5 h-3.5" />
                    An
                  </Label>
                  <Input
                    type="text"
                    placeholder="Empfänger..."
                    value={filters.to}
                    onChange={(e) => updateFilter('to', e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                </div>

                {/* Betreff */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-sm">
                    <Tag className="w-3.5 h-3.5" />
                    Betreff
                  </Label>
                  <Input
                    type="text"
                    placeholder="Betreff enthält..."
                    value={filters.subject}
                    onChange={(e) => updateFilter('subject', e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                </div>

                {/* Datum von */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-sm">
                    <Calendar className="w-3.5 h-3.5" />
                    Von Datum
                  </Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  />
                </div>

                {/* Datum bis */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-sm">
                    <Calendar className="w-3.5 h-3.5" />
                    Bis Datum
                  </Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter('dateTo', e.target.value)}
                  />
                </div>

                {/* Ordner */}
                <div className="space-y-1">
                  <Label className="text-sm">Ordner</Label>
                  <select
                    value={filters.folder}
                    onChange={(e) => updateFilter('folder', e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                  >
                    <option value="">Alle Ordner</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.path}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Checkboxen */}
              <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.hasAttachment}
                    onCheckedChange={(checked) => updateFilter('hasAttachment', checked)}
                  />
                  <Paperclip className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Mit Anhängen</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.isUnread}
                    onCheckedChange={(checked) => updateFilter('isUnread', checked)}
                  />
                  <span className="text-sm">Nur ungelesen</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.isStarred}
                    onCheckedChange={(checked) => updateFilter('isStarred', checked)}
                  />
                  <span className="text-sm">Markiert</span>
                </label>

                <div className="flex-1" />

                <Button variant="ghost" size="sm" onClick={onClear}>
                  <X className="w-4 h-4 mr-1" />
                  Filter zurücksetzen
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { defaultFilters };
export default AdvancedSearch;
