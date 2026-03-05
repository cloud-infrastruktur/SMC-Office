'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  AlignLeft,
  Repeat,
  Bell,
  Users,
  Briefcase,
  FolderKanban,
  Palette,
  Trash2,
  Check,
  Loader2,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { parseRRule, generateRRule } from '@/lib/ics-parser';

interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  color?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  recurrenceEnd?: Date;
  reminderMinutes?: number;
  isPrivate?: boolean;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  contactId?: string;
  dealId?: string;
  projectId?: string;
  contact?: { id: string; firstName: string; lastName: string; company?: string };
  deal?: { id: string; title: string };
  project?: { id: string; title: string; projectNumber?: string };
  organizer?: string;
  attendees?: Array<{ email: string; name?: string; status?: string }>;
  responseStatus?: string;
  accountId?: string;
}

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  selectedDate?: Date;
  selectedHour?: number;
  onSave: (event: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  contacts?: Array<{ id: string; firstName: string; lastName: string; company?: string }>;
  deals?: Array<{ id: string; title: string }>;
  projects?: Array<{ id: string; title: string; projectNumber: string }>;
  accounts?: Array<{ id: string; name: string; color: string }>;
}

const COLORS = [
  { name: 'Blau', value: '#3b82f6' },
  { name: 'Grün', value: '#22c55e' },
  { name: 'Rot', value: '#ef4444' },
  { name: 'Gelb', value: '#eab308' },
  { name: 'Lila', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Cyan', value: '#06b6d4' }
];

const REMINDER_OPTIONS = [
  { label: 'Keine', value: null },
  { label: '5 Minuten vorher', value: 5 },
  { label: '15 Minuten vorher', value: 15 },
  { label: '30 Minuten vorher', value: 30 },
  { label: '1 Stunde vorher', value: 60 },
  { label: '1 Tag vorher', value: 1440 }
];

export function EventDialog({
  isOpen,
  onClose,
  event,
  selectedDate,
  selectedHour,
  onSave,
  onDelete,
  contacts = [],
  deals = [],
  projects = [],
  accounts = []
}: EventDialogProps) {
  const isEditMode = !!event?.id;
  const [isLoading, setIsLoading] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [showCrmLinks, setShowCrmLinks] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [contactId, setContactId] = useState('');
  const [dealId, setDealId] = useState('');
  const [projectId, setProjectId] = useState('');

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceByDay, setRecurrenceByDay] = useState<string[]>([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  // Initialize form
  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setLocation(event.location || '');
      setAllDay(event.allDay || false);
      setColor(event.color || '#3b82f6');
      setReminderMinutes(event.reminderMinutes || null);
      setIsPrivate(event.isPrivate || false);
      setAccountId(event.accountId || '');
      setContactId(event.contactId || event.contact?.id || '');
      setDealId(event.dealId || event.deal?.id || '');
      setProjectId(event.projectId || event.project?.id || '');
      setIsRecurring(event.isRecurring || false);

      const start = new Date(event.start);
      setStartDate(formatDateForInput(start));
      setStartTime(formatTimeForInput(start));

      if (event.end) {
        const end = new Date(event.end);
        setEndDate(formatDateForInput(end));
        setEndTime(formatTimeForInput(end));
      } else {
        // Default: 1 hour later
        const end = new Date(start);
        end.setHours(end.getHours() + 1);
        setEndDate(formatDateForInput(end));
        setEndTime(formatTimeForInput(end));
      }

      if (event.recurrenceEnd) {
        setRecurrenceEndDate(formatDateForInput(new Date(event.recurrenceEnd)));
      }

      // Show CRM links if any are set
      if (event.contactId || event.dealId || event.projectId) {
        setShowCrmLinks(true);
      }
    } else {
      // New event
      const start = selectedDate ? new Date(selectedDate) : new Date();
      if (selectedHour !== undefined) {
        start.setHours(selectedHour, 0, 0, 0);
      } else {
        // Round to next hour
        start.setMinutes(0, 0, 0);
        start.setHours(start.getHours() + 1);
      }

      const end = new Date(start);
      end.setHours(end.getHours() + 1);

      setTitle('');
      setDescription('');
      setLocation('');
      setStartDate(formatDateForInput(start));
      setStartTime(formatTimeForInput(start));
      setEndDate(formatDateForInput(end));
      setEndTime(formatTimeForInput(end));
      setAllDay(false);
      setColor('#3b82f6');
      setReminderMinutes(15);
      setIsPrivate(false);
      setAccountId('');
      setContactId('');
      setDealId('');
      setProjectId('');
      setIsRecurring(false);
      setRecurrenceEndDate('');
      setShowCrmLinks(false);
    }
  }, [event, selectedDate, selectedHour, isOpen]);

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      const startDateTime = allDay
        ? new Date(`${startDate}T00:00:00`)
        : new Date(`${startDate}T${startTime}`);
      
      const endDateTime = allDay
        ? new Date(`${endDate}T23:59:59`)
        : new Date(`${endDate}T${endTime}`);

      let recurrenceRule = null;
      let recurrenceEnd = null;

      if (isRecurring) {
        recurrenceRule = generateRRule({
          frequency: recurrenceFreq,
          interval: recurrenceInterval,
          byDay: recurrenceFreq === 'WEEKLY' ? recurrenceByDay : undefined,
          until: recurrenceEndDate ? new Date(recurrenceEndDate) : undefined
        });
        if (recurrenceEndDate) {
          recurrenceEnd = new Date(recurrenceEndDate);
        }
      }

      await onSave({
        id: event?.id,
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        start: startDateTime,
        end: endDateTime,
        allDay,
        color,
        reminderMinutes: reminderMinutes || undefined,
        isPrivate,
        isRecurring,
        recurrenceRule: recurrenceRule || undefined,
        recurrenceEnd: recurrenceEnd || undefined,
        accountId: accountId || undefined,
        contactId: contactId || undefined,
        dealId: dealId || undefined,
        projectId: projectId || undefined
      } as any);

      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event?.id || !onDelete) return;
    
    if (!confirm('Möchten Sie diesen Termin wirklich löschen?')) return;

    setIsLoading(true);
    try {
      await onDelete(event.id);
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
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
          className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditMode ? 'Termin bearbeiten' : 'Neuer Termin'}
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Title */}
            <Input
              placeholder="Titel hinzufügen"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium"
              autoFocus
            />

            {/* Date/Time */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Ganztägig</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Start</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  {!allDay && (
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Ende</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  {!allDay && (
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <Input
                placeholder="Ort hinzufügen"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="flex items-start gap-2">
              <AlignLeft className="w-4 h-4 text-gray-500 flex-shrink-0 mt-2" />
              <Textarea
                placeholder="Beschreibung hinzufügen"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Recurrence */}
            <div className="space-y-2">
              <button
                onClick={() => setShowRecurrence(!showRecurrence)}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600"
              >
                <Repeat className="w-4 h-4" />
                <span>Wiederholung</span>
                {isRecurring && <span className="text-blue-600 text-xs">({parseRRule(generateRRule({ frequency: recurrenceFreq, interval: recurrenceInterval, byDay: recurrenceByDay }))})</span>}
              </button>

              {showRecurrence && (
                <div className="pl-6 space-y-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Wiederholen</span>
                  </label>

                  {isRecurring && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Alle</span>
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={recurrenceInterval}
                          onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                          className="w-16"
                        />
                        <select
                          value={recurrenceFreq}
                          onChange={(e) => setRecurrenceFreq(e.target.value as any)}
                          className="rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                        >
                          <option value="DAILY">Tage</option>
                          <option value="WEEKLY">Wochen</option>
                          <option value="MONTHLY">Monate</option>
                          <option value="YEARLY">Jahre</option>
                        </select>
                      </div>

                      {recurrenceFreq === 'WEEKLY' && (
                        <div className="flex flex-wrap gap-1">
                          {['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map((day, i) => (
                            <button
                              key={day}
                              onClick={() => {
                                setRecurrenceByDay(prev =>
                                  prev.includes(day)
                                    ? prev.filter(d => d !== day)
                                    : [...prev, day]
                                );
                              }}
                              className={cn(
                                'w-8 h-8 rounded-full text-xs font-medium transition-colors',
                                recurrenceByDay.includes(day)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600'
                              )}
                            >
                              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][i]}
                            </button>
                          ))}
                        </div>
                      )}

                      <div>
                        <label className="text-xs text-gray-500">Ende der Wiederholung</label>
                        <Input
                          type="date"
                          value={recurrenceEndDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Reminder */}
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-500" />
              <select
                value={reminderMinutes || ''}
                onChange={(e) => setReminderMinutes(e.target.value ? parseInt(e.target.value) : null)}
                className="flex-1 rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
              >
                {REMINDER_OPTIONS.map((opt) => (
                  <option key={opt.value || 'none'} value={opt.value || ''}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Color */}
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-gray-500" />
              <div className="flex gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={cn(
                      'w-6 h-6 rounded-full transition-transform',
                      color === c.value && 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Private */}
            <label className="flex items-center gap-2 cursor-pointer">
              <Lock className="w-4 h-4 text-gray-500" />
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Privat</span>
            </label>

            {/* CRM Links */}
            <div className="space-y-2">
              <button
                onClick={() => setShowCrmLinks(!showCrmLinks)}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600"
              >
                <Briefcase className="w-4 h-4" />
                <span>CRM-Verknüpfungen</span>
              </button>

              {showCrmLinks && (
                <div className="pl-6 space-y-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  {/* Contact */}
                  <div>
                    <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                      <Users className="w-3 h-3" />
                      Kontakt
                    </label>
                    <select
                      value={contactId}
                      onChange={(e) => setContactId(e.target.value)}
                      className="w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                    >
                      <option value="">Kein Kontakt</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.firstName} {c.lastName} {c.company && `(${c.company})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Deal */}
                  <div>
                    <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                      <Briefcase className="w-3 h-3" />
                      Deal
                    </label>
                    <select
                      value={dealId}
                      onChange={(e) => setDealId(e.target.value)}
                      className="w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                    >
                      <option value="">Kein Deal</option>
                      {deals.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Project */}
                  <div>
                    <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                      <FolderKanban className="w-3 h-3" />
                      Projekt
                    </label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                    >
                      <option value="">Kein Projekt</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.projectNumber}: {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Calendar Account (if multiple) */}
            {accounts.length > 1 && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="flex-1 rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                >
                  <option value="">Lokaler Kalender</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Meeting Invitation Response (if applicable) */}
            {event?.responseStatus && event.organizer && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Meeting-Einladung von {event.organizer}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                  Status: {event.responseStatus === 'ACCEPTED' ? 'Zugesagt' : 
                           event.responseStatus === 'DECLINED' ? 'Abgelehnt' :
                           event.responseStatus === 'TENTATIVE' ? 'Vorläufig' : 'Ausstehend'}
                </p>
              </div>
            )}
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
                  <Trash2 className="w-4 h-4 mr-1" />
                  Löschen
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={isLoading || !title.trim()}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                {isEditMode ? 'Speichern' : 'Erstellen'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Helper functions
function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTimeForInput(date: Date): string {
  return date.toTimeString().slice(0, 5);
}
