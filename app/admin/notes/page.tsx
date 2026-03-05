"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  Pin,
  Archive,
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  Tag,
  Calendar,
  User,
  Briefcase,
  FolderKanban,
  MoreVertical,
  Edit,
  Trash2,
  X,
  ChevronDown,
  Loader2,
  StickyNote,
  ListTodo,
  Code,
  FileText,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Note {
  id: string;
  title: string;
  content: string | null;
  category: string;
  status: string;
  priority: string;
  dueDate: string | null;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  crmContact?: {
    id: string;
    firstName: string;
    lastName: string;
    company: string | null;
  } | null;
  crmDeal?: {
    id: string;
    title: string;
    phase: string;
  } | null;
  crmProject?: {
    id: string;
    projectNumber: string;
    title: string;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  overdue: number;
  pinned: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

const categoryConfig: Record<string, { label: string; icon: any; color: string }> = {
  PERSONAL: { label: "Persönlich", icon: StickyNote, color: "bg-blue-500" },
  TODO: { label: "Aufgabe", icon: ListTodo, color: "bg-green-500" },
  BACKLOG_DEV: { label: "Dev-Backlog", icon: Code, color: "bg-purple-500" },
  DRAFT: { label: "Entwurf", icon: FileText, color: "bg-gray-500" },
  IMPORTANT: { label: "Wichtig", icon: Star, color: "bg-amber-500" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Offen", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  IN_PROGRESS: { label: "In Bearbeitung", color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30" },
  DONE: { label: "Erledigt", color: "text-green-600 bg-green-100 dark:bg-green-900/30" },
  CANCELLED: { label: "Abgebrochen", color: "text-gray-600 bg-gray-100 dark:bg-gray-900/30" },
};

const priorityConfig: Record<string, { label: string; color: string; icon: any }> = {
  LOW: { label: "Niedrig", color: "text-gray-500", icon: Circle },
  MEDIUM: { label: "Mittel", color: "text-blue-500", icon: Clock },
  HIGH: { label: "Hoch", color: "text-orange-500", icon: AlertCircle },
  URGENT: { label: "Dringend", color: "text-red-500", icon: AlertCircle },
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const { toast } = useToast();

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "TODO",
    status: "OPEN",
    priority: "MEDIUM",
    dueDate: "",
    tags: [] as string[],
    isPinned: false,
    crmContactId: "",
    crmDealId: "",
    crmProjectId: "",
  });

  useEffect(() => {
    fetchNotes();
    fetchStats();
  }, [categoryFilter, statusFilter, showArchived]);

  const fetchNotes = async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.append("category", categoryFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (showArchived) params.append("showArchived", "true");
      if (search) params.append("search", search);

      const res = await fetch(`/api/notes?${params}`);
      const data = await res.json();
      setNotes(data);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/notes/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Fehler beim Laden der Stats:", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNotes();
  };

  const openEditor = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setFormData({
        title: note.title,
        content: note.content || "",
        category: note.category,
        status: note.status,
        priority: note.priority,
        dueDate: note.dueDate ? note.dueDate.split("T")[0] : "",
        tags: note.tags,
        isPinned: note.isPinned,
        crmContactId: note.crmContact?.id || "",
        crmDealId: note.crmDeal?.id || "",
        crmProjectId: note.crmProject?.id || "",
      });
    } else {
      setEditingNote(null);
      setFormData({
        title: "",
        content: "",
        category: "TODO",
        status: "OPEN",
        priority: "MEDIUM",
        dueDate: "",
        tags: [],
        isPinned: false,
        crmContactId: "",
        crmDealId: "",
        crmProjectId: "",
      });
    }
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingNote(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Fehler", description: "Titel ist erforderlich", variant: "destructive" });
      return;
    }

    try {
      const url = editingNote ? `/api/notes/${editingNote.id}` : "/api/notes";
      const method = editingNote ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({ title: "Erfolg", description: editingNote ? "Notiz aktualisiert" : "Notiz erstellt" });
        closeEditor();
        fetchNotes();
        fetchStats();
      } else {
        throw new Error();
      }
    } catch (error) {
      toast({ title: "Fehler", description: "Speichern fehlgeschlagen", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Notiz wirklich löschen?")) return;

    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Erfolg", description: "Notiz gelöscht" });
        fetchNotes();
        fetchStats();
      }
    } catch (error) {
      toast({ title: "Fehler", description: "Löschen fehlgeschlagen", variant: "destructive" });
    }
  };

  const togglePin = async (note: Note) => {
    try {
      await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...note, isPinned: !note.isPinned }),
      });
      fetchNotes();
    } catch (error) {
      console.error(error);
    }
  };

  const toggleStatus = async (note: Note) => {
    const nextStatus = note.status === "DONE" ? "OPEN" : "DONE";
    try {
      await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...note, status: nextStatus }),
      });
      fetchNotes();
      fetchStats();
    } catch (error) {
      console.error(error);
    }
  };

  const filteredNotes = notes.filter((note) =>
    search ? note.title.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Notizen & Aufgaben
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Verwalten Sie Ihre Notizen, ToDos und Dev-Backlog
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Gesamt</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-green-600">{stats.byStatus?.DONE || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Erledigt</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-amber-600">{stats.byStatus?.IN_PROGRESS || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">In Bearbeitung</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Überfällig</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-purple-600">{stats.byCategory?.BACKLOG_DEV || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Dev-Backlog</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-blue-600">{stats.pinned}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Angepinnt</div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen..."
              className="pl-10 dark:bg-slate-800 dark:border-slate-700"
            />
          </div>
        </form>

        <div className="flex gap-2 flex-wrap">
          {/* Kategorie Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 dark:border-slate-700">
                <Filter className="w-4 h-4" />
                {categoryFilter ? categoryConfig[categoryFilter]?.label : "Kategorie"}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setCategoryFilter(null)}>
                Alle Kategorien
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {Object.entries(categoryConfig).map(([key, config]) => (
                <DropdownMenuItem key={key} onClick={() => setCategoryFilter(key)}>
                  <config.icon className="w-4 h-4 mr-2" />
                  {config.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 dark:border-slate-700">
                {statusFilter ? statusConfig[statusFilter]?.label : "Status"}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                Alle Status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {Object.entries(statusConfig).map(([key, config]) => (
                <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                  {config.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
            className="gap-2 dark:border-slate-700"
          >
            <Archive className="w-4 h-4" />
            Archiv
          </Button>

          <Button onClick={() => openEditor()} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Neue Notiz
          </Button>
        </div>
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-12">
          <StickyNote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Keine Notizen gefunden</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredNotes.map((note) => {
            const catConfig = categoryConfig[note.category] || categoryConfig.PERSONAL;
            const statConfig = statusConfig[note.status] || statusConfig.OPEN;
            const prioConfig = priorityConfig[note.priority] || priorityConfig.MEDIUM;
            const PrioIcon = prioConfig.icon;
            const CatIcon = catConfig.icon;
            const isOverdue = note.dueDate && new Date(note.dueDate) < new Date() && note.status !== "DONE";

            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white dark:bg-slate-800 rounded-xl border p-4 transition-all hover:shadow-md ${
                  note.isPinned
                    ? "border-amber-300 dark:border-amber-700"
                    : "border-gray-200 dark:border-slate-700"
                } ${note.status === "DONE" ? "opacity-70" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {/* Status Toggle */}
                  <button
                    onClick={() => toggleStatus(note)}
                    className={`mt-1 flex-shrink-0 ${statConfig.color} rounded-full p-1`}
                  >
                    {note.status === "DONE" ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {note.isPinned && <Pin className="w-4 h-4 text-amber-500" />}
                      <h3 className={`font-medium text-gray-900 dark:text-white truncate ${
                        note.status === "DONE" ? "line-through" : ""
                      }`}>
                        {note.title}
                      </h3>
                    </div>

                    {note.content && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                        {note.content}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Kategorie */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${catConfig.color} text-white`}>
                        <CatIcon className="w-3 h-3" />
                        {catConfig.label}
                      </span>

                      {/* Priorität */}
                      <span className={`inline-flex items-center gap-1 ${prioConfig.color}`}>
                        <PrioIcon className="w-3 h-3" />
                        {prioConfig.label}
                      </span>

                      {/* Fälligkeitsdatum */}
                      {note.dueDate && (
                        <span className={`inline-flex items-center gap-1 ${
                          isOverdue ? "text-red-600" : "text-gray-500 dark:text-gray-400"
                        }`}>
                          <Calendar className="w-3 h-3" />
                          {new Date(note.dueDate).toLocaleDateString("de-DE")}
                        </span>
                      )}

                      {/* CRM-Verknüpfungen */}
                      {note.crmContact && (
                        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <User className="w-3 h-3" />
                          {note.crmContact.firstName} {note.crmContact.lastName}
                        </span>
                      )}
                      {note.crmDeal && (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                          <Briefcase className="w-3 h-3" />
                          {note.crmDeal.title}
                        </span>
                      )}
                      {note.crmProject && (
                        <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">
                          <FolderKanban className="w-3 h-3" />
                          {note.crmProject.projectNumber}
                        </span>
                      )}

                      {/* Tags */}
                      {note.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditor(note)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => togglePin(note)}>
                        <Pin className="w-4 h-4 mr-2" />
                        {note.isPinned ? "Entpinnen" : "Anpinnen"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(note.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {isEditorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={closeEditor}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingNote ? "Notiz bearbeiten" : "Neue Notiz"}
                </h2>
                <Button variant="ghost" size="icon" onClick={closeEditor}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-4">
                {/* Titel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Titel *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Notiz-Titel eingeben..."
                    className="dark:bg-slate-700 dark:border-slate-600"
                  />
                </div>

                {/* Inhalt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Inhalt
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Beschreibung..."
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Kategorie, Status, Priorität */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Kategorie
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      {Object.entries(categoryConfig).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priorität
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fälligkeitsdatum */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fälligkeitsdatum
                  </label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="dark:bg-slate-700 dark:border-slate-600"
                  />
                </div>

                {/* Pin Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPinned"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="isPinned" className="text-sm text-gray-700 dark:text-gray-300">
                    Notiz anpinnen
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
                <Button variant="outline" onClick={closeEditor}>
                  Abbrechen
                </Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                  {editingNote ? "Speichern" : "Erstellen"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
