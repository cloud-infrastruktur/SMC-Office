'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Building, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from 'react-use';

interface Contact {
  id: string;
  name: string;
  email: string;
  company?: string;
  position?: string;
  label: string;
  value: string;
}

interface ContactAutocompleteProps {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ContactAutocomplete({
  value,
  onChange,
  placeholder = 'E-Mail-Adresse eingeben...',
  disabled = false,
  className = '',
}: ContactAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useDebounce(
    () => {
      setDebouncedQuery(inputValue);
    },
    300,
    [inputValue]
  );

  // Fetch suggestions
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/crm/contacts/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setShowSuggestions(true);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error('Autocomplete-Fehler:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addEmail = useCallback((email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [value, onChange]);

  const removeEmail = (email: string) => {
    onChange(value.filter((e) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        addEmail(suggestions[selectedIndex].email);
      } else if (inputValue.includes('@')) {
        addEmail(inputValue);
      }
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeEmail(value[value.length - 1]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === ',' || e.key === ';' || e.key === ' ') {
      if (inputValue.includes('@')) {
        e.preventDefault();
        addEmail(inputValue);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex flex-wrap items-center gap-1 p-2 min-h-[42px] border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
        {/* Selected Emails */}
        {value.map((email) => (
          <Badge
            key={email}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-0.5"
          >
            <span className="text-xs">{email}</span>
            <button
              type="button"
              onClick={() => removeEmail(email)}
              className="ml-1 hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-sm placeholder:text-gray-400"
        />

        {loading && (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg overflow-hidden"
          >
            {suggestions.map((contact, index) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => addEmail(contact.email)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
                  ${index === selectedIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                  }
                `}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {contact.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {contact.email}
                  </div>
                </div>
                {contact.company && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Building className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{contact.company}</span>
                  </div>
                )}
                {value.includes(contact.email) && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ContactAutocomplete;
