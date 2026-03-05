"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Edit2, 
  Save, 
  X, 
  Upload, 
  FileText, 
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Project {
  id: string;
  projectNumber: string;
  title: string;
  client: string;
  period: string;
  role: string;
  objective: string;
  keyTasks: string[];
  highlights: string[];
  technologies: string[];
}

export default function AdminProjectsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editData, setEditData] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const user = session?.user as any;
      if (!["admin", "ADMIN"].includes(user?.role)) {
        router.push("/");
        toast({
          title: "Zugriff verweigert",
          description: "Sie haben keine Berechtigung für diese Seite.",
          variant: "destructive",
        });
      } else {
        fetchProjects();
      }
    }
  }, [status, session, router, toast]);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startEditing = (project: Project) => {
    setEditingProject(project.id);
    setEditData({ ...project });
    setExpandedProjects(prev => new Set(prev).add(project.id));
  };

  const cancelEditing = () => {
    setEditingProject(null);
    setEditData(null);
  };

  const handleSave = async () => {
    if (!editData) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${editData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        toast({
          title: "Gespeichert",
          description: "Projekt wurde erfolgreich aktualisiert.",
        });
        fetchProjects();
        setEditingProject(null);
        setEditData(null);
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Projekt konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateEditField = (field: keyof Project, value: any) => {
    if (!editData) return;
    setEditData({ ...editData, [field]: value });
  };

  const updateArrayField = (field: 'keyTasks' | 'highlights' | 'technologies', index: number, value: string) => {
    if (!editData) return;
    const arr = [...editData[field]];
    arr[index] = value;
    setEditData({ ...editData, [field]: arr });
  };

  const addArrayItem = (field: 'keyTasks' | 'highlights' | 'technologies') => {
    if (!editData) return;
    setEditData({ ...editData, [field]: [...editData[field], ""] });
  };

  const removeArrayItem = (field: 'keyTasks' | 'highlights' | 'technologies', index: number) => {
    if (!editData) return;
    const arr = editData[field].filter((_, i) => i !== index);
    setEditData({ ...editData, [field]: arr });
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      {/* Header */}
      <section className="relative py-12 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2">
                Projekterfahrungen verwalten
              </h1>
              <p className="text-blue-200">
                Bearbeiten Sie die Projektbeschreibungen aus dem Beraterprofil
              </p>
            </motion.div>
            
            <Link href="/admin">
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                Zurück zum SMC Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Projects List */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-4">
            {projects.map((project) => {
              const isEditing = editingProject === project.id;
              const isExpanded = expandedProjects.has(project.id);
              const data = isEditing ? editData! : project;

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
                >
                  {/* Header */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => !isEditing && toggleExpand(project.id)}
                  >
                    <div className="flex items-center gap-4">
                      <Badge className="bg-blue-100 text-blue-700">
                        {project.projectNumber}
                      </Badge>
                      <div>
                        <h3 className="font-semibold text-gray-900">{project.title}</h3>
                        <p className="text-sm text-gray-500">{project.client} | {project.period}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(project);
                            }}
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Bearbeiten
                          </Button>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            disabled={saving}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Abbrechen
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-1" />
                            )}
                            Speichern
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  {(isExpanded || isEditing) && (
                    <div className="border-t border-gray-200 p-6 space-y-6">
                      {/* Basic Fields */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                          {isEditing ? (
                            <Input
                              value={data.title}
                              onChange={(e) => updateEditField('title', e.target.value)}
                            />
                          ) : (
                            <p className="text-gray-900">{data.title}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Kunde</label>
                          {isEditing ? (
                            <Input
                              value={data.client}
                              onChange={(e) => updateEditField('client', e.target.value)}
                            />
                          ) : (
                            <p className="text-gray-900">{data.client}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Zeitraum</label>
                          {isEditing ? (
                            <Input
                              value={data.period}
                              onChange={(e) => updateEditField('period', e.target.value)}
                            />
                          ) : (
                            <p className="text-gray-900">{data.period}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                          {isEditing ? (
                            <Input
                              value={data.role}
                              onChange={(e) => updateEditField('role', e.target.value)}
                            />
                          ) : (
                            <p className="text-gray-900">{data.role}</p>
                          )}
                        </div>
                      </div>

                      {/* Objective */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Projektziel</label>
                        {isEditing ? (
                          <Textarea
                            value={data.objective}
                            onChange={(e) => updateEditField('objective', e.target.value)}
                            rows={3}
                          />
                        ) : (
                          <p className="text-gray-900">{data.objective}</p>
                        )}
                      </div>

                      {/* Key Tasks */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Aufgaben & Tätigkeiten
                        </label>
                        {isEditing ? (
                          <div className="space-y-2">
                            {data.keyTasks.map((task, idx) => (
                              <div key={idx} className="flex gap-2">
                                <Input
                                  value={task}
                                  onChange={(e) => updateArrayField('keyTasks', idx, e.target.value)}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeArrayItem('keyTasks', idx)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addArrayItem('keyTasks')}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Hinzufügen
                            </Button>
                          </div>
                        ) : (
                          <ul className="list-disc list-inside space-y-1 text-gray-900">
                            {data.keyTasks.map((task, idx) => (
                              <li key={idx}>{task}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Highlights */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Highlights & Ergebnisse
                        </label>
                        {isEditing ? (
                          <div className="space-y-2">
                            {data.highlights.map((highlight, idx) => (
                              <div key={idx} className="flex gap-2">
                                <Input
                                  value={highlight}
                                  onChange={(e) => updateArrayField('highlights', idx, e.target.value)}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeArrayItem('highlights', idx)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addArrayItem('highlights')}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Hinzufügen
                            </Button>
                          </div>
                        ) : (
                          <ul className="list-disc list-inside space-y-1 text-gray-900">
                            {data.highlights.map((highlight, idx) => (
                              <li key={idx}>{highlight}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Technologies */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Technologien & Methoden
                        </label>
                        {isEditing ? (
                          <div className="space-y-2">
                            {data.technologies.map((tech, idx) => (
                              <div key={idx} className="flex gap-2">
                                <Input
                                  value={tech}
                                  onChange={(e) => updateArrayField('technologies', idx, e.target.value)}
                                  className="max-w-xs"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeArrayItem('technologies', idx)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addArrayItem('technologies')}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Hinzufügen
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {data.technologies.map((tech, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-blue-50 text-blue-700">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
