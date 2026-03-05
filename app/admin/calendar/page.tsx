'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Calendar,
  Plus,
  Settings,
  RefreshCw,
  Cloud,
  Loader2,
  AlertCircle,
  CheckCircle,
  Download,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CalendarGrid, CalendarView, CalendarEvent, EventDialog, AccountDialog } from '@/components/calendar';

type CalendarProvider = 'LOCAL' | 'APPLE' | 'NEXTCLOUD' | 'GOOGLE' | 'CALDAV_GENERIC';

interface CalendarAccount {
  id: string;
  name: string;
  provider: CalendarProvider;
  caldavUrl?: string;
  username?: string;
  password?: string;
  color: string;
  isActive: boolean;
  lastSync?: string;
  syncError?: string;
  _count?: { events: number };
}

interface CrmContact {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
}

interface CrmDeal {
  id: string;
  title: string;
}

interface CrmProject {
  id: string;
  title: string;
  projectNumber: string;
}

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  // State
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [projects, setProjects] = useState<CrmProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Dialogs
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<CalendarAccount | null>(null);
  const [newEventDate, setNewEventDate] = useState<Date | undefined>();
  const [newEventHour, setNewEventHour] = useState<number | undefined>();

  // Auth check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Calculate date range based on view
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);
      
      if (view === 'month') {
        startDate.setDate(1);
        startDate.setDate(startDate.getDate() - 7); // Include prev month days
        endDate.setMonth(endDate.getMonth() + 1, 0);
        endDate.setDate(endDate.getDate() + 7); // Include next month days
      } else if (view === 'week') {
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - (day === 0 ? 6 : day - 1));
        endDate.setDate(startDate.getDate() + 6);
      } else if (view === 'agenda') {
        endDate.setMonth(endDate.getMonth() + 3);
      }

      // Fetch events
      const eventsRes = await fetch(
        `/api/calendar/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      );
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events.map((e: any) => ({
          ...e,
          start: new Date(e.start),
          end: e.end ? new Date(e.end) : undefined
        })));
      }

      // Fetch accounts
      const accountsRes = await fetch('/api/calendar/accounts');
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data.accounts);
      }

      // Fetch CRM data for linking
      const [contactsRes, dealsRes, projectsRes] = await Promise.all([
        fetch('/api/crm/contacts?limit=100'),
        fetch('/api/crm/deals?limit=100'),
        fetch('/api/crm/projects?limit=100')
      ]);

      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data.contacts || []);
      }
      if (dealsRes.ok) {
        const data = await dealsRes.json();
        setDeals(data.deals || []);
      }
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
      toast({
        title: 'Fehler',
        description: 'Kalenderdaten konnten nicht geladen werden',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, view, toast]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadData();
    }
  }, [status, loadData]);

  // Sync calendars
  const handleSync = async () => {
    setIsSyncing(true);
    let totalSynced = 0;
    let errors: string[] = [];

    try {
      for (const account of accounts.filter(a => a.provider !== 'LOCAL' && a.isActive)) {
        const res = await fetch(`/api/calendar/accounts/${account.id}/sync`, {
          method: 'POST'
        });
        const data = await res.json();
        
        if (data.success) {
          totalSynced += data.synced || 0;
        } else {
          errors.push(`${account.name}: ${data.error}`);
        }
      }

      if (errors.length > 0) {
        toast({
          title: 'Synchronisation teilweise fehlgeschlagen',
          description: errors.join(', '),
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Synchronisation abgeschlossen',
          description: `${totalSynced} Termine synchronisiert`
        });
      }

      await loadData();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Synchronisation fehlgeschlagen',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Event handlers
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setNewEventDate(undefined);
    setNewEventHour(undefined);
    setEventDialogOpen(true);
  };

  const handleSlotClick = (date: Date, hour?: number) => {
    setSelectedEvent(null);
    setNewEventDate(date);
    setNewEventHour(hour);
    setEventDialogOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedEvent(null);
    setNewEventDate(new Date());
    setNewEventHour(undefined);
    setEventDialogOpen(true);
  };

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    try {
      const isEdit = !!eventData.id;
      const url = isEdit 
        ? `/api/calendar/events/${eventData.id}`
        : '/api/calendar/events';
      
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Fehler beim Speichern');
      }

      toast({
        title: isEdit ? 'Termin aktualisiert' : 'Termin erstellt',
        description: eventData.title
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/calendar/events/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Fehler beim Löschen');
      }

      toast({ title: 'Termin gelöscht' });
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Account handlers
  const handleSaveAccount = async (accountData: any) => {
    try {
      const isEdit = !!accountData.id;
      const url = isEdit 
        ? `/api/calendar/accounts/${accountData.id}`
        : '/api/calendar/accounts';
      
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Fehler beim Speichern');
      }

      toast({
        title: isEdit ? 'Kalender aktualisiert' : 'Kalender hinzugefügt',
        description: accountData.name
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/calendar/accounts/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Fehler beim Löschen');
      }

      toast({ title: 'Kalender entfernt' });
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Export ICS
  const handleExport = async () => {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const res = await fetch(
        `/api/calendar/ics?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      );

      if (!res.ok) throw new Error('Export fehlgeschlagen');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kalender.ics';
      a.click();
      window.URL.revokeObjectURL(url);

      toast({ title: 'Export erfolgreich' });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Export fehlgeschlagen',
        variant: 'destructive'
      });
    }
  };

  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-[2000px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Kalender
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {events.length} Termine
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sync Button */}
              {accounts.some(a => a.provider !== 'LOCAL') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-1" />
                  )}
                  Synchronisieren
                </Button>
              )}

              {/* Export */}
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>

              {/* Add Account */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedAccount(null);
                  setAccountDialogOpen(true);
                }}
              >
                <Cloud className="w-4 h-4 mr-1" />
                Kalender
              </Button>
            </div>
          </div>

          {/* Account Pills */}
          {accounts.length > 0 && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    setSelectedAccount(account);
                    setAccountDialogOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: account.color }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {account.name}
                  </span>
                  {account.syncError && (
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  )}
                  {account.lastSync && !account.syncError && account.provider !== 'LOCAL' && (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  )}
                  <span className="text-xs text-gray-500">
                    ({account._count?.events || 0})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="max-w-[2000px] mx-auto h-[calc(100vh-180px)]">
        <CalendarGrid
          events={events}
          view={view}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onViewChange={setView}
          onEventClick={handleEventClick}
          onSlotClick={handleSlotClick}
          onCreateClick={handleCreateClick}
        />
      </div>

      {/* Event Dialog */}
      <EventDialog
        isOpen={eventDialogOpen}
        onClose={() => setEventDialogOpen(false)}
        event={selectedEvent as any}
        selectedDate={newEventDate}
        selectedHour={newEventHour}
        onSave={handleSaveEvent as any}
        onDelete={handleDeleteEvent}
        contacts={contacts}
        deals={deals}
        projects={projects}
        accounts={accounts.map(a => ({ id: a.id, name: a.name, color: a.color }))}
      />

      {/* Account Dialog */}
      <AccountDialog
        isOpen={accountDialogOpen}
        onClose={() => setAccountDialogOpen(false)}
        account={selectedAccount as any}
        onSave={handleSaveAccount}
        onDelete={handleDeleteAccount}
      />
    </div>
  );
}
