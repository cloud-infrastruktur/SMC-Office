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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
                    <span className="flex-1 font-medium">{folder.name}</span>
                    <span className="text-sm text-gray-500">{folder._count?.files || 0} Dateien</span>
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
                      className="text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id);
                      }}
                      title="Ordner löschen"
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
      </div>
    </main>
  );
}
