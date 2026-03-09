'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users, Plus, Pencil, Trash2, Save, X, Search,
  ArrowLeft, Shield, Eye, EyeOff, Mail, Building,
  CheckCircle, XCircle, Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { hasAdminAccess, isAdmin, ROLE_LABELS, ROLE_COLORS, UserRole } from '@/lib/types';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  organization: string | null;
  notes: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  permissions: { area: string }[];
}

const PERMISSION_AREAS = [
  { value: 'PROFILE', label: 'Profil', description: 'Zugriff auf Profil-Downloads' },
  { value: 'REFERENCES', label: 'Kunden-Referenzen', description: 'Zugriff auf Original-Referenzschreiben' },
  { value: 'TRAININGS', label: 'Zertifikate & Trainings', description: 'Zugriff auf Zertifikate & Trainings' },
  { value: 'FILES', label: 'Dateien', description: 'Zugriff auf Downloads' },
];

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'USER', label: 'Registrierter Benutzer' },
  { value: 'CONSULTANT', label: 'Unternehmensberatung' },
  { value: 'CUSTOMER_REF', label: 'Kunden-Referenz' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Administrator' },
];

export default function AdminUsersPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER' as UserRole,
    organization: '',
    notes: '',
    isActive: true,
    permissions: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const userRole = (session?.user as { role?: string })?.role;
  const currentUserId = (session?.user as { id?: string })?.id;
  const currentUserIsAdmin = isAdmin(userRole);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !hasAdminAccess(userRole)) {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchUsers();
    }
  }, [status, userRole, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Fehler:', error);
      toast({ title: 'Fehler', description: 'Benutzer konnten nicht geladen werden', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (user: User) => {
    setEditingId(user.id);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role,
      organization: user.organization || '',
      notes: user.notes || '',
      isActive: user.isActive,
      permissions: user.permissions.map(p => p.area),
    });
  };

  const startCreating = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'USER',
      organization: '',
      notes: '',
      isActive: true,
      permissions: [],
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsCreating(false);
    setShowPassword(false);
  };

  const togglePermission = (area: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(area)
        ? prev.permissions.filter(p => p !== area)
        : [...prev.permissions, area],
    }));
  };

  const handleSave = async () => {
    if (!formData.email) {
      toast({ title: 'Fehler', description: 'E-Mail ist erforderlich', variant: 'destructive' });
      return;
    }
    if (isCreating && !formData.password) {
      toast({ title: 'Fehler', description: 'Passwort ist erforderlich', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const url = isCreating ? '/api/admin/users' : `/api/admin/users/${editingId}`;
      const method = isCreating ? 'POST' : 'PUT';
      
      const payload = {
        ...formData,
        password: formData.password || undefined, // Nur senden wenn gesetzt
      };
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Speichern');

      toast({ title: 'Erfolg', description: isCreating ? 'Benutzer erstellt' : 'Benutzer aktualisiert' });
      await fetchUsers();
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
    if (!confirm('Benutzer wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Löschen');

      toast({ title: 'Erfolg', description: 'Benutzer gelöscht' });
      await fetchUsers();
    } catch (error) {
      toast({ 
        title: 'Fehler', 
        description: error instanceof Error ? error.message : 'Fehler beim Löschen',
        variant: 'destructive' 
      });
    }
  };

  // Filtern nach Suche
  const filteredUsers = users.filter(u => 
    (u.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.organization?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Gruppieren nach Rolle
  const groupedUsers = filteredUsers.reduce((acc, user) => {
    const key = user.role;
    if (!acc[key]) acc[key] = [];
    acc[key].push(user);
    return acc;
  }, {} as Record<string, User[]>);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
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
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Benutzerverwaltung</h1>
                <p className="text-gray-600 dark:text-gray-400">Benutzer und Rollen verwalten (RBAC)</p>
              </div>
            </div>
            {currentUserIsAdmin && (
              <Button onClick={startCreating} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Neuer Benutzer
              </Button>
            )}
          </div>

          {/* Role Legend */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">Rollen-Hierarchie</p>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(role => (
                    <Badge key={role.value} className={ROLE_COLORS[role.value]}>
                      {role.label}
                    </Badge>
                  ))}
                </div>
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
            {users.length} Benutzer
          </Badge>
        </div>

        {/* Create Form */}
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-6 border-2 border-blue-200"
          >
            <h3 className="text-lg font-bold mb-4">Neuen Benutzer erstellen</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Name</label>
                <Input
                  placeholder="Vollständiger Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">E-Mail *</label>
                <Input
                  type="email"
                  placeholder="benutzer@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Passwort *</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mindestens 8 Zeichen"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Rolle *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                >
                  {ROLES.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Organisation</label>
                <Input
                  placeholder="z.B. Hays, Krongaard"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
                />
                <label htmlFor="isActive" className="text-sm font-medium">Aktiv</label>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Zusätzliche Berechtigungen</label>
              <div className="flex flex-wrap gap-2">
                {PERMISSION_AREAS.map(area => (
                  <label key={area.value} className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                    <Checkbox
                      checked={formData.permissions.includes(area.value)}
                      onCheckedChange={() => togglePermission(area.value)}
                    />
                    <span className="text-sm">{area.label}</span>
                  </label>
                ))}
              </div>
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

        {/* Users by Role */}
        <div className="space-y-6">
          {ROLES.slice().reverse().map(roleInfo => {
            const roleUsers = groupedUsers[roleInfo.value] || [];
            if (roleUsers.length === 0) return null;
            
            return (
              <motion.div
                key={roleInfo.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden"
              >
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      {roleInfo.label}
                    </h2>
                    <Badge className="bg-white/20 text-white border-white/30">
                      {roleUsers.length} Benutzer
                    </Badge>
                  </div>
                </div>
                <div className="divide-y dark:divide-slate-700">
                  {roleUsers.map((user) => (
                    <div key={user.id} className="p-4">
                      {editingId === user.id ? (
                        // Edit Form
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium mb-1 block">Name</label>
                              <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">E-Mail *</label>
                              <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">Neues Passwort</label>
                              <div className="relative">
                                <Input
                                  type={showPassword ? 'text' : 'password'}
                                  placeholder="Leer lassen um nicht zu ändern"
                                  value={formData.password}
                                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                >
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                            {currentUserIsAdmin && (
                              <div>
                                <label className="text-sm font-medium mb-1 block">Rolle *</label>
                                <select
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700"
                                  value={formData.role}
                                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                >
                                  {ROLES.map(role => (
                                    <option key={role.value} value={role.value}>{role.label}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <div>
                              <label className="text-sm font-medium mb-1 block">Organisation</label>
                              <Input
                                value={formData.organization}
                                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`isActive-${user.id}`}
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
                              />
                              <label htmlFor={`isActive-${user.id}`} className="text-sm font-medium">Aktiv</label>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Zusätzliche Berechtigungen</label>
                            <div className="flex flex-wrap gap-2">
                              {PERMISSION_AREAS.map(area => (
                                <label key={area.value} className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                                  <Checkbox
                                    checked={formData.permissions.includes(area.value)}
                                    onCheckedChange={() => togglePermission(area.value)}
                                  />
                                  <span className="text-sm">{area.label}</span>
                                </label>
                              ))}
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
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {user.name || '(Kein Name)'}
                              </span>
                              {user.isActive ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {user.email}
                              </div>
                              {user.organization && (
                                <div className="flex items-center gap-1">
                                  <Building className="w-4 h-4" />
                                  {user.organization}
                                </div>
                              )}
                              {user.permissions.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Key className="w-4 h-4" />
                                  {user.permissions.map(p => p.area).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => startEditing(user)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {currentUserIsAdmin && user.id !== currentUserId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDelete(user.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Keine Benutzer gefunden</p>
          </div>
        )}
      </div>
    </main>
  );
}
