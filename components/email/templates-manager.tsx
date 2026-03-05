'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Search,
  Zap,
  FolderOpen,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  accountId: string | null;
  name: string;
  subject: string;
  content: string;
  category: string | null;
  shortcut: string | null;
  variables: string[];
  isActive: boolean;
  account?: { id: string; name: string; email: string } | null;
}

interface TemplatesManagerProps {
  accountId?: string;
  onClose: () => void;
  onInsert?: (template: Template) => void;
  selectMode?: boolean;
}

const defaultCategories = [
  'Begrüßung',
  'Abwesenheit',
  'Dank',
  'Bestätigung',
  'Anfrage',
  'Abschluss',
  'Sonstiges',
];

const placeholderVariables = [
  { key: 'name', label: 'Name' },
  { key: 'vorname', label: 'Vorname' },
  { key: 'nachname', label: 'Nachname' },
  { key: 'firma', label: 'Firma' },
  { key: 'datum', label: 'Datum' },
  { key: 'uhrzeit', label: 'Uhrzeit' },
  { key: 'absender', label: 'Absendername' },
];

export function TemplatesManager({ accountId, onClose, onInsert, selectMode = false }: TemplatesManagerProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [shortcut, setShortcut] = useState('');

  // Load Templates
  useEffect(() => {
    loadTemplates();
  }, [accountId]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const url = accountId 
        ? `/api/email/templates?accountId=${accountId}`
        : '/api/email/templates';
      const res = await fetch(url);
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSubject('');
    setContent('');
    setCategory('');
    setShortcut('');
    setEditingTemplate(null);
  };

  const openEditor = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setName(template.name);
      setSubject(template.subject);
      setContent(template.content);
      setCategory(template.category || '');
      setShortcut(template.shortcut || '');
    } else {
      resetForm();
    }
    setShowEditor(true);
  };

  const insertVariable = (variable: string) => {
    setContent(content + `{{${variable}}}`);
  };

  const saveTemplate = async () => {
    if (!name.trim() || !content.trim()) {
      toast({ title: 'Fehler', description: 'Name und Inhalt sind erforderlich', variant: 'destructive' });
      return;
    }

    // Variablen aus dem Inhalt extrahieren
    const variableMatches = content.match(/\{\{(\w+)\}\}/g) || [];
    const variables = variableMatches.map(m => m.replace(/[{}]/g, ''));

    try {
      const data = {
        accountId: accountId || null,
        name,
        subject,
        content,
        category: category || null,
        shortcut: shortcut || null,
        variables,
        isActive: true,
      };

      const url = editingTemplate ? `/api/email/templates/${editingTemplate.id}` : '/api/email/templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast({ title: 'Erfolg', description: editingTemplate ? 'Template aktualisiert' : 'Template erstellt' });
        setShowEditor(false);
        resetForm();
        loadTemplates();
      } else {
        const error = await res.json();
        toast({ title: 'Fehler', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Speichern fehlgeschlagen', variant: 'destructive' });
    }
  };

  const deleteTemplate = async (template: Template) => {
    if (!confirm(`Template "${template.name}" wirklich löschen?`)) return;
    try {
      await fetch(`/api/email/templates/${template.id}`, { method: 'DELETE' });
      toast({ title: 'Erfolg', description: 'Template gelöscht' });
      loadTemplates();
    } catch (error) {
      toast({ title: 'Fehler', description: 'Löschen fehlgeschlagen', variant: 'destructive' });
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Gruppiert nach Kategorie
  const groupedTemplates = filteredTemplates.reduce((acc, t) => {
    const cat = t.category || 'Sonstiges';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, Template[]>);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {selectMode ? 'Schnellantwort einfügen' : 'Schnellantworten / Templates'}
          </DialogTitle>
        </DialogHeader>

        {!showEditor ? (
          // Templates-Liste
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Templates suchen..."
                  className="pl-10"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Alle</SelectItem>
                  {[...new Set([...defaultCategories, ...categories])].map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!selectMode && (
                <Button onClick={() => openEditor()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Neu
                </Button>
              )}
            </div>

            {/* Templates Grid */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Lade Templates...</div>
              ) : Object.keys(groupedTemplates).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Keine Templates gefunden
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedTemplates).map(([category, templates]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {templates.map((template) => (
                          <motion.div
                            key={template.id}
                            layout
                            className={`
                              p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700
                              ${selectMode ? 'cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''}
                            `}
                            onClick={() => selectMode && onInsert?.(template)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{template.name}</div>
                                {template.shortcut && (
                                  <Badge variant="secondary" className="mt-1 text-xs">
                                    <Zap className="w-3 h-3 mr-1" />
                                    {template.shortcut}
                                  </Badge>
                                )}
                              </div>
                              {!selectMode && (
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openEditor(template)}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => deleteTemplate(template)} className="text-red-500">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                              {template.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                            </p>
                            {template.variables.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {template.variables.slice(0, 3).map(v => (
                                  <Badge key={v} variant="outline" className="text-xs">
                                    {`{{${v}}}`}
                                  </Badge>
                                ))}
                                {template.variables.length > 3 && (
                                  <Badge variant="outline" className="text-xs">+{template.variables.length - 3}</Badge>
                                )}
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Template-Editor
          <div className="space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Begrüßung"
                />
              </div>
              <div>
                <Label>Kategorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Betreff (optional)</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Betreff der E-Mail..."
                />
              </div>
              <div>
                <Label>Kürzel (optional)</Label>
                <Input
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  placeholder="z.B. gr (für Gruß)"
                  maxLength={10}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Inhalt *</Label>
                <div className="flex flex-wrap gap-1">
                  {placeholderVariables.map(v => (
                    <Button
                      key={v.key}
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => insertVariable(v.key)}
                    >
                      {`{{${v.key}}}`}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Template-Inhalt... Verwenden Sie {{variablen}} für Platzhalter."
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setShowEditor(false); resetForm(); }}>
                Abbrechen
              </Button>
              <Button onClick={saveTemplate}>
                {editingTemplate ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default TemplatesManager;
