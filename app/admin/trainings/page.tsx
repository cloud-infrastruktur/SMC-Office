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
  Award,
  Star,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Training {
  id: string;
  title: string;
  provider: string | null;
  year: string | null;
  category: string;
  description: string | null;
  link: string | null;
  sortOrder: number;
  isHighlight: boolean;
}

export default function AdminTrainingsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Training>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTraining, setNewTraining] = useState<Partial<Training>>({
    title: "",
    provider: "",
    year: "",
    category: "Zertifizierung",
    description: "",
    link: "",
    sortOrder: 0,
    isHighlight: false,
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
      fetchTrainings();
    }
  }, [status]);

  async function fetchTrainings() {
    try {
      const res = await fetch('/api/trainings');
      if (res.ok) setTrainings(await res.json());
    } catch (error) {
      console.error('Error fetching trainings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(id: string) {
    try {
      const res = await fetch(`/api/trainings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast({ title: "Gespeichert", description: "Training wurde aktualisiert" });
        setEditingId(null);
        fetchTrainings();
      }
    } catch (error) {
      toast({ title: "Fehler", description: "Speichern fehlgeschlagen", variant: "destructive" });
    }
  }

  async function handleAdd() {
    if (!newTraining.title) {
      toast({ title: "Fehler", description: "Bitte Titel angeben", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch('/api/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTraining),
      });
      if (res.ok) {
        toast({ title: "Erfolg", description: "Training wurde hinzugefügt" });
        setShowAddForm(false);
        setNewTraining({ title: "", provider: "", year: "", category: "Zertifizierung", description: "", link: "", sortOrder: 0, isHighlight: false });
        fetchTrainings();
      }
    } catch (error) {
      toast({ title: "Fehler", description: "Hinzufügen fehlgeschlagen", variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Training wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/trainings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: "Gelöscht", description: "Training wurde entfernt" });
        fetchTrainings();
      }
    } catch (error) {
      toast({ title: "Fehler", description: "Löschen fehlgeschlagen", variant: "destructive" });
    }
  }

  const categories = [
    "Zertifizierung",
    "Agile",
    "ITSM",
    "Management",
    "Kommunikation",
    "Sprachen",
    "Sonstige",
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
            <h1 className="text-3xl font-bold text-gray-900">Trainings & Zertifikate verwalten</h1>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Neues Training
            </Button>
          </div>
        </motion.div>

        {/* Add Form */}
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Neues Training hinzufügen</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Titel *</label>
                <Input value={newTraining.title} onChange={(e) => setNewTraining({...newTraining, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Anbieter</label>
                <Input value={newTraining.provider || ''} onChange={(e) => setNewTraining({...newTraining, provider: e.target.value})} placeholder="z.B. TÜV Rheinland" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Jahr</label>
                <Input value={newTraining.year || ''} onChange={(e) => setNewTraining({...newTraining, year: e.target.value})} placeholder="z.B. 2020" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kategorie</label>
                <select value={newTraining.category} onChange={(e) => setNewTraining({...newTraining, category: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                  {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Beschreibung</label>
                <Textarea value={newTraining.description || ''} onChange={(e) => setNewTraining({...newTraining, description: e.target.value})} rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Link (optional)</label>
                <Input value={newTraining.link || ''} onChange={(e) => setNewTraining({...newTraining, link: e.target.value})} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sortierung</label>
                <Input type="number" value={newTraining.sortOrder} onChange={(e) => setNewTraining({...newTraining, sortOrder: parseInt(e.target.value) || 0})} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isHighlightNew" checked={newTraining.isHighlight} onChange={(e) => setNewTraining({...newTraining, isHighlight: e.target.checked})} />
                <label htmlFor="isHighlightNew" className="text-sm">Als Highlight markieren</label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAdd}><Save className="w-4 h-4 mr-2" /> Hinzufügen</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}><X className="w-4 h-4 mr-2" /> Abbrechen</Button>
            </div>
          </motion.div>
        )}

        {/* Trainings List */}
        <div className="space-y-4">
          {trainings.map((training, index) => (
            <motion.div
              key={training.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-xl shadow-md overflow-hidden ${training.isHighlight ? 'ring-2 ring-yellow-400' : ''}`}
            >
              {editingId === training.id ? (
                <div className="p-6 bg-purple-50">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Titel</label>
                      <Input value={editForm.title || ''} onChange={(e) => setEditForm({...editForm, title: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Anbieter</label>
                      <Input value={editForm.provider || ''} onChange={(e) => setEditForm({...editForm, provider: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Jahr</label>
                      <Input value={editForm.year || ''} onChange={(e) => setEditForm({...editForm, year: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Kategorie</label>
                      <select value={editForm.category || ''} onChange={(e) => setEditForm({...editForm, category: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                        {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Beschreibung</label>
                      <Textarea value={editForm.description || ''} onChange={(e) => setEditForm({...editForm, description: e.target.value})} rows={2} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Link</label>
                      <Input value={editForm.link || ''} onChange={(e) => setEditForm({...editForm, link: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Sortierung</label>
                      <Input type="number" value={editForm.sortOrder || 0} onChange={(e) => setEditForm({...editForm, sortOrder: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id={`isHighlight-${training.id}`} checked={editForm.isHighlight || false} onChange={(e) => setEditForm({...editForm, isHighlight: e.target.checked})} />
                      <label htmlFor={`isHighlight-${training.id}`} className="text-sm">Als Highlight markieren</label>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={() => handleSave(training.id)}><Save className="w-4 h-4 mr-2" /> Speichern</Button>
                    <Button variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4 mr-2" /> Abbrechen</Button>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${training.isHighlight ? 'bg-yellow-100 text-yellow-600' : 'bg-purple-100 text-purple-600'}`}>
                        {training.isHighlight ? <Star className="w-5 h-5" /> : <Award className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">{training.title}</h3>
                          {training.link && (
                            <a href={training.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {training.provider && `${training.provider} • `}
                          {training.year && `${training.year} • `}
                          <span className="text-purple-600">{training.category}</span>
                        </p>
                        {training.description && <p className="text-sm text-gray-500 mt-1">{training.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingId(training.id); setEditForm(training); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(training.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {trainings.length === 0 && (
          <div className="text-center py-12 text-gray-500">Keine Trainings vorhanden</div>
        )}
      </div>
    </main>
  );
}
