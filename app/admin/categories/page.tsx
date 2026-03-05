"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  GripVertical,
  Settings,
  Briefcase,
  Workflow,
  FolderKanban,
  MessageCircle,
  Zap,
  Globe,
  MoreHorizontal,
  Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

const iconMap: Record<string, any> = {
  Settings,
  Briefcase,
  Workflow,
  FolderKanban,
  MessageCircle,
  Zap,
  Globe,
  MoreHorizontal,
  Folder,
};

const iconOptions = [
  { value: "Settings", label: "Einstellungen" },
  { value: "Briefcase", label: "Aktenkoffer" },
  { value: "Workflow", label: "Workflow" },
  { value: "FolderKanban", label: "Kanban" },
  { value: "MessageCircle", label: "Kommunikation" },
  { value: "Zap", label: "Blitz" },
  { value: "Globe", label: "Weltkugel" },
  { value: "MoreHorizontal", label: "Sonstiges" },
  { value: "Folder", label: "Ordner" },
];

export default function CategoriesPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", icon: "Folder" });
  const [newCategory, setNewCategory] = useState({ name: "", icon: "Folder" });
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeType, setActiveType] = useState("training");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    fetchCategories();
  }, [activeType]);

  async function fetchCategories() {
    try {
      const res = await fetch(`/api/admin/categories?type=${activeType}`);
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newCategory.name.trim()) {
      toast({ title: "Fehler", description: "Name ist erforderlich", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newCategory, type: activeType }),
      });

      if (res.ok) {
        toast({ title: "Erfolg", description: "Kategorie erstellt" });
        setNewCategory({ name: "", icon: "Folder" });
        setShowNewForm(false);
        fetchCategories();
      } else {
        throw new Error();
      }
    } catch {
      toast({ title: "Fehler", description: "Kategorie konnte nicht erstellt werden", variant: "destructive" });
    }
  }

  async function handleUpdate(id: string) {
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        toast({ title: "Erfolg", description: "Kategorie aktualisiert" });
        setEditingId(null);
        fetchCategories();
      } else {
        throw new Error();
      }
    } catch {
      toast({ title: "Fehler", description: "Kategorie konnte nicht aktualisiert werden", variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Möchten Sie diese Kategorie wirklich löschen?")) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });

      if (res.ok) {
        toast({ title: "Erfolg", description: "Kategorie gelöscht" });
        fetchCategories();
      } else {
        throw new Error();
      }
    } catch {
      toast({ title: "Fehler", description: "Kategorie konnte nicht gelöscht werden", variant: "destructive" });
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditForm({ name: category.name, icon: category.icon || "Folder" });
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    training: "Zertifikate & Trainings",
    project: "Projekte",
    reference: "Referenzen",
  };

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zum Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Kategorien verwalten</h1>
          <p className="text-gray-600 mt-2">Kategorien für Trainings, Projekte und Referenzen bearbeiten</p>
        </motion.div>

        {/* Type Tabs */}
        <div className="flex gap-2 mb-8">
          {Object.entries(typeLabels).map(([type, label]) => (
            <Button
              key={type}
              variant={activeType === type ? "default" : "outline"}
              onClick={() => setActiveType(type)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* New Category Form */}
        {showNewForm ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-white rounded-xl shadow-lg p-6 mb-6"
          >
            <h3 className="font-semibold mb-4">Neue Kategorie erstellen</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Kategoriename"
                />
              </div>
              <div className="w-48">
                <label className="block text-sm font-medium mb-1">Icon</label>
                <select
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-gray-300"
                >
                  {iconOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleCreate}>
                <Save className="w-4 h-4 mr-2" /> Speichern
              </Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ) : (
          <Button onClick={() => setShowNewForm(true)} className="mb-6">
            <Plus className="w-4 h-4 mr-2" /> Neue Kategorie
          </Button>
        )}

        {/* Categories List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 bg-gray-50 border-b font-semibold">
            {typeLabels[activeType]} ({categories.length})
          </div>
          <div className="divide-y">
            {categories.map((category, index) => {
              const IconComponent = iconMap[category.icon || "Folder"] || Folder;
              const isEditing = editingId === category.id;

              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 flex items-center gap-4 hover:bg-gray-50"
                >
                  <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-blue-600" />
                  </div>

                  {isEditing ? (
                    <>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="flex-1"
                      />
                      <select
                        value={editForm.icon}
                        onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                        className="w-40 h-10 px-3 rounded-md border border-gray-300"
                      >
                        {iconOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <Button size="sm" onClick={() => handleUpdate(category.id)}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{category.name}</span>
                      <span className="text-sm text-gray-500">Sortierung: {category.sortOrder}</span>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(category)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(category.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </motion.div>
              );
            })}

            {categories.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Keine Kategorien vorhanden. Erstellen Sie die erste Kategorie.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
