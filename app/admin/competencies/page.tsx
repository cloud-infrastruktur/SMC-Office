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
  Target,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Competency {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  sortOrder: number;
}

const iconOptions = [
  "Settings", "Cog", "Users", "BarChart3", "Shield", "FileCheck", "Workflow",
  "Layers", "Target", "Briefcase", "Award", "CheckCircle", "TrendingUp",
  "Database", "Server", "Monitor", "Cpu", "Network", "GitBranch", "Boxes",
];

export default function AdminCompetenciesPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Competency>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompetency, setNewCompetency] = useState<Partial<Competency>>({
    slug: "",
    title: "",
    description: "",
    icon: "Target",
    category: "core",
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
      fetchCompetencies();
    }
  }, [status]);

  async function fetchCompetencies() {
    try {
      const res = await fetch('/api/competencies');
      if (res.ok) setCompetencies(await res.json());
    } catch (error) {
      console.error('Error fetching competencies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(id: string) {
    try {
      const res = await fetch(`/api/competencies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast({ title: "Gespeichert", description: "Kompetenz wurde aktualisiert" });
        setEditingId(null);
        fetchCompetencies();
      } else {
        const data = await res.json();
        const errorMessage = data.details ? `${data.error}\n\n${data.details}` : (data.error || 'Speichern fehlgeschlagen');
        toast({ 
          title: "Fehler", 
          description: errorMessage, 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ 
        title: "Fehler", 
        description: "Ein unerwarteter Fehler ist aufgetreten. Bitte überprüfen Sie Ihre Internetverbindung.", 
        variant: "destructive" 
      });
    }
  }

  async function handleAdd() {
    if (!newCompetency.title || !newCompetency.slug) {
      toast({ title: "Fehler", description: "Bitte Titel und Slug angeben", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch('/api/competencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompetency),
      });
      if (res.ok) {
        toast({ title: "Erfolg", description: "Kompetenz wurde hinzugefügt" });
        setShowAddForm(false);
        setNewCompetency({ slug: "", title: "", description: "", icon: "Target", category: "core", sortOrder: 0 });
        fetchCompetencies();
      } else {
        const data = await res.json();
        const errorMessage = data.details ? `${data.error}\n\n${data.details}` : (data.error || 'Hinzufügen fehlgeschlagen');
        toast({ 
          title: "Fehler", 
          description: errorMessage, 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ 
        title: "Fehler", 
        description: "Ein unerwarteter Fehler ist aufgetreten. Bitte überprüfen Sie Ihre Internetverbindung.", 
        variant: "destructive" 
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Kompetenz wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/competencies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: "Gelöscht", description: "Kompetenz wurde entfernt" });
        fetchCompetencies();
      }
    } catch (error) {
      toast({ title: "Fehler", description: "Löschen fehlgeschlagen", variant: "destructive" });
    }
  }

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const userRole = (session?.user as any)?.role;
  if (!session || !["admin", "ADMIN"].includes(userRole)) return null;

  const coreCompetencies = competencies.filter(c => c.category === 'core');
  const specializations = competencies.filter(c => c.category === 'specialization');

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link href="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Zurück zum Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Kompetenzen verwalten</h1>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Neue Kompetenz
            </Button>
          </div>
        </motion.div>

        {/* Add Form */}
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Neue Kompetenz hinzufügen</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Titel *</label>
                <Input 
                  value={newCompetency.title} 
                  onChange={(e) => {
                    const title = e.target.value;
                    setNewCompetency({...newCompetency, title, slug: generateSlug(title)});
                  }} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug (für URL-Anker) *</label>
                <Input value={newCompetency.slug} onChange={(e) => setNewCompetency({...newCompetency, slug: e.target.value})} placeholder="z.B. it-service-management" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Icon</label>
                <select value={newCompetency.icon} onChange={(e) => setNewCompetency({...newCompetency, icon: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                  {iconOptions.map((icon) => (<option key={icon} value={icon}>{icon}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kategorie</label>
                <select value={newCompetency.category} onChange={(e) => setNewCompetency({...newCompetency, category: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                  <option value="core">Kernkompetenz</option>
                  <option value="specialization">Spezialisierung</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Beschreibung *</label>
                <Textarea value={newCompetency.description} onChange={(e) => setNewCompetency({...newCompetency, description: e.target.value})} rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sortierung</label>
                <Input type="number" value={newCompetency.sortOrder} onChange={(e) => setNewCompetency({...newCompetency, sortOrder: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAdd}><Save className="w-4 h-4 mr-2" /> Hinzufügen</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}><X className="w-4 h-4 mr-2" /> Abbrechen</Button>
            </div>
          </motion.div>
        )}

        {/* Core Competencies */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-600" /> Kernkompetenzen ({coreCompetencies.length})
          </h2>
          <div className="space-y-3">
            {coreCompetencies.map((comp, index) => (
              <CompetencyItem
                key={comp.id}
                competency={comp}
                index={index}
                editingId={editingId}
                editForm={editForm}
                setEditingId={setEditingId}
                setEditForm={setEditForm}
                handleSave={handleSave}
                handleDelete={handleDelete}
                iconOptions={iconOptions}
              />
            ))}
          </div>
        </div>

        {/* Specializations */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" /> Spezialisierungen ({specializations.length})
          </h2>
          <div className="space-y-3">
            {specializations.map((comp, index) => (
              <CompetencyItem
                key={comp.id}
                competency={comp}
                index={index}
                editingId={editingId}
                editForm={editForm}
                setEditingId={setEditingId}
                setEditForm={setEditForm}
                handleSave={handleSave}
                handleDelete={handleDelete}
                iconOptions={iconOptions}
              />
            ))}
          </div>
        </div>

        {competencies.length === 0 && (
          <div className="text-center py-12 text-gray-500">Keine Kompetenzen vorhanden</div>
        )}
      </div>
    </main>
  );
}

function CompetencyItem({
  competency,
  index,
  editingId,
  editForm,
  setEditingId,
  setEditForm,
  handleSave,
  handleDelete,
  iconOptions,
}: {
  competency: Competency;
  index: number;
  editingId: string | null;
  editForm: Partial<Competency>;
  setEditingId: (id: string | null) => void;
  setEditForm: (form: Partial<Competency>) => void;
  handleSave: (id: string) => void;
  handleDelete: (id: string) => void;
  iconOptions: string[];
}) {
  const isEditing = editingId === competency.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-xl shadow-md overflow-hidden"
    >
      {isEditing ? (
        <div className="p-6 bg-orange-50">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Titel</label>
              <Input value={editForm.title || ''} onChange={(e) => setEditForm({...editForm, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <Input value={editForm.slug || ''} onChange={(e) => setEditForm({...editForm, slug: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Icon</label>
              <select value={editForm.icon || ''} onChange={(e) => setEditForm({...editForm, icon: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                {iconOptions.map((icon) => (<option key={icon} value={icon}>{icon}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kategorie</label>
              <select value={editForm.category || ''} onChange={(e) => setEditForm({...editForm, category: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                <option value="core">Kernkompetenz</option>
                <option value="specialization">Spezialisierung</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Beschreibung</label>
              <Textarea value={editForm.description || ''} onChange={(e) => setEditForm({...editForm, description: e.target.value})} rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sortierung</label>
              <Input type="number" value={editForm.sortOrder || 0} onChange={(e) => setEditForm({...editForm, sortOrder: parseInt(e.target.value) || 0})} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => handleSave(competency.id)}><Save className="w-4 h-4 mr-2" /> Speichern</Button>
            <Button variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4 mr-2" /> Abbrechen</Button>
          </div>
        </div>
      ) : (
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${competency.category === 'core' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{competency.title}</h3>
                <p className="text-xs text-gray-400 mb-1">#{competency.slug}</p>
                <p className="text-sm text-gray-600">{competency.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditingId(competency.id); setEditForm(competency); }}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(competency.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}


