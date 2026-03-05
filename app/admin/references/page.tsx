"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Loader2,
  Building2,
  Landmark,
  Factory,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Reference {
  id: string;
  client: string;
  period: string;
  role: string;
  focus: string;
  industry: string;
  sortOrder: number;
  projectId: string | null;
}

interface Project {
  id: string;
  title: string;
  client: string;
}

export default function AdminReferencesPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();
  const [references, setReferences] = useState<Reference[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Reference>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReference, setNewReference] = useState<Partial<Reference>>({
    client: "",
    period: "",
    role: "",
    focus: "",
    industry: "banking",
    sortOrder: 0,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const userRole = (session?.user as any)?.role;
      if (!["admin", "ADMIN"].includes(userRole)) {
        router.push("/");
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  async function fetchData() {
    try {
      const [refsRes, projectsRes] = await Promise.all([
        fetch('/api/references'),
        fetch('/api/projects'),
      ]);
      if (refsRes.ok) setReferences(await refsRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(id: string) {
    try {
      const res = await fetch(`/api/references/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast({ title: "Gespeichert", description: "Referenz wurde aktualisiert" });
        setEditingId(null);
        fetchData();
      }
    } catch (error) {
      toast({ title: "Fehler", description: "Speichern fehlgeschlagen", variant: "destructive" });
    }
  }

  async function handleAdd() {
    if (!newReference.client || !newReference.period) {
      toast({ title: "Fehler", description: "Bitte Kunde und Zeitraum angeben", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch('/api/references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReference),
      });
      if (res.ok) {
        toast({ title: "Erfolg", description: "Referenz wurde hinzugefügt" });
        setShowAddForm(false);
        setNewReference({ client: "", period: "", role: "", focus: "", industry: "banking", sortOrder: 0 });
        fetchData();
      }
    } catch (error) {
      toast({ title: "Fehler", description: "Hinzufügen fehlgeschlagen", variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Referenz wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/references/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: "Gelöscht", description: "Referenz wurde entfernt" });
        fetchData();
      }
    } catch (error) {
      toast({ title: "Fehler", description: "Löschen fehlgeschlagen", variant: "destructive" });
    }
  }

  const getIndustryIcon = (industry: string) => {
    switch (industry) {
      case 'banking': return <Landmark className="w-5 h-5" />;
      case 'public': return <Building2 className="w-5 h-5" />;
      case 'industry': return <Factory className="w-5 h-5" />;
      default: return <Building2 className="w-5 h-5" />;
    }
  };

  const industries = [
    { value: "banking", label: "Banken & Finanzdienstleistungen" },
    { value: "public", label: "Öffentlicher Dienst" },
    { value: "industry", label: "Industrie" },
  ];

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const userRole = (session?.user as any)?.role;
  if (!session || !["admin", "ADMIN"].includes(userRole)) return null;

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link href="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Zurück zum Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Referenzen verwalten</h1>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Neue Referenz
            </Button>
          </div>
        </motion.div>

        {/* Add Form */}
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Neue Referenz hinzufügen</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Kunde *</label>
                <Input value={newReference.client} onChange={(e) => setNewReference({...newReference, client: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Zeitraum *</label>
                <Input value={newReference.period} onChange={(e) => setNewReference({...newReference, period: e.target.value})} placeholder="z.B. 2020-2024" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rolle</label>
                <Input value={newReference.role} onChange={(e) => setNewReference({...newReference, role: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Branche</label>
                <select value={newReference.industry} onChange={(e) => setNewReference({...newReference, industry: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                  {industries.map((ind) => (<option key={ind.value} value={ind.value}>{ind.label}</option>))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Fokus / Schwerpunkt</label>
                <Textarea value={newReference.focus} onChange={(e) => setNewReference({...newReference, focus: e.target.value})} rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sortierung</label>
                <Input type="number" value={newReference.sortOrder} onChange={(e) => setNewReference({...newReference, sortOrder: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAdd}><Save className="w-4 h-4 mr-2" /> Hinzufügen</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}><X className="w-4 h-4 mr-2" /> Abbrechen</Button>
            </div>
          </motion.div>
        )}

        {/* References List */}
        <div className="space-y-4">
          {references.map((ref, index) => (
            <motion.div
              key={ref.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              {editingId === ref.id ? (
                <div className="p-6 bg-blue-50">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Kunde</label>
                      <Input value={editForm.client || ''} onChange={(e) => setEditForm({...editForm, client: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Zeitraum</label>
                      <Input value={editForm.period || ''} onChange={(e) => setEditForm({...editForm, period: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Rolle</label>
                      <Input value={editForm.role || ''} onChange={(e) => setEditForm({...editForm, role: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Branche</label>
                      <select value={editForm.industry || 'banking'} onChange={(e) => setEditForm({...editForm, industry: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                        {industries.map((ind) => (<option key={ind.value} value={ind.value}>{ind.label}</option>))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Fokus</label>
                      <Textarea value={editForm.focus || ''} onChange={(e) => setEditForm({...editForm, focus: e.target.value})} rows={2} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Verknüpftes Projekt</label>
                      <select value={editForm.projectId || ''} onChange={(e) => setEditForm({...editForm, projectId: e.target.value || null})} className="w-full px-3 py-2 border rounded-md">
                        <option value="">-- Kein Projekt --</option>
                        {projects.map((p) => (<option key={p.id} value={p.id}>{p.client} - {p.title}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Sortierung</label>
                      <Input type="number" value={editForm.sortOrder || 0} onChange={(e) => setEditForm({...editForm, sortOrder: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={() => handleSave(ref.id)}><Save className="w-4 h-4 mr-2" /> Speichern</Button>
                    <Button variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4 mr-2" /> Abbrechen</Button>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        {getIndustryIcon(ref.industry)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{ref.client}</h3>
                        <p className="text-sm text-gray-600">{ref.period} • {ref.role}</p>
                        <p className="text-sm text-gray-500 mt-1">{ref.focus}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingId(ref.id); setEditForm(ref); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(ref.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {references.length === 0 && (
          <div className="text-center py-12 text-gray-500">Keine Referenzen vorhanden</div>
        )}
      </div>
    </main>
  );
}
