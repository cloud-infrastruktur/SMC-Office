'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building, Plus, Pencil, Trash2, Save, X, Search,
  ArrowLeft, AlertTriangle, CheckCircle, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { hasAdminAccess } from '@/lib/types';

interface Client {
  id: string;
  name: string;
  anonymizedName: string;
  industry: string;
  description?: string;
  sortOrder: number;
  _count: {
    projects: number;
    references: number;
  };
}

interface Industry {
  id: string;
  name: string;
  description?: string;
}

export default function AdminClientsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    anonymizedName: '',
    industry: '',
    description: '',
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  const userRole = (session?.user as { role?: string })?.role;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !hasAdminAccess(userRole)) {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchClients();
    }
  }, [status, userRole, router]);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/admin/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
        setIndustries(data.industries || []);
      }
    } catch (error) {
      console.error('Fehler:', error);
      toast({ title: 'Fehler', description: 'Kunden konnten nicht geladen werden', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (client: Client) => {
    setEditingId(client.id);
    setFormData({
      name: client.name,
      anonymizedName: client.anonymizedName,
      industry: client.industry,
      description: client.description || '',
      sortOrder: client.sortOrder,
    });
  };

  const startCreating = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({
      name: '',
      anonymizedName: '',
      industry: '',
      description: '',
      sortOrder: 0,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.anonymizedName || !formData.industry) {
      toast({ title: 'Fehler', description: 'Alle Pflichtfelder ausfüllen', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const url = isCreating ? '/api/admin/clients' : `/api/admin/clients/${editingId}`;
      const method = isCreating ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Speichern');

      toast({ title: 'Erfolg', description: isCreating ? 'Kunde erstellt' : 'Kunde aktualisiert' });
      await fetchClients();
      cancelEditing();
    } catch (error) {
      toast({ 
        title: 'Fehler', 
        description: error instanceof Error ? error.message : 'Fehler beim Speichern',
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Kunde wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/admin/clients/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Löschen');

      toast({ title: 'Erfolg', description: 'Kunde gelöscht' });
      await fetchClients();
    } catch (error) {
      toast({ 
        title: 'Fehler', 
        description: error instanceof Error ? error.message : 'Fehler beim Löschen',
        variant: 'destructive' 
      });
    }
  };

  // Filtern nach Suche
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.anonymizedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Gruppieren nach Branche
  const groupedClients = filteredClients.reduce((acc, client) => {
    const key = client.industry;
    if (!acc[key]) acc[key] = [];
    acc[key].push(client);
    return acc;
  }, {} as Record<string, Client[]>);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="container-adaptive">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Zurück
                </Button>
              </Link>
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <Building className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kunden-Anonymisierung</h1>
                <p className="text-gray-600 dark:text-gray-400">Kundenname ↔ Anonymisierter Begriff Matrix</p>
              </div>
            </div>
            <Button onClick={startCreating} className="gap-2 bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4" />
              Neuer Kunde
            </Button>
          </div>

          {/* Info Box */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
              <div>
                <p className="font-medium text-purple-900 dark:text-purple-100">Anonymisierungs-Matrix</p>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Hier definieren Sie, wie echte Kundennamen für nicht autorisierte Benutzer anonymisiert werden.
                  Benutzer mit Rolle "USER" sehen nur anonymisierte Namen, während "CONSULTANT" und höher die echten Namen sehen.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="outline" className="px-4 py-2">
            {clients.length} Kunden
          </Badge>
        </div>

        {/* Create Form */}
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-6 border-2 border-purple-200"
          >
            <h3 className="text-lg font-bold mb-4">Neuen Kunden erstellen</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Echter Kundenname *</label>
                <Input
                  placeholder="z.B. Landesamt für zentrale polizeiliche Dienste"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Anonymisierter Name *</label>
                <Input
                  placeholder="z.B. Behörden und Organisationen mit Sicherheitsaufgaben (BOS)"
                  value={formData.anonymizedName}
                  onChange={(e) => setFormData({ ...formData, anonymizedName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Branche *</label>
                <Input
                  placeholder="z.B. BOS, Banking, Automotive, IT, Telco"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Sortierung</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Beschreibung</label>
              <Textarea
                placeholder="Optionale Beschreibung..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" /> : <Save className="w-4 h-4" />}
                Speichern
              </Button>
              <Button variant="outline" onClick={cancelEditing}>
                <X className="w-4 h-4 mr-2" />
                Abbrechen
              </Button>
            </div>
          </motion.div>
        )}

        {/* Clients by Industry */}
        <div className="space-y-6">
          {Object.entries(groupedClients).map(([industry, industryClients]) => (
            <motion.div
              key={industry}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {industry}
                  </h2>
                  <Badge className="bg-white/20 text-white border-white/30">
                    {industryClients.length} Kunden
                  </Badge>
                </div>
              </div>
              <div className="divide-y dark:divide-slate-700">
                {industryClients.map((client) => (
                  <div key={client.id} className="p-4">
                    {editingId === client.id ? (
                      // Edit Form
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Echter Kundenname *</label>
                            <Input
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Anonymisierter Name *</label>
                            <Input
                              value={formData.anonymizedName}
                              onChange={(e) => setFormData({ ...formData, anonymizedName: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Branche *</label>
                            <Input
                              value={formData.industry}
                              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Sortierung</label>
                            <Input
                              type="number"
                              value={formData.sortOrder}
                              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                            {saving ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" /> : <Save className="w-4 h-4" />}
                            Speichern
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            <X className="w-4 h-4 mr-2" />
                            Abbrechen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Display
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {client.name}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-purple-600 dark:text-purple-400 font-medium">
                              {client.anonymizedName}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              {client._count.projects} Projekte
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {client._count.references} Referenzen
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => startEditing(client)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(client.id)}
                            disabled={client._count.projects > 0 || client._count.references > 0}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Keine Kunden gefunden</p>
            <Button onClick={startCreating} className="mt-4 gap-2">
              <Plus className="w-4 h-4" />
              Ersten Kunden erstellen
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
