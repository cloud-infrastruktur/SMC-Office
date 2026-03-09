"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, Lock, Eye, X, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileIcon, getFileTypeColor, getFileExtension, formatFileSize, isPreviewable } from "@/components/file-icons";
import { useToast } from "@/hooks/use-toast";

interface DownloadFile {
  id: string;
  title: string;
  description: string | null;
  category: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
}

export default function DownloadsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();
  const [files, setFiles] = useState<DownloadFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [noPermissionMessage, setNoPermissionMessage] = useState<string | null>(null);
  
  // Preview Modal State
  const [previewFile, setPreviewFile] = useState<DownloadFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchFiles();
    }
  }, [status, router]);

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/downloads");
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
        // Prüfen ob eine Berechtigungs-Meldung zurückkommt
        if (data.message && data.files?.length === 0) {
          setNoPermissionMessage(data.message);
        } else {
          setNoPermissionMessage(null);
        }
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (file: DownloadFile) => {
    setDownloadingFileId(file.id);
    try {
      const response = await fetch(`/api/downloads/${file.id}`);
      if (response.ok) {
        const data = await response.json();
        
        // Download via anchor element
        const link = document.createElement("a");
        link.href = data.url;
        link.download = data.fileName || file.fileName;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: "Download gestartet", description: file.title });
      } else {
        throw new Error("Download fehlgeschlagen");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({ title: "Fehler", description: "Download fehlgeschlagen", variant: "destructive" });
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handlePreview = async (file: DownloadFile) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    
    try {
      const response = await fetch(`/api/downloads/${file.id}`);
      if (response.ok) {
        const data = await response.json();
        setPreviewUrl(data.url);
      } else {
        throw new Error("Vorschau fehlgeschlagen");
      }
    } catch (error) {
      toast({ title: "Fehler", description: "Vorschau konnte nicht geladen werden", variant: "destructive" });
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const filesByCategory = {
    PROFILE: files.filter((f) => f.category === "PROFILE"),
    REFERENCES: files.filter((f) => f.category === "REFERENCES"),
    TRAININGS: files.filter((f) => f.category === "TRAININGS"),
    CERTIFICATES: files.filter((f) => f.category === "CERTIFICATES"),
  };

  const categoryLabels: Record<string, string> = {
    PROFILE: "Profil",
    REFERENCES: "Referenzen",
    TRAININGS: "Trainings",
    CERTIFICATES: "Zertifikate",
  };

  return (
    <main className="min-h-screen py-20 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent pb-1">
            Download-Bereich
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Zugriff auf Profil, Referenzen, Trainings und Zertifikate
          </p>
        </motion.div>

        {/* Keine Berechtigungen - Warnung anzeigen */}
        {noPermissionMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-8"
          >
            <div className="flex items-start gap-4">
              <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">
                  Keine Berechtigungen
                </h3>
                <p className="text-amber-700 dark:text-amber-400">
                  {noPermissionMessage}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs nur anzeigen wenn Dateien vorhanden */}
        {files.length > 0 ? (
        <Tabs defaultValue="PROFILE" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"
              >
                {label}
                {filesByCategory[key as keyof typeof filesByCategory]?.length > 0 && (
                  <span className="ml-2 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                    {filesByCategory[key as keyof typeof filesByCategory].length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(filesByCategory).map(([category, categoryFiles]) => (
            <TabsContent key={category} value={category}>
              {categoryFiles.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl mt-6 shadow-sm">
                  <FolderOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Keine Dateien in dieser Kategorie verfügbar
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  {categoryFiles.map((file, index) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md hover:shadow-lg transition-all border border-gray-100 dark:border-slate-700"
                    >
                      <div className="flex items-start gap-4">
                        {/* File Icon */}
                        <div className="flex-shrink-0">
                          <FileIcon fileName={file.fileName} mimeType={file.mimeType} size={56} />
                        </div>
                        
                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">
                            {file.title}
                          </h3>
                          
                          {file.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                              {file.description}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
                            <span className={`px-2 py-0.5 rounded-full font-medium ${getFileTypeColor(file.fileName, file.mimeType)}`}>
                              {getFileExtension(file.fileName)}
                            </span>
                            {file.fileSize && (
                              <span>{formatFileSize(file.fileSize)}</span>
                            )}
                            <span>{new Date(file.uploadedAt).toLocaleDateString("de-DE")}</span>
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
                                <Eye className="w-4 h-4 mr-1" /> Vorschau
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleDownload(file)}
                              disabled={downloadingFileId === file.id}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {downloadingFileId === file.id ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 mr-1" />
                              )}
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
        ) : !noPermissionMessage && (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
            <FolderOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Noch keine Dateien verfügbar
            </p>
          </div>
        )}
      </div>

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
                    <h3 className="font-medium text-gray-900 dark:text-white">{previewFile.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {previewFile.fileSize ? formatFileSize(previewFile.fileSize) : previewFile.fileName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDownload(previewFile)}
                    disabled={downloadingFileId === previewFile.id}
                  >
                    {downloadingFileId === previewFile.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download
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
                    {previewFile.mimeType?.includes('image') || 
                     ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(
                       previewFile.fileName.split('.').pop()?.toLowerCase() || ''
                     ) ? (
                      <img 
                        src={previewUrl} 
                        alt={previewFile.title}
                        className="max-w-full h-auto mx-auto rounded-lg"
                      />
                    ) : previewFile.mimeType?.includes('pdf') || 
                         previewFile.fileName.toLowerCase().endsWith('.pdf') ? (
                      <iframe
                        src={previewUrl}
                        className="w-full rounded-lg border border-gray-200 dark:border-slate-700"
                        style={{ height: 'calc(90vh - 120px)' }}
                        title={previewFile.title}
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
