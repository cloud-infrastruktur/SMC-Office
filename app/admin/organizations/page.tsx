'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Contact,
  Globe,
  Mail,
  Phone,
  MapPin,
  Save,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Organization {
  id: string;
  name: string;
  displayName: string | null;
  industry: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: { users: number; contacts: number };
}

export default function OrganizationsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deleteOrg, setDeleteOrg] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    industry: '',
    website: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Deutschland',
    description: '',
    isActive: true,
    sortOrder: 0,
  });

  useEffect(() => {
    if (status === 'loading') return;
    const userRole = (session?.user as { role?: string })?.role;
    if (!session || !['ADMIN', 'MANAGER'].includes(userRole || '')) {
      router.push('/admin');
      return;
    }
    fetchOrganizations();
  }, [session, status, router]);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/admin/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast({ title: 'Fehler', description: 'Organisationen konnten nicht geladen werden', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      industry: '',
      website: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'Deutschland',
      description: '',
      isActive: true,
      sortOrder: 0,
    });
    setEditingOrg(null);
  };

  const openEditDialog = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      displayName: org.displayName || '',
      industry: org.industry || '',
      website: org.website || '',
      email: org.email || '',
      phone: org.phone || '',
      address: org.address || '',
      city: org.city || '',
      postalCode: org.postalCode || '',
      country: org.country || 'Deutschland',
      description: org.description || '',
      isActive: org.isActive,
      sortOrder: org.sortOrder,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Fehler', description: 'Name ist erforderlich', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const url = editingOrg
        ? `/api/admin/organizations/${editingOrg.id}`
        : '/api/admin/organizations';
      const method = editingOrg ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({ title: 'Erfolg', description: editingOrg ? 'Organisation aktualisiert' : 'Organisation erstellt' });
        setDialogOpen(false);
        resetForm();
        fetchOrganizations();
      } else {
        const data = await res.json();
        toast({ title: 'Fehler', description: data.error || 'Fehler beim Speichern', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error saving organization:', error);
      toast({ title: 'Fehler', description: 'Fehler beim Speichern', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteOrg) return;

    try {
      const res = await fetch(`/api/admin/organizations/${deleteOrg.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Erfolg', description: 'Organisation gelöscht' });
        setDeleteOrg(null);
        fetchOrganizations();
      } else {
        const data = await res.json();
        toast({ title: 'Fehler', description: data.error || 'Fehler beim Löschen', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast({ title: 'Fehler', description: 'Fehler beim Löschen', variant: 'destructive' });
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            Organisationen
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Verwalten Sie Kunden-Organisationen und deren Zuordnungen
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Neue Organisation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingOrg ? 'Organisation bearbeiten' : 'Neue Organisation'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Firmenname"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Anzeigename</label>
                <Input
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Anzeigename (optional)"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Branche</label>
                <Input
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="z.B. IT, Finanzen, Produktion"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Website</label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">E-Mail</label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@firma.de"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefon</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+49 ..."
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Adresse</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Straße und Hausnummer"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">PLZ</label>
                <Input
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="12345"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Stadt</label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Stadt"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Land</label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sortierung</label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Beschreibung</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Notizen zur Organisation"
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label className="text-sm text-gray-700 dark:text-gray-300">Aktiv</label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Speichern
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Organisationen</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{organizations.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Verknüpfte Benutzer</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {organizations.reduce((sum, org) => sum + org._count.users, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Contact className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Verknüpfte Kontakte</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {organizations.reduce((sum, org) => sum + org._count.contacts, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Organisations-Liste */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
        {organizations.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Noch keine Organisationen angelegt</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {organizations.map((org) => (
              <div key={org.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${org.isActive ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <Building2 className={`h-5 w-5 ${org.isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {org.displayName || org.name}
                        {!org.isActive && <span className="ml-2 text-xs text-gray-500">(inaktiv)</span>}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        {org.industry && <span>{org.industry}</span>}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {org._count.users}
                        </span>
                        <span className="flex items-center gap-1">
                          <Contact className="h-3 w-3" />
                          {org._count.contacts}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === org.id ? null : org.id)}
                    >
                      {expandedId === org.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(org)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteOrg(org)}
                      disabled={org._count.users > 0 || org._count.contacts > 0}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Erweiterte Details */}
                {expandedId === org.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {org.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{org.email}</span>
                      </div>
                    )}
                    {org.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{org.phone}</span>
                      </div>
                    )}
                    {org.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Website
                        </a>
                      </div>
                    )}
                    {(org.city || org.address) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {[org.address, org.postalCode, org.city].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    {org.description && (
                      <div className="col-span-2 md:col-span-4">
                        <p className="text-gray-600 dark:text-gray-400">{org.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteOrg} onOpenChange={() => setDeleteOrg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Organisation löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie die Organisation &quot;{deleteOrg?.name}&quot; wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
