"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Download,
  Loader2,
  FolderOpen,
  Eye,
  X,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FileIcon, getFileTypeColor, getFileExtension, formatFileSize, isPreviewable } from "@/components/file-icons";

interface FileFolder {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

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
  folder?: FileFolder;
}

export default function AdminDownloadsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();
  
  // State
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<FileFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  
  // Preview Modal State
  const [previewFile, setPreviewFile] = useState<ManagedFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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
      fetchFolders();
      fetchFiles();
    }
  }, [status]);

  async function fetchFolders() {
    try {
      const res = await fetch('/api/admin/filemanager/folders');
      if (res.ok) {
        const data = await res.json();
        setFolders(Array.isArray(data) ? data : data.folders || []);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  }

  async function fetchFiles(folderId?: string | null) {
    setLoading(true);
    try {
      const url = folderId 
        ? `/api/admin/filemanager?folderId=${folderId}` 
        : '/api/admin/filemanager';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : data.files || []);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleFolderClick = (folder: FileFolder | null) => {
    setCurrentFolder(folder);
    fetchFiles(folder?.id || null);
  };

  async function handleUpload() {
    if (!uploadFile) {
      toast({ title: "Fehler", description: "Bitte eine Datei auswählen", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('displayName', displayName || uploadFile.name);
      formData.append('description', description);
      if (currentFolder) {
        formData.append('folderId', currentFolder.id);
      }
      formData.append('isPublic', 'true'); // Für Downloads öffentlich

      const res = await fetch('/api/admin/filemanager', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast({ title: "Erfolg", description: "Datei wurde hochgeladen" });
        setShowUploadModal(false);
        setUploadFile(null);
        setDisplayName("");
        setDescription("");
        fetchFiles(currentFolder?.id || null);
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Upload fehlgeschlagen');
      }
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message || "Upload fehlgeschlagen", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(file: ManagedFile) {
    if (!confirm(`Datei "${file.displayName || file.fileName}" wirklich löschen?`)) return;

    try {
      const res = await fetch(`/api/admin/filemanager/${file.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: "Erfolg", description: "Datei wurde gelöscht" });
        fetchFiles(currentFolder?.id || null);
      } else {
        throw new Error('Löschen fehlgeschlagen');
      }
    } catch (error) {
      toast({ title: "Fehler", description: "Löschen fehlgeschlagen", variant: "destructive" });
    }
  }

  async function handleDownload(file: ManagedFile) {
    try {
      const res = await fetch(`/api/admin/filemanager/${file.id}/download`);
      if (!res.ok) throw new Error('Download fehlgeschlagen');
      
      const data = await res.json();
      
      // Download via anchor element
      const link = document.createElement('a');
      link.href = data.url;
      link.download = file.displayName || file.fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Download gestartet", description: file.displayName || file.fileName });
    } catch (error) {
      console.error('Download error:', error);
      toast({ title: "Fehler", description: "Download fehlgeschlagen", variant: "destructive" });
    }
  }

  async function handlePreview(file: ManagedFile) {
    setPreviewFile(file);
    setPreviewLoading(true);
    
    try {
      const res = await fetch(`/api/admin/filemanager/${file.id}/download`);
      if (!res.ok) throw new Error('Vorschau fehlgeschlagen');
      
      const data = await res.json();
      setPreviewUrl(data.url);
    } catch (error) {
      toast({ title: "Fehler", description: "Vorschau konnte nicht geladen werden", variant: "destructive" });
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  // Filter files based on search query
  const filteredFiles = files.filter(file => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      file.fileName.toLowerCase().includes(search) ||
      file.displayName?.toLowerCase().includes(search) ||
      file.description?.toLowerCase().includes(search)
    );
  });

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const userRole = (session?.user as any)?.role;
  if (!session || !["admin", "ADMIN"].includes(userRole)) {
    return null;
  }

  return (
    <main className="min-h-screen py-12 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/admin" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zum Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Downloads & Dateimanager</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Verwalten Sie Dateien für den Download-Bereich</p>
            </div>
            <Button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Datei hochladen
            </Button>
          </div>
        </motion.div>

        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 mb-6 text-sm"
        >
          <button
            onClick={() => handleFolderClick(null)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              !currentFolder 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <Home className="w-4 h-4" /> Alle Ordner
          </button>
          {currentFolder && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <FolderOpen className="w-4 h-4" /> {currentFolder.name}
              </span>
            </>
          )}
        </motion.div>

        {/* Folders Grid (only when not in a folder) */}
        {!currentFolder && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8"
          >
            {folders.sort((a, b) => a.sortOrder - b.sortOrder).map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleFolderClick(folder)}
                className="flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all group"
              >
                <div className="w-16 h-16 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors mb-3">
                  <FolderOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white text-center">{folder.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {files.filter(f => f.folderId === folder.id).length} Dateien
                </span>
              </button>
            ))}
          </motion.div>
        )}

        {/* Search */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Dateien durchsuchen..."
              className="pl-10 bg-white dark:bg-slate-800"
            />
          </div>
        </motion.div>

        {/* Files Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden"
        >
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {currentFolder ? `Dateien in "${currentFolder.name}"` : 'Alle Dateien'} ({filteredFiles.length})
            </h2>
            <Button variant="ghost" size="sm" onClick={() => fetchFiles(currentFolder?.id || null)}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {filteredFiles.length === 0 ? (
            <div className="p-12 text-center">
              <FolderOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'Keine Dateien gefunden' : 'Noch keine Dateien in diesem Ordner'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowUploadModal(true)} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" /> Erste Datei hochladen
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {filteredFiles.map((file) => (
                <div key={file.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      <FileIcon fileName={file.fileName} mimeType={file.mimeType} size={48} />
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {file.displayName || file.fileName}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFileTypeColor(file.fileName, file.mimeType)}`}>
                          {getFileExtension(file.fileName)}
                        </span>
                        <span>{formatFileSize(file.fileSize)}</span>
                        <span>{new Date(file.uploadedAt).toLocaleDateString('de-DE')}</span>
                        {file.folder && !currentFolder && (
                          <span className="flex items-center gap-1">
                            <FolderOpen className="w-3 h-3" /> {file.folder.name}
                          </span>
                        )}
                      </div>
                      {file.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{file.description}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {isPreviewable(file.fileName, file.mimeType) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(file)}
                          className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-900/30"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(file)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/30"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(file)}
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Datei hochladen</h2>
                <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Folder Info */}
                {currentFolder && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-700 dark:text-blue-300 text-sm">
                    <FolderOpen className="w-4 h-4" />
                    <span>Wird hochgeladen in: <strong>{currentFolder.name}</strong></span>
                  </div>
                )}

                {/* File Input */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Datei auswählen *</label>
                  <div className="relative">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setUploadFile(file || null);
                        if (file && !displayName) {
                          setDisplayName(file.name);
                        }
                      }}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                        file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar,.7z"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">PDF, Word, Excel, PowerPoint, Bilder, Archive (max. 50MB)</p>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Anzeigename</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Name für die Anzeige"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Beschreibung</label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optionale Beschreibung"
                  />
                </div>

                {/* Selected File Preview */}
                {uploadFile && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <FileIcon fileName={uploadFile.name} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{uploadFile.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(uploadFile.size)}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1"
                    disabled={uploading}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={handleUpload}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={uploading || !uploadFile}
                  >
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Hochladen...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Hochladen</>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setPreviewFile(null);
              setPreviewUrl(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Preview Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <FileIcon fileName={previewFile.fileName} mimeType={previewFile.mimeType} size={32} />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{previewFile.displayName || previewFile.fileName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(previewFile.fileSize)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleDownload(previewFile)}>
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>
                  <button 
                    onClick={() => {
                      setPreviewFile(null);
                      setPreviewUrl(null);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                {previewLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : previewUrl ? (
                  <>
                    {previewFile.mimeType.includes('image') ? (
                      <img 
                        src={previewUrl} 
                        alt={previewFile.displayName || previewFile.fileName}
                        className="max-w-full h-auto mx-auto rounded-lg"
                      />
                    ) : previewFile.mimeType.includes('pdf') ? (
                      <iframe
                        src={previewUrl}
                        className="w-full rounded-lg border border-gray-200 dark:border-slate-700"
                        style={{ height: 'calc(90vh - 120px)' }}
                        title={previewFile.displayName || previewFile.fileName}
                      />
                    ) : (
                      <div className="text-center py-20">
                        <p className="text-gray-500 dark:text-gray-400">Vorschau nicht verfügbar</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-20">
                    <p className="text-gray-500 dark:text-gray-400">Vorschau nicht verfügbar</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
