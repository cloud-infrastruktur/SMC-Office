'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Power,
  Move,
  Mail,
  Star,
  Tag,
  Forward,
  Trash,
  X,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

interface Condition {
  field: 'from' | 'to' | 'subject' | 'body';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'notContains';
  value: string;
}

interface Rule {
  id: string;
  accountId: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  conditions: Condition[];
  matchAll: boolean;
  moveToFolder: string | null;
  markAsRead: boolean;
  markAsStarred: boolean;
  addCategory: string | null;
  forwardTo: string | null;
  deleteMessage: boolean;
  account?: { id: string; name: string; email: string };
}

interface RulesManagerProps {
  accountId: string;
  folders: { id: string; name: string; path: string }[];
  categories: { id: string; name: string; color: string }[];
  onClose: () => void;
}

const fieldOptions = [
  { value: 'from', label: 'Absender' },
  { value: 'to', label: 'Empfänger' },
  { value: 'subject', label: 'Betreff' },
  { value: 'body', label: 'Inhalt' },
];

const operatorOptions = [
  { value: 'contains', label: 'enthält' },
  { value: 'equals', label: 'ist gleich' },
  { value: 'startsWith', label: 'beginnt mit' },
  { value: 'endsWith', label: 'endet mit' },
  { value: 'notContains', label: 'enthält nicht' },
];

const emptyCondition: Condition = { field: 'from', operator: 'contains', value: '' };

