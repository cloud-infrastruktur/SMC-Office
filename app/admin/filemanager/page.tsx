"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Folder,
  FolderPlus,
  File,
  FileText,
  Image as ImageIcon,
  Trash2,
  Download,
  Eye,
  Pencil,
  X,
  Plus,
  ChevronRight,
  Settings,
  Shield,
  FolderDown,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ManagedFile {
  id: string;
  fileName: string;
  displayName: string | null;
  description: string | null;
  mimeType: string;
  fileSize: number;
  cloudStoragePath: string;
  folderId: string | null;
  isPublic: boolean;
  uploadedAt: string;
  url?: string;
}

interface FileFolder {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  // V4.8.9: Berechtigungskonzept
  isProtected?: boolean;
  isDownloadFolder?: boolean;
  permissionArea?: 'PROFILE' | 'REFERENCES' | 'TRAININGS' | 'FILES' | null;
  _count?: { files: number };
}

export default function FileManagerPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<FileFolder[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [previewFile, setPreviewFile] = useState<ManagedFile | null>(null);
  // Rename folder state
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  
  // V4.8.9: Ordner-Einstellungen Dialog
  const [settingsFolder, setSettingsFolder] = useState<FileFolder | null>(null);
  const [folderSettings, setFolderSettings] = useState({
    isProtected: false,
    isDownloadFolder: false,
    permissionArea: null as 'PROFILE' | 'REFERENCES' | 'TRAININGS' | 'FILES' | null
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "ADMIN" && role !== "MANAGER") {
        router.push("/");
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    fetchContent();
  }, [currentFolderId]);

  async function fetchContent() {
    try {
      setLoading(true);
      const [filesRes, foldersRes] = await Promise.all([
        fetch(`/api/admin/filemanager${currentFolderId ? `?folderId=${currentFolderId}` : ""}`),
        fetch("/api/admin/filemanager/folders"),
      ]);

      if (filesRes.ok) setFiles(await filesRes.json());
      if (foldersRes.ok) {
        const allFolders = await foldersRes.json();
        setFolders(allFolders.filter((f: FileFolder) => f.parentId === currentFolderId));
        updateBreadcrumb(allFolders, currentFolderId);
      }
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
    }
  }

  function updateBreadcrumb(allFolders: FileFolder[], folderId: string | null) {
    const path: FileFolder[] = [];
    let current = folderId;
    while (current) {
      const folder = allFolders.find((f) => f.id === current);
      if (folder) {
        path.unshift(folder);
        current = folder.parentId;
      } else {
        break;
      }
    }
    setBreadcrumb(path);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 50MB file size limit per file
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
    const oversizedFiles = Array.from(files).filter(f => f.size > MAX_FILE_SIZE);
    
    if (oversizedFiles.length > 0) {
      toast({ 
        title: "Dateien zu groß", 
        description: `Maximale Dateigröße: 50 MB. ${oversizedFiles.map(f => `${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB)`).join(', ')}`, 
        variant: "destructive" 
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    const totalFiles = files.length;
    let successCount = 0;
    let failCount = 0;

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const file of Array.from(files)) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("displayName", file.name);
          if (currentFolderId) formData.append("folderId", currentFolderId);

          const res = await fetch("/api/admin/filemanager", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (successCount > 0 && failCount === 0) {
        toast({ 
          title: "Erfolg", 
          description: totalFiles === 1 
            ? "Datei hochgeladen" 
            : `${successCount} Dateien hochgeladen` 
        });
      } else if (successCount > 0 && failCount > 0) {
        toast({ 
          title: "Teilweise erfolgreich", 
          description: `${successCount} von ${totalFiles} Dateien hochgeladen`, 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Fehler", 
          description: "Dateien konnten nicht hochgeladen werden", 
          variant: "destructive" 
        });
      }

      fetchContent();
    } catch {
      toast({ title: "Fehler", description: "Upload fehlgeschlagen", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch("/api/admin/filemanager/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName, parentId: currentFolderId }),
      });

      if (res.ok) {
        toast({ title: "Erfolg", description: "Ordner erstellt" });
        setNewFolderName("");
        setShowNewFolder(false);
        fetchContent();
      } else {
        throw new Error();
      }
    } catch {
      toast({ title: "Fehler", description: "Ordner konnte nicht erstellt werden", variant: "destructive" });
    }
  }

  async function handleDeleteFile(id: string) {
    if (!confirm("Datei wirklich löschen?")) return;

    try {
      const res = await fetch(`/api/admin/filemanager/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Erfolg", description: "Datei gelöscht" });
        fetchContent();
      }
    } catch {
      toast({ title: "Fehler", description: "Datei konnte nicht gelöscht werden", variant: "destructive" });
    }
  }

  async function handleDeleteFolder(id: string) {
    if (!confirm("Ordner wirklich löschen? Der Ordner muss leer sein.")) return;

    try {
      const res = await fetch(`/api/admin/filemanager/folders/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Erfolg", description: "Ordner gelöscht" });
        fetchContent();
      } else {
        const data = await res.json();
        toast({ title: "Fehler", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Fehler", description: "Ordner konnte nicht gelöscht werden", variant: "destructive" });
    }
  }

  async function handleRenameFolder(id: string) {
    if (!renameFolderName.trim()) {
      setRenamingFolderId(null);
      return;
    }

    try {
      const res = await fetch(`/api/admin/filemanager/folders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameFolderName.trim() }),
      });

      if (res.ok) {
        toast({ title: "Erfolg", description: "Ordner umbenannt" });
        setRenamingFolderId(null);
        setRenameFolderName("");
        fetchContent();
      } else {
        const data = await res.json();
        toast({ title: "Fehler", description: data.error || "Ordner konnte nicht umbenannt werden", variant: "destructive" });
      }
    } catch {
      toast({ title: "Fehler", description: "Ordner konnte nicht umbenannt werden", variant: "destructive" });
    }
  }

  function startRenameFolder(folder: FileFolder, e: React.MouseEvent) {
    e.stopPropagation();
    setRenamingFolderId(folder.id);
    setRenameFolderName(folder.name);
  }

  // V4.8.9: Ordner-Einstellungen öffnen
  function openFolderSettings(folder: FileFolder, e: React.MouseEvent) {
    e.stopPropagation();
    setSettingsFolder(folder);
    setFolderSettings({
      isProtected: folder.isProtected || false,
      isDownloadFolder: folder.isDownloadFolder || false,
      permissionArea: folder.permissionArea || null
    });
  }

  // V4.8.9: Ordner-Einstellungen speichern
  async function saveFolderSettings() {
    if (!settingsFolder) return;

    try {
      const res = await fetch(`/api/admin/filemanager/folders/${settingsFolder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(folderSettings),
      });

      if (res.ok) {
        toast({ title: "Erfolg", description: "Ordner-Einstellungen gespeichert" });
        setSettingsFolder(null);
        fetchContent();
      } else {
        const data = await res.json();
        toast({ title: "Fehler", description: data.error || "Einstellungen konnten nicht gespeichert werden", variant: "destructive" });
      }
    } catch {
      toast({ title: "Fehler", description: "Einstellungen konnten nicht gespeichert werden", variant: "destructive" });
    }
  }

  // V4.8.9: Permission Area Label
  function getPermissionAreaLabel(area: string | null) {
    const labels: Record<string, string> = {
      'PROFILE': 'Profil',
      'REFERENCES': 'Kunden-Referenzen',
      'TRAININGS': 'Zertifikate & Trainings',
      'FILES': 'Dateien'
    };
    return area ? labels[area] || area : 'Dateien';
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(mimeType: string) {
    if (mimeType.startsWith("image/")) return <ImageIcon className="w-6 h-6 text-green-600" />;
    if (mimeType === "application/pdf") return <FileText className="w-6 h-6 text-red-600" />;
    return <File className="w-6 h-6 text-blue-600" />;
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link href="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zum Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Dateimanager</h1>
          <p className="text-gray-600 mt-2">Dateien zentral verwalten und Entitäten zuordnen</p>
        </motion.div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <button
            onClick={() => setCurrentFolderId(null)}
            className="text-blue-600 hover:underline"
          >
            Hauptverzeichnis
          </button>
          {breadcrumb.map((folder) => (
            <span key={folder.id} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <button
                onClick={() => setCurrentFolderId(folder.id)}
                className="text-blue-600 hover:underline"
              >
                {folder.name}
              </button>
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
            accept="*/*"
            multiple
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Lädt hoch..." : "Dateien hochladen"}
          </Button>
          <Button variant="outline" onClick={() => setShowNewFolder(true)}>
            <FolderPlus className="w-4 h-4 mr-2" />
            Neuer Ordner
          </Button>
        </div>

        {/* New Folder Form */}
        {showNewFolder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-white rounded-xl shadow-lg p-4 mb-6 flex gap-4 items-center"
          >
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Ordnername"
              className="flex-1"
            />
            <Button onClick={handleCreateFolder}>Erstellen</Button>
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* Content Grid */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 bg-gray-50 border-b font-semibold">
            {folders.length} Ordner, {files.length} Dateien
          </div>
          <div className="divide-y">
            {/* Folders */}
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => renamingFolderId !== folder.id && setCurrentFolderId(folder.id)}
              >
                <Folder className="w-8 h-8 text-yellow-500" />
                {renamingFolderId === folder.id ? (
                  <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={renameFolderName}
                      onChange={(e) => setRenameFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameFolder(folder.id);
                        if (e.key === "Escape") {
                          setRenamingFolderId(null);
                          setRenameFolderName("");
                        }
                      }}
                      className="flex-1 h-8"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleRenameFolder(folder.id)}>
                      Speichern
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRenamingFolderId(null);
                        setRenameFolderName("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{folder.name}</span>
                        {/* V4.8.9: Berechtigungs-Badges */}
                        {folder.isProtected && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <Lock className="w-3 h-3 mr-1" />
                            Geschützt
                          </Badge>
                        )}
                        {folder.isDownloadFolder && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            <FolderDown className="w-3 h-3 mr-1" />
                            Download
                          </Badge>
                        )}
                        {folder.permissionArea && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            {getPermissionAreaLabel(folder.permissionArea)}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">{folder._count?.files || 0} Dateien</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-600"
                      onClick={(e) => openFolderSettings(folder, e)}
                      title="Ordner-Einstellungen"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-600"
                      onClick={(e) => startRenameFolder(folder, e)}
                      title="Ordner umbenennen"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={folder.isProtected ? "text-gray-300 cursor-not-allowed" : "text-red-600"}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!folder.isProtected) handleDeleteFolder(folder.id);
                      }}
                      disabled={folder.isProtected}
                      title={folder.isProtected ? "Geschützter Ordner" : "Ordner löschen"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}

            {/* Files */}
            {files.map((file) => (
              <div key={file.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                {getFileIcon(file.mimeType)}
                <div className="flex-1">
                  <p className="font-medium">{file.displayName || file.fileName}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(file.fileSize)} • {new Date(file.uploadedAt).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {file.mimeType === "application/pdf" && (
                    <Button size="sm" variant="outline" onClick={() => setPreviewFile(file)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  {file.url && (
                    <a href={file.url} download>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => handleDeleteFile(file.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {folders.length === 0 && files.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Dieser Ordner ist leer</p>
              </div>
            )}
          </div>
        </div>

        {/* PDF Preview Modal */}
        {previewFile && previewFile.url && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">{previewFile.displayName || previewFile.fileName}</h3>
                <Button variant="ghost" onClick={() => setPreviewFile(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <iframe src={previewFile.url} className="flex-1 w-full" />
            </div>
          </div>
        )}

        {/* V4.8.9: Ordner-Einstellungen Modal */}
        {settingsFolder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md"
            >
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Ordner-Einstellungen
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setSettingsFolder(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <Folder className="w-8 h-8 text-yellow-500" />
                  <span className="font-medium text-gray-900 dark:text-white">{settingsFolder.name}</span>
                </div>

                {/* isProtected */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Geschützter Ordner</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Kann nicht gelöscht werden</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFolderSettings(prev => ({ ...prev, isProtected: !prev.isProtected }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      folderSettings.isProtected ? 'bg-amber-500' : 'bg-gray-300 dark:bg-slate-600'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      folderSettings.isProtected ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                {/* isDownloadFolder */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderDown className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Download-Ordner</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Erscheint im Download-Modul</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFolderSettings(prev => ({ ...prev, isDownloadFolder: !prev.isDownloadFolder }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      folderSettings.isDownloadFolder ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-600'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      folderSettings.isDownloadFolder ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                {/* permissionArea (nur wenn isDownloadFolder aktiv) */}
                {folderSettings.isDownloadFolder && (
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <Shield className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Berechtigungsbereich</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Wer kann diesen Ordner sehen?</p>
                      </div>
                    </div>
                    <select
                      value={folderSettings.permissionArea || 'FILES'}
                      onChange={(e) => setFolderSettings(prev => ({ 
                        ...prev, 
                        permissionArea: e.target.value as any 
                      }))}
                      className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      <option value="FILES">Dateien (FILES)</option>
                      <option value="PROFILE">Profil (PROFILE)</option>
                      <option value="REFERENCES">Kunden-Referenzen (REFERENCES)</option>
                      <option value="TRAININGS">Zertifikate & Trainings (TRAININGS)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSettingsFolder(null)}>
                  Abbrechen
                </Button>
                <Button onClick={saveFolderSettings}>
                  Speichern
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </main>
  );
}