export function RulesManager({ accountId, folders, categories, onClose }: RulesManagerProps) {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [conditions, setConditions] = useState<Condition[]>([{ ...emptyCondition }]);
  const [matchAll, setMatchAll] = useState(true);
  const [moveToFolder, setMoveToFolder] = useState('');
  const [markAsRead, setMarkAsRead] = useState(false);
  const [markAsStarred, setMarkAsStarred] = useState(false);
  const [addCategory, setAddCategory] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [deleteMessage, setDeleteMessage] = useState(false);

  // Load Rules
  useEffect(() => {
    loadRules();
  }, [accountId]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/email/rules?accountId=${accountId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRules(data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Regeln:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setConditions([{ ...emptyCondition }]);
    setMatchAll(true);
    setMoveToFolder('');
    setMarkAsRead(false);
    setMarkAsStarred(false);
    setAddCategory('');
    setForwardTo('');
    setDeleteMessage(false);
    setEditingRule(null);
  };

  const openEditor = (rule?: Rule) => {
    if (rule) {
      setEditingRule(rule);
      setName(rule.name);
      setConditions(rule.conditions as Condition[]);
      setMatchAll(rule.matchAll);
      setMoveToFolder(rule.moveToFolder || '');
      setMarkAsRead(rule.markAsRead);
      setMarkAsStarred(rule.markAsStarred);
      setAddCategory(rule.addCategory || '');
      setForwardTo(rule.forwardTo || '');
      setDeleteMessage(rule.deleteMessage);
    } else {
      resetForm();
    }
    setShowEditor(true);
  };

  const addCondition = () => {
    setConditions([...conditions, { ...emptyCondition }]);
  };

  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  const saveRule = async () => {
    if (!name.trim()) {
      toast({ title: 'Fehler', description: 'Name ist erforderlich', variant: 'destructive' });
      return;
    }

    if (conditions.some(c => !c.value.trim())) {
      toast({ title: 'Fehler', description: 'Alle Bedingungen müssen ausgefüllt sein', variant: 'destructive' });
      return;
    }

    try {
      const data = {
        accountId,
        name,
        conditions,
        matchAll,
        moveToFolder: moveToFolder || null,
        markAsRead,
        markAsStarred,
        addCategory: addCategory || null,
        forwardTo: forwardTo || null,
        deleteMessage,
        isActive: true,
      };

      const url = editingRule ? `/api/email/rules/${editingRule.id}` : '/api/email/rules';
      const method = editingRule ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast({ title: 'Erfolg', description: editingRule ? 'Regel aktualisiert' : 'Regel erstellt' });
        setShowEditor(false);
        resetForm();
        loadRules();
      } else {
        const error = await res.json();
        toast({ title: 'Fehler', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Speichern fehlgeschlagen', variant: 'destructive' });
    }
  };

  const toggleRule = async (rule: Rule) => {
    try {
      await fetch(`/api/email/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rule, isActive: !rule.isActive }),
      });
      loadRules();
    } catch (error) {
      console.error('Toggle fehlgeschlagen:', error);
    }
  };

  const deleteRule = async (rule: Rule) => {
    if (!confirm(`Regel "${rule.name}" wirklich löschen?`)) return;
    try {
      await fetch(`/api/email/rules/${rule.id}`, { method: 'DELETE' });
      toast({ title: 'Erfolg', description: 'Regel gelöscht' });
      loadRules();
    } catch (error) {
      toast({ title: 'Fehler', description: 'Löschen fehlgeschlagen', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            E-Mail-Regeln
          </DialogTitle>
        </DialogHeader>

        {!showEditor ? (
          // Regeln-Liste
          <div className="space-y-4">
            <Button onClick={() => openEditor()} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Neue Regel erstellen
            </Button>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Lade Regeln...</div>
            ) : rules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Keine Regeln vorhanden
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <motion.div
                    key={rule.id}
                    layout
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                    
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => toggleRule(rule)}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{rule.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rule.moveToFolder && (
                          <Badge variant="secondary" className="text-xs">
                            <Move className="w-3 h-3 mr-1" />
                            {rule.moveToFolder}
                          </Badge>
                        )}
                        {rule.markAsRead && (
                          <Badge variant="secondary" className="text-xs">
                            <Mail className="w-3 h-3 mr-1" />
                            Als gelesen
                          </Badge>
                        )}
                        {rule.markAsStarred && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Markieren
                          </Badge>
                        )}
                        {rule.deleteMessage && (
                          <Badge variant="destructive" className="text-xs">
                            <Trash className="w-3 h-3 mr-1" />
                            Löschen
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button variant="ghost" size="sm" onClick={() => openEditor(rule)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteRule(rule)} className="text-red-500 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Regel-Editor
          <div className="space-y-6">
            <div>
              <Label>Regelname</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Newsletter verschieben"
              />
            </div>

            {/* Bedingungen */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Bedingungen</Label>
                <div className="flex items-center gap-2 text-sm">
                  <span className={matchAll ? 'font-medium' : 'text-gray-400'}>Alle</span>
                  <Switch checked={!matchAll} onCheckedChange={(v) => setMatchAll(!v)} />
                  <span className={!matchAll ? 'font-medium' : 'text-gray-400'}>Eine</span>
                </div>
              </div>

              {conditions.map((condition, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select value={condition.field} onValueChange={(v) => updateCondition(index, 'field', v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={condition.operator} onValueChange={(v) => updateCondition(index, 'operator', v)}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operatorOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    value={condition.value}
                    onChange={(e) => updateCondition(index, 'value', e.target.value)}
                    placeholder="Wert..."
                    className="flex-1"
                  />

                  <Button variant="ghost" size="sm" onClick={() => removeCondition(index)} disabled={conditions.length === 1}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addCondition}>
                <Plus className="w-4 h-4 mr-1" />
                Bedingung hinzufügen
              </Button>
            </div>

            {/* Aktionen */}
            <div className="space-y-4">
              <Label>Aktionen</Label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Verschieben nach</Label>
                  <Select value={moveToFolder} onValueChange={setMoveToFolder}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ordner wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nicht verschieben</SelectItem>
                      {folders.map(f => (
                        <SelectItem key={f.id} value={f.path}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Kategorie zuweisen</Label>
                  <Select value={addCategory} onValueChange={setAddCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategorie wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Keine Kategorie</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Weiterleiten an</Label>
                  <Input
                    type="email"
                    value={forwardTo}
                    onChange={(e) => setForwardTo(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={markAsRead} onCheckedChange={setMarkAsRead} />
                  <span className="text-sm">Als gelesen markieren</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={markAsStarred} onCheckedChange={setMarkAsStarred} />
                  <span className="text-sm">Stern hinzufügen</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={deleteMessage} onCheckedChange={setDeleteMessage} />
                  <span className="text-sm text-red-500">Nachricht löschen</span>
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setShowEditor(false); resetForm(); }}>
                Abbrechen
              </Button>
              <Button onClick={saveRule}>
                {editingRule ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RulesManager;
